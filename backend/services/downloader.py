"""yt-dlp downloader service - full feature support."""

from __future__ import annotations

import asyncio
import logging
import os
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import WebSocket

import yt_dlp

from api.schemas import (
    CookieStatusResponse,
    DownloadRequest,
    DownloadStatus,
    DownloadTask,
    VideoFormat,
    VideoInfoResponse,
)

logger = logging.getLogger(__name__)

DOWNLOADS_DIR = Path(os.environ.get("DOWNLOADS_DIR", "/app/downloads"))
try:
    DOWNLOADS_DIR.mkdir(parents=True, exist_ok=True)
except OSError:
    DOWNLOADS_DIR = Path("./downloads")
    DOWNLOADS_DIR.mkdir(parents=True, exist_ok=True)

COOKIES_DIR = Path(os.environ.get("COOKIES_DIR", "/app/cookies"))
try:
    COOKIES_DIR.mkdir(parents=True, exist_ok=True)
except OSError:
    COOKIES_DIR = Path("./cookies")
    COOKIES_DIR.mkdir(parents=True, exist_ok=True)

# Platforms that typically require authentication
AUTH_PLATFORMS = {
    "youtube": ["youtube.com", "youtu.be"],
    "youku": ["youku.com"],
    "tencent": ["v.qq.com", "wetv.vip"],
    "iqiyi": ["iqiyi.com"],
    "mango": ["mgtv.com"],
    "bilibili_vip": ["bilibili.com"],
    "douyin": ["douyin.com"],
}


def _normalize_url(url: str) -> str:
    """Normalize URL: add protocol, fix common issues."""
    url = url.strip()
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    if "bilibili.com" in url and "www.bilibili.com" not in url:
        url = url.replace("bilibili.com", "www.bilibili.com")

    # Douyin: convert jingxuan?modal_id=xxx or discover?modal_id=xxx to /video/xxx
    if "douyin.com" in url and "modal_id=" in url:
        import re
        match = re.search(r'modal_id=(\d+)', url)
        if match:
            video_id = match.group(1)
            url = f"https://www.douyin.com/video/{video_id}"

    # Douyin short link: v.douyin.com/xxx
    # (yt-dlp handles these natively, no change needed)

    return url


# === Copyright Compliance Filter ===

BLOCKED_PATTERNS = [
    # Paid video platforms - full episodes
    "iqiyi.com/v_",
    "youku.com/v_show",
    "mgtv.com/b/",
    # International streaming
    "netflix.com",
    "disneyplus.com",
    "hbomax.com",
    "hulu.com",
    "primevideo.com",
    "peacocktv.com",
    "paramountplus.com",
    "crunchyroll.com/watch",
]

BLOCKED_KEYWORDS_IN_TITLE = ["会员专享", "VIP专属", "付费观看", "独播", "会员抢先"]


def _check_copyright_compliance(url: str) -> Optional[str]:
    """Check if URL targets copyrighted content. Returns error message or None."""
    url_lower = url.lower()
    for pattern in BLOCKED_PATTERNS:
        if pattern.lower() in url_lower:
            return (
                "为保护版权，本工具不支持下载该平台的影视剧/付费内容。"
                "本工具仅支持下载用户自有版权或公开授权的内容。"
                "如需备份您的原创作品，请使用对应平台的官方创作者工具导出。"
            )
    return None


def _detect_platform(url: str) -> Optional[str]:
    """Detect which platform a URL belongs to."""
    for platform, domains in AUTH_PLATFORMS.items():
        for domain in domains:
            if domain in url:
                return platform
    return None


class DownloaderService:
    """Service class wrapping yt-dlp full functionality."""

    def __init__(self) -> None:
        self._tasks: dict[str, DownloadTask] = {}
        self._websockets: dict[str, WebSocket] = {}
        self._active_loops: dict[str, asyncio.AbstractEventLoop] = {}
        self._comments: dict[str, list] = {}  # task_id -> comments list
        self._download_semaphore = asyncio.Semaphore(5)  # Max 5 concurrent downloads
        # Rebuild task list from existing files on disk
        self._scan_existing_files()

    def get_downloads_dir(self) -> Path:
        return DOWNLOADS_DIR

    def _scan_existing_files(self) -> None:
        """Scan downloads directory on startup and rebuild task list from filenames."""
        import re
        if not DOWNLOADS_DIR.exists():
            return
        # Pattern: {uuid}_{title}.{ext}
        uuid_pattern = re.compile(r'^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})_(.+)$')
        seen_ids = set()
        for f in sorted(DOWNLOADS_DIR.iterdir()):
            if f.is_dir() or f.name.startswith('_') or f.name.startswith('concat_'):
                continue
            # Skip temp/partial files
            if f.suffix in ('.part', '.ytdl', '.temp'):
                continue
            if '.part-Frag' in f.name:
                continue
            match = uuid_pattern.match(f.stem if f.suffix else f.name)
            if not match:
                # Try matching with extension included
                name_with_ext = f.name
                match = uuid_pattern.match(name_with_ext.rsplit('.', 1)[0] if '.' in name_with_ext else name_with_ext)
            if match:
                task_id = match.group(1)
                title = match.group(2)
                if task_id in seen_ids:
                    continue
                # Only register the main video/audio file (not thumbs, srt, etc)
                if f.suffix.lower() in ('.mp4', '.mkv', '.webm', '.mov', '.avi', '.mp3', '.m4a', '.flac', '.wav', '.opus'):
                    seen_ids.add(task_id)
                    try:
                        file_size = f.stat().st_size
                    except OSError:
                        file_size = 0
                    self._tasks[task_id] = DownloadTask(
                        id=task_id,
                        url="",
                        status=DownloadStatus.COMPLETED,
                        progress=100.0,
                        filename=f.name,
                        title=title,
                        filesize=file_size,
                        created_at=str(f.stat().st_mtime),
                        owner="15814439239",  # Default owner for recovered files
                    )
        logger.info(f"Recovered {len(seen_ids)} tasks from disk")

    # === Cookie Management ===

    def save_cookies(self, platform: str, cookies_text: str) -> None:
        """Save cookies for a platform in Netscape format."""
        if not cookies_text.strip():
            raise ValueError("Cookies 内容不能为空")
        cookie_file = COOKIES_DIR / f"{platform}.txt"
        # Ensure Netscape header
        content = cookies_text.strip()
        if not content.startswith("# Netscape HTTP Cookie File"):
            content = "# Netscape HTTP Cookie File\n# This file is generated by SnapVid\n\n" + content
        cookie_file.write_text(content, encoding="utf-8")

    def get_cookies_status(self) -> list[CookieStatusResponse]:
        """Get status of saved cookies for all platforms."""
        results = []
        for platform in AUTH_PLATFORMS:
            cookie_file = COOKIES_DIR / f"{platform}.txt"
            has_cookies = cookie_file.exists() and cookie_file.stat().st_size > 50
            results.append(CookieStatusResponse(
                platform=platform,
                has_cookies=has_cookies,
                expires_hint="已配置" if has_cookies else "未配置",
            ))
        return results

    def delete_cookies(self, platform: str) -> None:
        """Delete cookies for a platform."""
        cookie_file = COOKIES_DIR / f"{platform}.txt"
        if cookie_file.exists():
            cookie_file.unlink()

    def _get_cookie_file(self, url: str) -> Optional[str]:
        """Get cookie file path if available for this URL's platform."""
        platform = _detect_platform(url)
        if platform:
            cookie_file = COOKIES_DIR / f"{platform}.txt"
            if cookie_file.exists():
                return str(cookie_file)
        return None

    # === Video Info ===

    async def get_video_info(self, url: str, platform_cookie: Optional[str] = None) -> VideoInfoResponse:
        """Extract video information from URL with full yt-dlp features."""
        if not url or not url.strip():
            raise ValueError("URL不能为空")

        url = _normalize_url(url)

        # Copyright compliance check
        block_msg = _check_copyright_compliance(url)
        if block_msg:
            raise ValueError(block_msg)

        url = _normalize_url(url)

        ydl_opts: dict = {
            "quiet": True,
            "no_warnings": True,
            "extract_flat": False,
            "skip_download": True,
            "http_headers": {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
                "Referer": url,
            },
            "extractor_args": {
                "BiliBili": {"lang": ["zh-Hans"]},
                "youtube": {"player_client": ["web"]},
            },
            "socket_timeout": 15,
        }

        # Auto-apply system proxy if set (for YouTube/Twitter etc)
        system_proxy = os.environ.get("HTTP_PROXY") or os.environ.get("HTTPS_PROXY") or os.environ.get("ALL_PROXY")
        if system_proxy and ("youtube.com" in url or "youtu.be" in url or "twitter.com" in url or "x.com" in url):
            ydl_opts["proxy"] = system_proxy

        # Note: impersonate requires curl_cffi with specific version compatibility
        # Currently disabled - rely on cookies + headers instead

        # Apply cookies if available
        cookie_file = self._get_cookie_file(url)
        if cookie_file:
            ydl_opts["cookiefile"] = cookie_file

        loop = asyncio.get_event_loop()
        try:
            info = await loop.run_in_executor(None, self._extract_info, url, ydl_opts)
        except ValueError as e:
            # B站 412 风控：用 B站官方 API bypass
            err_msg = str(e).lower()
            if "bilibili.com" in url and ("412" in err_msg or "precondition" in err_msg or "unable to download" in err_msg):
                logger.warning(f"B站 yt-dlp 412 blocked, trying API bypass for {url}")
                try:
                    bypass_info = await self._bilibili_api_bypass(url)
                    if bypass_info:
                        return bypass_info
                except Exception as be:
                    logger.error(f"B站 API bypass also failed: {be}")
            # If Douyin fails, try fallback parser
            elif "douyin.com" in url:
                fallback_info = await self._try_douyin_fallback(url)
                if fallback_info:
                    return fallback_info
            # If YouTube fails, try fallback
            elif "youtube.com" in url or "youtu.be" in url:
                fallback_info = await self._try_youtube_fallback(url)
                if fallback_info:
                    return fallback_info
                raise ValueError(
                    "YouTube 暂不可用。当前网络环境无法连接 YouTube 服务器，"
                    "建议使用 Bilibili、抖音等国内平台的视频链接。"
                )
            raise

        if info is None:
            # Try platform fallbacks before giving up
            if "douyin.com" in url:
                fallback_info = await self._try_douyin_fallback(url)
                if fallback_info:
                    return fallback_info
            if "youtube.com" in url or "youtu.be" in url:
                fallback_info = await self._try_youtube_fallback(url)
                if fallback_info:
                    return fallback_info
            raise ValueError("无法获取视频信息，请检查URL是否正确")

        # Detect if auth is required
        platform = _detect_platform(url)
        requires_auth = platform is not None and not self._get_cookie_file(url)

        # Parse formats
        formats: list[VideoFormat] = []
        raw_formats = info.get("formats", [])
        for fmt in raw_formats:
            vcodec = fmt.get("vcodec", "none") or "none"
            acodec = fmt.get("acodec", "none") or "none"
            resolution = fmt.get("resolution", "audio only" if vcodec == "none" else "")
            if not resolution:
                width = fmt.get("width", 0) or 0
                height = fmt.get("height", 0) or 0
                if width and height:
                    resolution = f"{width}x{height}"
                else:
                    resolution = "unknown"

            formats.append(VideoFormat(
                format_id=fmt.get("format_id", ""),
                format_note=fmt.get("format_note", ""),
                ext=fmt.get("ext", ""),
                resolution=resolution,
                filesize=fmt.get("filesize") or fmt.get("filesize_approx"),
                vcodec=vcodec,
                acodec=acodec,
                tbr=fmt.get("tbr"),
            ))

        # Parse subtitles
        subtitles: list[str] = list(info.get("subtitles", {}).keys())
        auto_subs = list(info.get("automatic_captions", {}).keys())
        all_subs = list(set(subtitles + auto_subs))

        # Parse chapters
        chapters = info.get("chapters")

        # Duration
        duration = info.get("duration")
        duration_string = ""
        if duration:
            hours = int(duration) // 3600
            minutes = (int(duration) % 3600) // 60
            seconds = int(duration) % 60
            if hours > 0:
                duration_string = f"{hours:02d}:{minutes:02d}:{seconds:02d}"
            else:
                duration_string = f"{minutes:02d}:{seconds:02d}"

        return VideoInfoResponse(
            title=info.get("title", "未知标题"),
            duration=duration,
            duration_string=duration_string,
            thumbnail=info.get("thumbnail", ""),
            uploader=info.get("uploader", info.get("channel", "未知")),
            platform=info.get("extractor_key", info.get("extractor", "未知平台")),
            description=info.get("description", "") or "",
            formats=formats,
            subtitles=all_subs,
            chapters=chapters,
            comment_count=info.get("comment_count"),
            requires_auth=requires_auth,
        )

    def _extract_info(self, url: str, ydl_opts: dict) -> Optional[dict]:
        """Extract info using yt-dlp (synchronous)."""
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                return ydl.extract_info(url, download=False)
        except yt_dlp.utils.DownloadError as e:
            err_msg = str(e)
            if "Sign in to confirm" in err_msg or "bot" in err_msg:
                raise ValueError(
                    "该平台要求验证身份，正在尝试备用通道..."
                )
            elif "Fresh cookies" in err_msg or "cookies" in err_msg.lower():
                raise ValueError(
                    "该平台需要额外验证，正在尝试备用通道..."
                )
            elif "Video unavailable" in err_msg:
                raise ValueError("视频不可用：可能是地区限制、需要会员或视频已被删除")
            elif "HTTP Error 403" in err_msg:
                raise ValueError("访问被拒绝，正在尝试备用通道...")
            elif "Unsupported URL" in err_msg:
                raise ValueError("不支持的链接格式，请复制视频的完整分享链接")
            raise ValueError(f"视频解析失败: {err_msg}")
        except Exception as e:
            raise ValueError(f"视频解析出错: {str(e)}")

    # === Download ===

    async def start_download(self, request: DownloadRequest, owner: str = "anonymous") -> str:
        """Start a download task with full feature support."""
        if not request.url or not request.url.strip():
            raise ValueError("URL不能为空")

        request.url = _normalize_url(request.url)

        task_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()

        task = DownloadTask(
            id=task_id,
            url=request.url,
            title="获取中...",
            owner=owner,
            status=DownloadStatus.PENDING,
            progress=0.0,
            speed="",
            eta="",
            filename="",
            filesize=None,
            error="",
            created_at=now,
        )
        self._tasks[task_id] = task
        asyncio.create_task(self._run_download(task_id, request))
        return task_id

    async def _run_download(self, task_id: str, request: DownloadRequest) -> None:
        """Run the download task with concurrency control."""
        async with self._download_semaphore:
            await self._run_download_inner(task_id, request)

    async def _run_download_inner(self, task_id: str, request: DownloadRequest) -> None:
        """Run the download task with all yt-dlp features."""
        task = self._tasks.get(task_id)
        if task is None:
            return

        task.status = DownloadStatus.DOWNLOADING
        loop = asyncio.get_event_loop()
        self._active_loops[task_id] = loop

        # Send initial status so frontend knows the task is active
        await self._send_progress(task_id, {
            "progress": 0.0,
            "speed": "",
            "eta": "解析中...",
            "status": "downloading",
        })

        # Build yt-dlp options
        output_template = str(DOWNLOADS_DIR / f"{task_id}_%(title)s.%(ext)s")
        ydl_opts: dict = {
            "outtmpl": output_template,
            "quiet": True,
            "no_warnings": True,
            "socket_timeout": 30,
            "progress_hooks": [lambda d: self._sync_progress_hook(task_id, d)],
            "http_headers": {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
                "Referer": request.url,
            },
        }

        # Apply cookies
        cookie_file = self._get_cookie_file(request.url)
        if cookie_file:
            ydl_opts["cookiefile"] = cookie_file

        # Format selection
        if request.audio_only:
            ydl_opts["format"] = "bestaudio/best"
            ydl_opts["postprocessors"] = [{
                "key": "FFmpegExtractAudio",
                "preferredcodec": request.audio_format,
                "preferredquality": request.audio_quality,
            }]
        elif request.format_id and request.format_id != "best":
            ydl_opts["format"] = f"{request.format_id}+bestaudio/best"
        else:
            ydl_opts["format"] = "bestvideo+bestaudio/best"

        # Output container
        if not request.audio_only and request.output_format:
            ydl_opts["merge_output_format"] = request.output_format

        # Subtitles
        if request.subtitles:
            ydl_opts["writesubtitles"] = True
            ydl_opts["subtitleslangs"] = [request.subtitles]
            if request.embed_subtitles:
                ydl_opts.setdefault("postprocessors", []).append({
                    "key": "FFmpegEmbedSubtitle",
                })

        # Playlist
        if not request.playlist:
            ydl_opts["noplaylist"] = True
        elif request.playlist_range:
            ydl_opts["playlist_items"] = request.playlist_range

        # Rate limit
        if request.rate_limit and request.rate_limit > 0:
            ydl_opts["ratelimit"] = int(request.rate_limit * 1024 * 1024)

        # Embed thumbnail
        if request.embed_thumbnail:
            ydl_opts["writethumbnail"] = True
            ydl_opts.setdefault("postprocessors", []).append({
                "key": "EmbedThumbnail",
            })

        # Embed metadata
        if request.embed_metadata:
            ydl_opts.setdefault("postprocessors", []).append({
                "key": "FFmpegMetadata",
            })

        # Split by chapters
        if request.split_chapters:
            ydl_opts.setdefault("postprocessors", []).append({
                "key": "FFmpegSplitChapters",
            })

        # SponsorBlock (YouTube)
        if request.sponsor_block:
            ydl_opts.setdefault("postprocessors", []).append({
                "key": "SponsorBlock",
            })
            ydl_opts.setdefault("postprocessors", []).append({
                "key": "ModifyChapters",
                "remove_sponsor_segments": ["sponsor", "selfpromo", "interaction"],
            })

        # Proxy
        if request.proxy:
            ydl_opts["proxy"] = request.proxy

        # === New features ===

        # Multi-thread concurrent fragments (Pro feature)
        if request.concurrent_fragments and request.concurrent_fragments > 1:
            ydl_opts["concurrent_fragment_downloads"] = min(request.concurrent_fragments, 16)

        # Download specific time section
        if request.download_sections:
            ydl_opts["download_ranges"] = lambda info, ydl: [
                {"start_time": self._parse_time(request.download_sections.split("-")[0]),
                 "end_time": self._parse_time(request.download_sections.split("-")[1])}
            ] if "-" in request.download_sections else []
            # Use simpler approach via postprocessor
            ydl_opts["postprocessor_args"] = {"ffmpeg": []}
            # Actually use download_sections format
            ydl_opts.pop("download_ranges", None)
            ydl_opts["download_ranges"] = None
            # yt-dlp native section support
            if "-" in request.download_sections:
                parts = request.download_sections.split("-")
                ydl_opts["postprocessor_args"] = {
                    "ffmpeg": ["-ss", parts[0].strip(), "-to", parts[1].strip()]
                }
                ydl_opts["force_keyframes_at_cuts"] = True

        # Custom filename template
        if request.output_template:
            safe_template = request.output_template.replace("/", "_").replace("\\", "_")
            output_template = str(DOWNLOADS_DIR / f"{task_id}_{safe_template}.%(ext)s")
            ydl_opts["outtmpl"] = output_template

        # Thumbnail only download
        if request.thumbnail_only:
            ydl_opts["skip_download"] = True
            ydl_opts["writethumbnail"] = True
            ydl_opts["postprocessors"] = [{
                "key": "FFmpegThumbnailsConvertor",
                "format": "png",
            }]

        # Remux (format conversion without re-encoding)
        if request.remux_format and not request.audio_only:
            ydl_opts.setdefault("postprocessors", []).append({
                "key": "FFmpegVideoRemuxer",
                "preferedformat": request.remux_format,
            })

        # === Roadmap Features ===

        # Export comments
        if request.write_comments:
            ydl_opts["getcomments"] = True

        # Download archive (skip already downloaded)
        if request.use_archive:
            archive_path = DOWNLOADS_DIR / "download_archive.txt"
            archive_path.parent.mkdir(parents=True, exist_ok=True)
            ydl_opts["download_archive"] = str(archive_path)

        # Safe mode (anti-ban sleep)
        if request.safe_mode:
            ydl_opts["sleep_interval"] = 2
            ydl_opts["max_sleep_interval"] = 5
            ydl_opts["sleep_interval_requests"] = 1

        # Playlist random order
        if request.playlist_random:
            ydl_opts["playlist_random"] = True

        # Duration filter (using match_filter_func)
        match_filters = []
        if request.filter_duration_min is not None:
            match_filters.append(f"duration >= {request.filter_duration_min}")
        if request.filter_duration_max is not None:
            match_filters.append(f"duration <= {request.filter_duration_max}")
        if match_filters:
            filter_str = " & ".join(match_filters)
            ydl_opts["match_filter"] = yt_dlp.utils.match_filter_func(filter_str)

        # File size filter
        if request.max_filesize:
            ydl_opts["max_filesize"] = self._parse_filesize(request.max_filesize)
        if request.min_filesize:
            ydl_opts["min_filesize"] = self._parse_filesize(request.min_filesize)

        # Date range filter
        if request.date_after:
            ydl_opts["dateafter"] = request.date_after
        if request.date_before:
            ydl_opts["datebefore"] = request.date_before

        # Format sort (quality preference)
        if request.format_sort:
            ydl_opts["format_sort"] = request.format_sort.split(",")

        # Geo bypass
        if request.geo_bypass_country:
            ydl_opts["geo_bypass"] = True
            ydl_opts["geo_bypass_country"] = request.geo_bypass_country

        # Subtitle format conversion
        if request.convert_subs_format:
            ydl_opts.setdefault("postprocessors", []).append({
                "key": "FFmpegSubtitlesConvertor",
                "format": request.convert_subs_format,
            })

        # Thumbnail format conversion
        if request.convert_thumbnail_format:
            ydl_opts["writethumbnail"] = True
            ydl_opts.setdefault("postprocessors", []).append({
                "key": "FFmpegThumbnailsConvertor",
                "format": request.convert_thumbnail_format,
            })

        try:
            downloaded_file = await loop.run_in_executor(
                None, self._do_download, request.url, ydl_opts, task_id
            )
            task.status = DownloadStatus.COMPLETED
            task.progress = 100.0
            if downloaded_file:
                task.filename = Path(downloaded_file).name
                try:
                    task.filesize = Path(downloaded_file).stat().st_size
                except OSError:
                    pass
            await self._send_progress(task_id, {
                "progress": 100.0,
                "speed": "",
                "eta": "00:00",
                "status": "completed",
            })
        except Exception as e:
            # Try Douyin fallback download if yt-dlp fails
            if "douyin.com" in request.url:
                try:
                    fallback_file = await loop.run_in_executor(
                        None, self._douyin_fallback_download, request.url, task_id
                    )
                    if fallback_file:
                        task.status = DownloadStatus.COMPLETED
                        task.progress = 100.0
                        task.filename = Path(fallback_file).name
                        try:
                            task.filesize = Path(fallback_file).stat().st_size
                        except OSError:
                            pass
                        await self._send_progress(task_id, {
                            "progress": 100.0, "speed": "", "eta": "00:00", "status": "completed",
                        })
                        return
                except Exception as fe:
                    logger.error(f"Douyin fallback download also failed: {fe}")

            # Try YouTube fallback download
            if "youtube.com" in request.url or "youtu.be" in request.url:
                try:
                    fallback_file = await loop.run_in_executor(
                        None, self._youtube_fallback_download, request.url, task_id
                    )
                    if fallback_file:
                        task.status = DownloadStatus.COMPLETED
                        task.progress = 100.0
                        task.filename = Path(fallback_file).name
                        try:
                            task.filesize = Path(fallback_file).stat().st_size
                        except OSError:
                            pass
                        await self._send_progress(task_id, {
                            "progress": 100.0, "speed": "", "eta": "00:00", "status": "completed",
                        })
                        return
                except Exception as fe:
                    logger.error(f"YouTube fallback download also failed: {fe}")

            logger.error(f"Download failed for task {task_id}: {e}")
            task.status = DownloadStatus.FAILED
            # Clean error message for user display
            raw_err = str(e)
            if "Sign in" in raw_err or "bot" in raw_err or "cookies" in raw_err.lower():
                task.error = "该平台当前网络无法访问，请配置代理后重试"
            elif "Video unavailable" in raw_err:
                task.error = "视频不可用，可能已被删除"
            else:
                # Strip yt-dlp internal prefixes
                clean = raw_err.replace("下载失败: ", "").replace("下载出错: ", "")
                import re as _re
                clean = _re.sub(r'ERROR:\s*\[\w+\]\s*[\w-]+:\s*', '', clean)
                clean = _re.sub(r'See\s+https://github\.com/.*$', '', clean)
                clean = _re.sub(r'Use\s+--cookies.*$', '', clean)
                task.error = clean.strip()[:150] or "下载失败，请稍后重试"
            await self._send_progress(task_id, {
                "progress": task.progress,
                "speed": "",
                "eta": "",
                "status": "failed",
                "error": task.error,
            })
        finally:
            self._active_loops.pop(task_id, None)

    def _do_download(self, url: str, ydl_opts: dict, task_id: str) -> Optional[str]:
        """Execute the actual download."""
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                # First extract info to get title early
                info = ydl.extract_info(url, download=False)
                if info:
                    task = self._tasks.get(task_id)
                    if task:
                        task.title = info.get("title", "未知标题")

                # Now do the actual download
                info = ydl.extract_info(url, download=True)
                if info:
                    task = self._tasks.get(task_id)
                    if task:
                        task.title = info.get("title", task.title)

                    # Save comments if extracted
                    comments = info.get("comments", [])
                    if comments:
                        self._comments[task_id] = comments

                    filename = ydl.prepare_filename(info)
                    # Handle audio postprocessing extension change
                    if ydl_opts.get("postprocessors"):
                        for pp in ydl_opts["postprocessors"]:
                            if pp.get("key") == "FFmpegExtractAudio":
                                codec = pp.get("preferredcodec", "mp3")
                                base = Path(filename).stem
                                audio_path = Path(filename).parent / f"{base}.{codec}"
                                if audio_path.exists():
                                    return str(audio_path)
                    if Path(filename).exists():
                        return filename
                    # Try common extensions
                    base = Path(filename).with_suffix("")
                    for ext in [".mp4", ".webm", ".mkv", ".mp3", ".m4a", ".flac", ".wav", ".opus", ".avi", ".mov", ".jpg", ".png"]:
                        candidate = Path(str(base) + ext)
                        if candidate.exists():
                            return str(candidate)

                # Fallback: scan download dir for any file starting with task_id
                for f in DOWNLOADS_DIR.iterdir():
                    if f.name.startswith(task_id) and f.is_file():
                        return str(f)

                return None
        except yt_dlp.utils.DownloadError as e:
            raise RuntimeError(f"下载失败: {str(e)}")
        except Exception as e:
            raise RuntimeError(f"下载出错: {str(e)}")

    def _sync_progress_hook(self, task_id: str, data: dict) -> None:
        """Synchronous progress hook called by yt-dlp."""
        task = self._tasks.get(task_id)
        if task is None:
            return

        status = data.get("status", "")
        if status == "downloading":
            total = data.get("total_bytes") or data.get("total_bytes_estimate") or 0
            downloaded = data.get("downloaded_bytes", 0)
            if total > 0:
                task.progress = round((downloaded / total) * 100, 1)

            speed = data.get("speed")
            if speed and speed > 0:
                if speed > 1024 * 1024:
                    task.speed = f"{speed / (1024 * 1024):.1f}MB/s"
                elif speed > 1024:
                    task.speed = f"{speed / 1024:.1f}KB/s"
                else:
                    task.speed = f"{speed:.0f}B/s"
            else:
                task.speed = ""

            eta = data.get("eta")
            if eta and eta > 0:
                minutes = int(eta) // 60
                seconds = int(eta) % 60
                task.eta = f"{minutes:02d}:{seconds:02d}"
            else:
                task.eta = ""

            loop = self._active_loops.get(task_id)
            if loop and self._websockets.get(task_id):
                asyncio.run_coroutine_threadsafe(
                    self._send_progress(task_id, {
                        "progress": task.progress,
                        "speed": task.speed,
                        "eta": task.eta,
                        "status": "downloading",
                    }),
                    loop,
                )

        elif status == "finished":
            task.progress = 99.0
            task.speed = ""
            task.eta = "处理中..."

    async def _send_progress(self, task_id: str, data: dict) -> None:
        """Send progress data via WebSocket."""
        ws = self._websockets.get(task_id)
        if ws:
            try:
                await ws.send_json(data)
            except Exception:
                self._websockets.pop(task_id, None)

    async def subscribe_progress(self, websocket: WebSocket, task_id: str) -> None:
        """Subscribe to progress updates via WebSocket."""
        self._websockets[task_id] = websocket

        task = self._tasks.get(task_id)
        if task:
            await websocket.send_json({
                "progress": task.progress,
                "speed": task.speed,
                "eta": task.eta,
                "status": task.status.value,
            })

        try:
            while True:
                # Keep alive: longer timeout, loop until task finishes
                try:
                    await asyncio.wait_for(websocket.receive_text(), timeout=60.0)
                except asyncio.TimeoutError:
                    # Check if task is done
                    task = self._tasks.get(task_id)
                    if task and task.status in (DownloadStatus.COMPLETED, DownloadStatus.FAILED):
                        # Send final status before closing
                        await websocket.send_json({
                            "progress": task.progress,
                            "speed": "",
                            "eta": "",
                            "status": task.status.value,
                        })
                        return
                    # Otherwise keep connection alive by sending current progress
                    if task:
                        await websocket.send_json({
                            "progress": task.progress,
                            "speed": task.speed,
                            "eta": task.eta,
                            "status": task.status.value,
                        })
        except Exception:
            pass

    def unsubscribe_progress(self, task_id: str) -> None:
        self._websockets.pop(task_id, None)

    @staticmethod
    def _parse_time(time_str: str) -> float:
        """Parse time string like '01:30' or '1:02:30' to seconds."""
        time_str = time_str.strip()
        parts = time_str.split(":")
        if len(parts) == 3:
            return int(parts[0]) * 3600 + int(parts[1]) * 60 + float(parts[2])
        elif len(parts) == 2:
            return int(parts[0]) * 60 + float(parts[1])
        return float(time_str)

    @staticmethod
    def _parse_filesize(size_str: str) -> int:
        """Parse file size string like '500M' or '1G' to bytes."""
        size_str = size_str.strip().upper()
        multipliers = {"K": 1024, "M": 1024**2, "G": 1024**3, "T": 1024**4}
        for suffix, mult in multipliers.items():
            if size_str.endswith(suffix):
                return int(float(size_str[:-1]) * mult)
        # Try plain number (bytes)
        try:
            return int(size_str)
        except ValueError:
            return 0

    def get_all_tasks(self) -> list[DownloadTask]:
        tasks = list(self._tasks.values())
        tasks.sort(key=lambda t: t.created_at, reverse=True)
        return tasks

    def get_tasks_by_owner(self, owner: str) -> list[DownloadTask]:
        """Get tasks filtered by owner. Anonymous sees all anonymous tasks."""
        tasks = [t for t in self._tasks.values() if t.owner == owner]
        tasks.sort(key=lambda t: t.created_at, reverse=True)
        return tasks

    def get_active_tasks(self, owner: str) -> list[DownloadTask]:
        """Get active (downloading/pending) tasks for an owner."""
        tasks = [
            t for t in self._tasks.values()
            if t.owner == owner and t.status in (DownloadStatus.DOWNLOADING, DownloadStatus.PENDING)
        ]
        tasks.sort(key=lambda t: t.created_at, reverse=True)
        return tasks

    def cancel_task(self, task_id: str) -> bool:
        """Cancel a running download task."""
        task = self._tasks.get(task_id)
        if not task:
            return False
        if task.status in (DownloadStatus.COMPLETED, DownloadStatus.FAILED):
            return False
        task.status = DownloadStatus.FAILED
        task.error = "已取消"
        return True

    def get_comments(self, task_id: str) -> list:
        """Get exported comments for a task."""
        return self._comments.get(task_id, [])

    async def _bilibili_api_bypass(self, url: str) -> Optional[VideoInfoResponse]:
        """Bypass B站 anti-bot 412 by using direct API calls."""
        import urllib.request, json

        bvid = None
        m = re.search(r'/video/(?:BV|av|AV)([A-Za-z0-9]+)', url)
        if m:
            bvid = f"BV{m.group(1)}" if not m.group(0).startswith('/video/av') else m.group(1)
        else:
            m = re.search(r'(BV[A-Za-z0-9]+)', url)
            if m:
                bvid = m.group(1)

        if not bvid:
            logger.warning("B站 bypass: cannot extract BVID from URL")
            return None

        api_url = f"https://api.bilibili.com/x/web-interface/view?bvid={bvid}"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0",
            "Referer": "https://www.bilibili.com/",
            "Accept": "application/json, text/plain, */*",
        }
        req = urllib.request.Request(api_url, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=10) as resp:
                raw = json.loads(resp.read().decode("utf-8"))
        except Exception as e:
            logger.error(f"B站 API bypass failed: {e}")
            return None

        if raw.get("code") != 0:
            logger.warning(f"B站 API returned error code {raw.get('code')}: {raw.get('message','')}")
            return None

        data = raw["data"]
        title = data.get("title", "未知标题")
        duration = data.get("duration", 0)
        mins, secs = int(duration) // 60, int(duration) % 60
        owner = data.get("owner", {})
        uploader = owner.get("name", "未知")
        pic = data.get("pic", "")
        desc = data.get("desc", "") or ""

        # Parse formats from API response
        pages = data.get("pages", [])
        formats = []
        for p in pages:
            dim = p.get("dimension", {})
            width = dim.get("width", 0) or 0
            height = dim.get("height", 0) or 0
            res = f"{width}x{height}" if width else "unknown"
            formats.append(VideoFormat(
                format_id=str(p.get("cid", "")),
                format_note=p.get("part", ""),
                ext="mp4",
                resolution=res,
            ))

        if not formats:
            formats.append(VideoFormat(format_id="best", format_note="", ext="mp4", resolution="原始画质"))

        return VideoInfoResponse(
            title=title,
            duration=duration,
            duration_string=f"{mins:02d}:{secs:02d}",
            thumbnail=pic,
            uploader=uploader,
            platform="BiliBili",
            description=desc,
            formats=formats,
            subtitles=[],
            chapters=None,
            comment_count=None,
            requires_auth=False,
        )

    async def _try_douyin_fallback(self, url: str) -> Optional[VideoInfoResponse]:
        """Try extracting Douyin video info using custom fallback parser."""
        try:
            from services.douyin_fallback import extract_douyin_info

            # Extract video ID from URL
            video_id = None
            id_match = re.search(r'/video/(\d+)', url)
            if id_match:
                video_id = id_match.group(1)
            else:
                modal_match = re.search(r'modal_id=(\d+)', url)
                if modal_match:
                    video_id = modal_match.group(1)

            if not video_id:
                return None

            loop = asyncio.get_event_loop()
            info = await loop.run_in_executor(None, extract_douyin_info, video_id)

            if not info:
                return None

            # Convert to VideoInfoResponse
            duration = info.get("duration", 0)
            mins = int(duration) // 60
            secs = int(duration) % 60
            duration_string = f"{mins:02d}:{secs:02d}"

            return VideoInfoResponse(
                title=info.get("title", "抖音视频"),
                duration=duration,
                duration_string=duration_string,
                thumbnail=info.get("thumbnail", ""),
                uploader=info.get("author", ""),
                platform="Douyin",
                description=info.get("title", ""),
                formats=[VideoFormat(
                    format_id="best",
                    format_note="视频 (无水印)",
                    ext="mp4",
                    resolution="原始画质",
                )],
                subtitles=[],
                chapters=None,
                comment_count=None,
                requires_auth=False,
            )
        except Exception as e:
            logger.error(f"Douyin fallback failed: {e}")
            return None

    def _douyin_fallback_download(self, url: str, task_id: str) -> Optional[str]:
        """Download Douyin video using fallback method (direct URL download)."""
        import requests as req
        from services.douyin_fallback import extract_douyin_info

        # Extract video ID
        video_id = None
        id_match = re.search(r'/video/(\d+)', url)
        if id_match:
            video_id = id_match.group(1)
        else:
            modal_match = re.search(r'modal_id=(\d+)', url)
            if modal_match:
                video_id = modal_match.group(1)

        if not video_id:
            raise RuntimeError("无法提取抖音视频ID")

        info = extract_douyin_info(video_id)
        if not info or not info.get("video_url"):
            raise RuntimeError("无法获取抖音视频下载地址")

        video_url = info["video_url"]
        title = info.get("title", "douyin_video")[:50].replace("/", "_").replace("\\", "_")

        # Download the video
        headers = {
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15",
            "Referer": "https://www.douyin.com/",
        }

        resp = req.get(video_url, headers=headers, stream=True, timeout=60)
        if resp.status_code != 200:
            raise RuntimeError(f"视频下载失败: HTTP {resp.status_code}")

        output_path = DOWNLOADS_DIR / f"{task_id}_{title}.mp4"
        total = int(resp.headers.get("content-length", 0))
        downloaded = 0

        task = self._tasks.get(task_id)

        with open(output_path, "wb") as f:
            for chunk in resp.iter_content(chunk_size=1024 * 1024):  # 1MB chunks
                f.write(chunk)
                downloaded += len(chunk)
                if task and total > 0:
                    task.progress = (downloaded / total) * 100
                    task.speed = f"{downloaded / (1024*1024):.1f}MB / {total / (1024*1024):.1f}MB"

        if task:
            task.title = title

        return str(output_path)

    async def _try_youtube_fallback(self, url: str) -> Optional[VideoInfoResponse]:
        """Try getting YouTube video info via Invidious/Cobalt when yt-dlp fails."""
        try:
            from services.youtube_fallback import get_youtube_info_fallback, extract_youtube_video_id

            loop = asyncio.get_event_loop()
            info = await loop.run_in_executor(None, get_youtube_info_fallback, url)

            if not info:
                return None

            duration = info.get("duration", 0)
            hours = int(duration) // 3600
            minutes = (int(duration) % 3600) // 60
            seconds = int(duration) % 60
            if hours > 0:
                duration_string = f"{hours:02d}:{minutes:02d}:{seconds:02d}"
            else:
                duration_string = f"{minutes:02d}:{seconds:02d}"

            return VideoInfoResponse(
                title=info.get("title", "YouTube Video"),
                duration=float(duration),
                duration_string=duration_string,
                thumbnail=info.get("thumbnail", ""),
                uploader=info.get("author", ""),
                platform="YouTube",
                description=info.get("description", ""),
                formats=[VideoFormat(
                    format_id="best",
                    format_note="最佳画质 (via fallback)",
                    ext="mp4",
                    resolution="up to 1080p",
                )],
                subtitles=[],
                chapters=None,
                comment_count=None,
                requires_auth=False,
            )
        except Exception as e:
            logger.error(f"YouTube fallback info failed: {e}")
            return None

    def _youtube_fallback_download(self, url: str, task_id: str) -> Optional[str]:
        """Download YouTube video using Cobalt/Invidious fallback."""
        from services.youtube_fallback import download_youtube_video

        task = self._tasks.get(task_id)

        def progress_cb(downloaded, total):
            if task:
                task.progress = (downloaded / total) * 100
                task.speed = f"{downloaded / (1024*1024):.1f}MB / {total / (1024*1024):.1f}MB"

        result = download_youtube_video(url, str(DOWNLOADS_DIR), progress_cb)

        if result:
            # Rename with task_id prefix for consistency
            from pathlib import Path
            old_path = Path(result)
            new_name = f"{task_id}_{old_path.name}"
            new_path = old_path.parent / new_name
            old_path.rename(new_path)
            if task:
                task.title = old_path.stem
            return str(new_path)

        raise RuntimeError("YouTube fallback download failed: no available source")

    def get_task(self, task_id: str) -> Optional[DownloadTask]:
        return self._tasks.get(task_id)

    def register_file_as_task(self, filename: str, title: str = "", owner: str = "anonymous") -> str:
        """Register a processed/output file as a new task so it appears in file selectors."""
        import uuid
        task_id = str(uuid.uuid4())
        file_path = DOWNLOADS_DIR / filename
        if not file_path.exists():
            return ""
        self._tasks[task_id] = DownloadTask(
            id=task_id,
            url="",
            status=DownloadStatus.COMPLETED,
            progress=100.0,
            filename=filename,
            title=title or filename,
            filesize=file_path.stat().st_size,
            created_at=str(file_path.stat().st_mtime),
            owner=owner,
        )
        return task_id

    def delete_task(self, task_id: str) -> bool:
        task = self._tasks.get(task_id)
        if task is None:
            return False
        if task.filename:
            file_path = DOWNLOADS_DIR / task.filename
            if file_path.exists():
                try:
                    file_path.unlink()
                except OSError as e:
                    logger.warning(f"Failed to delete file {file_path}: {e}")
        del self._tasks[task_id]
        return True
