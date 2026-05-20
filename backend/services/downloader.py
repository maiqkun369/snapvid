"""yt-dlp downloader service encapsulation."""

from __future__ import annotations

import asyncio
import logging
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import WebSocket

import yt_dlp

from api.schemas import (
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
    # Fallback to local directory when not running in Docker
    DOWNLOADS_DIR = Path("./downloads")
    DOWNLOADS_DIR.mkdir(parents=True, exist_ok=True)


class DownloaderService:
    """Service class wrapping yt-dlp functionality."""

    def __init__(self) -> None:
        """Initialize downloader service."""
        self._tasks: dict[str, DownloadTask] = {}
        self._websockets: dict[str, WebSocket] = {}
        self._active_loops: dict[str, asyncio.AbstractEventLoop] = {}

    def get_downloads_dir(self) -> Path:
        """Get the downloads directory path.

        Returns:
            Path to downloads directory.
        """
        return DOWNLOADS_DIR

    async def get_video_info(self, url: str) -> VideoInfoResponse:
        """Extract video information from URL.

        Args:
            url: The video URL to extract info from.

        Returns:
            VideoInfoResponse with video metadata.

        Raises:
            ValueError: If URL is invalid or empty.
        """
        if not url or not url.strip():
            raise ValueError("URL不能为空")

        url = url.strip()
        # Auto-prepend https:// if missing
        if not url.startswith(("http://", "https://")):
            url = "https://" + url
        # Ensure www. for bilibili
        if "bilibili.com" in url and "www.bilibili.com" not in url:
            url = url.replace("bilibili.com", "www.bilibili.com")

        ydl_opts: dict = {
            "quiet": True,
            "no_warnings": True,
            "extract_flat": False,
            "skip_download": True,
            "http_headers": {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
                "Referer": url,
            },
            "extractor_args": {"BiliBili": {"lang": ["zh-Hans"]}},
            "cookiefile": None,
        }

        loop = asyncio.get_event_loop()
        info = await loop.run_in_executor(None, self._extract_info, url, ydl_opts)

        if info is None:
            raise ValueError("无法获取视频信息，请检查URL是否正确")

        # Parse formats
        formats: list[VideoFormat] = []
        raw_formats = info.get("formats", [])
        for fmt in raw_formats:
            vcodec = fmt.get("vcodec", "none") or "none"
            acodec = fmt.get("acodec", "none") or "none"
            # Skip formats without both audio and video info
            resolution = fmt.get("resolution", "audio only" if vcodec == "none" else "")
            if not resolution:
                width = fmt.get("width", 0) or 0
                height = fmt.get("height", 0) or 0
                if width and height:
                    resolution = f"{width}x{height}"
                else:
                    resolution = "unknown"

            formats.append(
                VideoFormat(
                    format_id=fmt.get("format_id", ""),
                    format_note=fmt.get("format_note", ""),
                    ext=fmt.get("ext", ""),
                    resolution=resolution,
                    filesize=fmt.get("filesize") or fmt.get("filesize_approx"),
                    vcodec=vcodec,
                    acodec=acodec,
                    tbr=fmt.get("tbr"),
                )
            )

        # Parse subtitles
        subtitles: list[str] = list(info.get("subtitles", {}).keys())
        auto_subs = list(info.get("automatic_captions", {}).keys())
        all_subs = list(set(subtitles + auto_subs))

        # Duration string
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
            formats=formats,
            subtitles=all_subs,
        )

    def _extract_info(self, url: str, ydl_opts: dict) -> Optional[dict]:
        """Extract info using yt-dlp (synchronous).

        Args:
            url: Video URL.
            ydl_opts: yt-dlp options.

        Returns:
            Extracted info dict or None.
        """
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                return ydl.extract_info(url, download=False)
        except yt_dlp.utils.DownloadError as e:
            raise ValueError(f"视频解析失败: {str(e)}")
        except Exception as e:
            raise ValueError(f"视频解析出错: {str(e)}")

    async def start_download(self, request: DownloadRequest) -> str:
        """Start a download task.

        Args:
            request: Download request parameters.

        Returns:
            Task UUID string.

        Raises:
            ValueError: If URL is invalid.
        """
        if not request.url or not request.url.strip():
            raise ValueError("URL不能为空")

        # Auto-fix URL
        request.url = request.url.strip()
        if not request.url.startswith(("http://", "https://")):
            request.url = "https://" + request.url
        if "bilibili.com" in request.url and "www.bilibili.com" not in request.url:
            request.url = request.url.replace("bilibili.com", "www.bilibili.com")

        task_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()

        task = DownloadTask(
            id=task_id,
            url=request.url,
            title="获取中...",
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

        # Start download in background
        asyncio.create_task(self._run_download(task_id, request))

        return task_id

    async def _run_download(self, task_id: str, request: DownloadRequest) -> None:
        """Run the download task in background.

        Args:
            task_id: Task UUID.
            request: Download parameters.
        """
        task = self._tasks.get(task_id)
        if task is None:
            return

        task.status = DownloadStatus.DOWNLOADING
        loop = asyncio.get_event_loop()
        self._active_loops[task_id] = loop

        # Build yt-dlp options
        output_template = str(DOWNLOADS_DIR / f"{task_id}_%(title)s.%(ext)s")
        ydl_opts: dict = {
            "outtmpl": output_template,
            "quiet": True,
            "no_warnings": True,
            "progress_hooks": [lambda d: self._sync_progress_hook(task_id, d)],
            "http_headers": {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
                "Referer": request.url,
            },
        }

        # Format selection
        if request.audio_only:
            ydl_opts["format"] = "bestaudio/best"
            ydl_opts["postprocessors"] = [
                {
                    "key": "FFmpegExtractAudio",
                    "preferredcodec": "mp3",
                    "preferredquality": "192",
                }
            ]
        elif request.format_id and request.format_id != "best":
            ydl_opts["format"] = f"{request.format_id}+bestaudio/best"
        else:
            ydl_opts["format"] = "bestvideo+bestaudio/best"

        # Subtitles
        if request.subtitles:
            ydl_opts["writesubtitles"] = True
            ydl_opts["subtitleslangs"] = [request.subtitles]

        # Playlist
        if not request.playlist:
            ydl_opts["noplaylist"] = True

        # Rate limit
        if request.rate_limit and request.rate_limit > 0:
            ydl_opts["ratelimit"] = int(request.rate_limit * 1024 * 1024)

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
            # Send final progress
            await self._send_progress(task_id, {
                "progress": 100.0,
                "speed": "",
                "eta": "00:00",
                "status": "completed",
            })
        except Exception as e:
            logger.error(f"Download failed for task {task_id}: {e}")
            task.status = DownloadStatus.FAILED
            task.error = str(e)
            await self._send_progress(task_id, {
                "progress": task.progress,
                "speed": "",
                "eta": "",
                "status": "failed",
                "error": str(e),
            })
        finally:
            self._active_loops.pop(task_id, None)

    def _do_download(self, url: str, ydl_opts: dict, task_id: str) -> Optional[str]:
        """Execute the actual download (synchronous).

        Args:
            url: Video URL.
            ydl_opts: yt-dlp options.
            task_id: Task UUID for progress tracking.

        Returns:
            Path to downloaded file or None.
        """
        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=True)
                if info:
                    # Update task title
                    task = self._tasks.get(task_id)
                    if task:
                        task.title = info.get("title", "未知标题")

                    # Find the downloaded file
                    filename = ydl.prepare_filename(info)
                    # Handle audio postprocessing extension change
                    if ydl_opts.get("postprocessors"):
                        base = Path(filename).stem
                        mp3_path = Path(filename).parent / f"{base}.mp3"
                        if mp3_path.exists():
                            return str(mp3_path)
                    if Path(filename).exists():
                        return filename
                    # Try common extensions
                    base = Path(filename).with_suffix("")
                    for ext in [".mp4", ".webm", ".mkv", ".mp3", ".m4a"]:
                        candidate = Path(str(base) + ext)
                        if candidate.exists():
                            return str(candidate)
                return None
        except yt_dlp.utils.DownloadError as e:
            raise RuntimeError(f"下载失败: {str(e)}")
        except Exception as e:
            raise RuntimeError(f"下载出错: {str(e)}")

    def _sync_progress_hook(self, task_id: str, data: dict) -> None:
        """Synchronous progress hook called by yt-dlp.

        Args:
            task_id: Task UUID.
            data: Progress data from yt-dlp.
        """
        task = self._tasks.get(task_id)
        if task is None:
            return

        status = data.get("status", "")
        if status == "downloading":
            # Calculate progress
            total = data.get("total_bytes") or data.get("total_bytes_estimate") or 0
            downloaded = data.get("downloaded_bytes", 0)
            if total > 0:
                task.progress = round((downloaded / total) * 100, 1)

            # Speed
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

            # ETA
            eta = data.get("eta")
            if eta and eta > 0:
                minutes = int(eta) // 60
                seconds = int(eta) % 60
                task.eta = f"{minutes:02d}:{seconds:02d}"
            else:
                task.eta = ""

            # Schedule async progress send
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
        """Send progress data via WebSocket.

        Args:
            task_id: Task UUID.
            data: Progress data dict.
        """
        ws = self._websockets.get(task_id)
        if ws:
            try:
                await ws.send_json(data)
            except Exception:
                self._websockets.pop(task_id, None)

    async def subscribe_progress(self, websocket: WebSocket, task_id: str) -> None:
        """Subscribe to progress updates via WebSocket.

        Args:
            websocket: WebSocket connection.
            task_id: Task UUID to monitor.
        """
        self._websockets[task_id] = websocket

        # Send current status immediately
        task = self._tasks.get(task_id)
        if task:
            await websocket.send_json({
                "progress": task.progress,
                "speed": task.speed,
                "eta": task.eta,
                "status": task.status.value,
            })

        # Keep connection alive until task completes or client disconnects
        try:
            while True:
                # Wait for messages from client (ping/pong or close)
                await asyncio.wait_for(websocket.receive_text(), timeout=30.0)
        except asyncio.TimeoutError:
            # Send heartbeat
            task = self._tasks.get(task_id)
            if task and task.status in (DownloadStatus.COMPLETED, DownloadStatus.FAILED):
                return
        except Exception:
            pass

    def unsubscribe_progress(self, task_id: str) -> None:
        """Remove WebSocket subscription.

        Args:
            task_id: Task UUID.
        """
        self._websockets.pop(task_id, None)

    def get_all_tasks(self) -> list[DownloadTask]:
        """Get all download tasks ordered by creation time descending.

        Returns:
            List of all download tasks.
        """
        tasks = list(self._tasks.values())
        tasks.sort(key=lambda t: t.created_at, reverse=True)
        return tasks

    def get_task(self, task_id: str) -> Optional[DownloadTask]:
        """Get a specific task by ID.

        Args:
            task_id: Task UUID.

        Returns:
            DownloadTask or None if not found.
        """
        return self._tasks.get(task_id)

    def delete_task(self, task_id: str) -> bool:
        """Delete a task and its associated file.

        Args:
            task_id: Task UUID.

        Returns:
            True if deleted, False if not found.
        """
        task = self._tasks.get(task_id)
        if task is None:
            return False

        # Delete the file if it exists
        if task.filename:
            file_path = DOWNLOADS_DIR / task.filename
            if file_path.exists():
                try:
                    file_path.unlink()
                except OSError as e:
                    logger.warning(f"Failed to delete file {file_path}: {e}")

        del self._tasks[task_id]
        return True
