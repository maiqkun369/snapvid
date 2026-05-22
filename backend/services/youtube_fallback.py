"""YouTube fallback downloader using Cobalt API or Invidious.

When yt-dlp fails for YouTube (due to cookie/geo requirements),
this module provides alternative download methods that are transparent to the user.
"""

import json
import logging
import os
import re
from typing import Optional

import requests

logger = logging.getLogger(__name__)

# Cobalt API instance - self-hosted or community instances
# Users can set COBALT_API_URL env var to point to their own instance
COBALT_API_URL = os.environ.get("COBALT_API_URL", "https://api.cobalt.tools")

# Invidious instances as fallback (prefer those with good connectivity from China)
INVIDIOUS_INSTANCES = [
    "https://inv.nadeko.net",
    "https://invidious.nerdvpn.de",
    "https://vid.puffyan.us",
    "https://invidious.fdn.fr",
]


def extract_youtube_video_id(url: str) -> Optional[str]:
    """Extract YouTube video ID from various URL formats."""
    patterns = [
        r'(?:youtube\.com/watch\?v=|youtu\.be/|youtube\.com/shorts/)([a-zA-Z0-9_-]{11})',
        r'youtube\.com/embed/([a-zA-Z0-9_-]{11})',
        r'youtube\.com/v/([a-zA-Z0-9_-]{11})',
    ]
    for pat in patterns:
        match = re.search(pat, url)
        if match:
            return match.group(1)
    return None


def get_youtube_info_via_cobalt(url: str) -> Optional[dict]:
    """Get YouTube video info via Cobalt API."""
    try:
        resp = requests.post(
            f"{COBALT_API_URL}/",
            headers={
                "Accept": "application/json",
                "Content-Type": "application/json",
            },
            json={
                "url": url,
                "videoQuality": "1080",
                "youtubeVideoCodec": "h264",
                "downloadMode": "auto",
                "filenameStyle": "basic",
            },
            timeout=5,
        )

        if resp.status_code == 200:
            data = resp.json()
            status = data.get("status")
            if status in ("tunnel", "redirect"):
                return {
                    "download_url": data.get("url", ""),
                    "filename": data.get("filename", ""),
                    "source": "cobalt",
                }
            elif status == "picker":
                # Multiple items - pick first video
                items = data.get("picker", [])
                for item in items:
                    if item.get("type") == "video" or "url" in item:
                        return {
                            "download_url": item.get("url", ""),
                            "filename": data.get("filename", ""),
                            "source": "cobalt",
                        }
        return None
    except Exception as e:
        logger.warning(f"Cobalt API failed: {e}")
        return None


def get_youtube_info_via_invidious(video_id: str) -> Optional[dict]:
    """Get YouTube video info and stream URL via Invidious API."""
    for instance in INVIDIOUS_INSTANCES:
        try:
            resp = requests.get(
                f"{instance}/api/v1/videos/{video_id}",
                timeout=5,
                headers={"Accept": "application/json"},
            )
            if resp.status_code != 200:
                continue

            data = resp.json()
            title = data.get("title", "YouTube Video")
            author = data.get("author", "")
            description = data.get("description", "")
            length = data.get("lengthSeconds", 0)
            thumbnail = ""
            thumbnails = data.get("videoThumbnails", [])
            if thumbnails:
                # Get medium quality thumbnail
                for t in thumbnails:
                    if t.get("quality") == "medium":
                        thumbnail = t.get("url", "")
                        break
                if not thumbnail:
                    thumbnail = thumbnails[0].get("url", "")

            # Get best format stream URL
            formats = data.get("formatStreams", []) + data.get("adaptiveFormats", [])
            video_url = ""
            best_quality = 0

            for fmt in formats:
                # Prefer combined video+audio streams
                if fmt.get("type", "").startswith("video/mp4") and "audio" in fmt.get("type", ""):
                    quality = int(fmt.get("qualityLabel", "0p").replace("p", "") or "0")
                    if quality > best_quality:
                        best_quality = quality
                        video_url = fmt.get("url", "")

            # If no combined, get best video
            if not video_url:
                for fmt in formats:
                    if fmt.get("type", "").startswith("video/"):
                        video_url = fmt.get("url", "")
                        break

            if video_url:
                return {
                    "title": title,
                    "author": author,
                    "description": description,
                    "duration": length,
                    "thumbnail": thumbnail,
                    "download_url": video_url,
                    "source": "invidious",
                    "instance": instance,
                }
        except Exception as e:
            logger.warning(f"Invidious {instance} failed: {e}")
            continue

    return None


def download_youtube_video(url: str, output_path: str, progress_callback=None) -> Optional[str]:
    """Download YouTube video using fallback methods.
    
    Tries in order: Cobalt API → Invidious → gives up.
    Returns the downloaded file path or None.
    """
    video_id = extract_youtube_video_id(url)
    if not video_id:
        return None

    # Try Cobalt first
    cobalt_info = get_youtube_info_via_cobalt(url)
    if cobalt_info and cobalt_info.get("download_url"):
        download_url = cobalt_info["download_url"]
        filename = cobalt_info.get("filename", f"{video_id}.mp4")
        return _download_file(download_url, output_path, filename, progress_callback)

    # Try Invidious
    invidious_info = get_youtube_info_via_invidious(video_id)
    if invidious_info and invidious_info.get("download_url"):
        download_url = invidious_info["download_url"]
        title = invidious_info.get("title", video_id)
        safe_title = re.sub(r'[^\w\s-]', '', title)[:80].strip()
        filename = f"{safe_title}.mp4"
        return _download_file(download_url, output_path, filename, progress_callback)

    return None


def get_youtube_info_fallback(url: str) -> Optional[dict]:
    """Get YouTube video info without requiring cookies.
    
    Returns standardized info dict or None.
    """
    video_id = extract_youtube_video_id(url)
    if not video_id:
        return None

    # Try Invidious for metadata (since Cobalt only gives download URLs)
    info = get_youtube_info_via_invidious(video_id)
    if info:
        return info

    # Minimal fallback - just return video ID based info
    return {
        "title": f"YouTube Video ({video_id})",
        "author": "",
        "description": "",
        "duration": 0,
        "thumbnail": f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg",
        "download_url": "",
        "source": "metadata_only",
    }


def _download_file(url: str, output_dir: str, filename: str, progress_callback=None) -> Optional[str]:
    """Download a file from URL to output directory."""
    import os
    from pathlib import Path

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    }

    try:
        resp = requests.get(url, headers=headers, stream=True, timeout=120)
        if resp.status_code != 200:
            logger.error(f"Download failed: HTTP {resp.status_code}")
            return None

        output_path = Path(output_dir) / filename
        total = int(resp.headers.get("content-length", 0))
        downloaded = 0

        with open(output_path, "wb") as f:
            for chunk in resp.iter_content(chunk_size=1024 * 1024):
                f.write(chunk)
                downloaded += len(chunk)
                if progress_callback and total > 0:
                    progress_callback(downloaded, total)

        return str(output_path)
    except Exception as e:
        logger.error(f"File download failed: {e}")
        return None
