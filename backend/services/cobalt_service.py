"""Cobalt API integration for downloading videos from YouTube/Twitter/Instagram etc.

Cobalt is a self-hosted video download service. When available, it's used as a
fallback for platforms that are blocked in certain regions (e.g., YouTube in China).

If COBALT_API_URL is not set, this service gracefully degrades (returns None).
"""

import os
import logging
import requests
from typing import Optional
from pathlib import Path

logger = logging.getLogger(__name__)

COBALT_API_URL = os.environ.get("COBALT_API_URL", "").rstrip("/")
DOWNLOADS_DIR = Path("/app/downloads")


def is_cobalt_available() -> bool:
    """Check if Cobalt service is configured and reachable."""
    if not COBALT_API_URL:
        return False
    try:
        resp = requests.get(COBALT_API_URL, timeout=3)
        return resp.status_code == 200
    except Exception:
        return False


def download_via_cobalt(url: str, video_quality: str = "1080", audio_only: bool = False) -> Optional[dict]:
    """Download a video using Cobalt API.
    
    Returns: {url, filename} if successful, None otherwise.
    """
    if not COBALT_API_URL:
        return None

    endpoint = f"{COBALT_API_URL}/"
    payload = {
        "url": url,
        "videoQuality": video_quality,
        "filenameStyle": "pretty",
        "youtubeVideoCodec": "h264",
    }
    if audio_only:
        payload["downloadMode"] = "audio"
        payload["audioFormat"] = "mp3"
        payload["audioBitrate"] = "256"

    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
    }

    try:
        resp = requests.post(endpoint, json=payload, headers=headers, timeout=30)
        if resp.status_code != 200:
            logger.warning(f"Cobalt API returned {resp.status_code}: {resp.text[:100]}")
            return None

        data = resp.json()
        status = data.get("status")

        if status in ("tunnel", "redirect"):
            # Direct download URL
            return {
                "download_url": data.get("url"),
                "filename": data.get("filename", "video.mp4"),
            }
        elif status == "picker":
            # Multiple items (e.g., carousel) - take first video
            picker = data.get("picker", [])
            for item in picker:
                if item.get("type") == "video":
                    return {
                        "download_url": item.get("url"),
                        "filename": data.get("audioFilename", "video.mp4"),
                    }
            # Fallback to first item
            if picker:
                return {
                    "download_url": picker[0].get("url"),
                    "filename": "media.mp4",
                }
        elif status == "error":
            error = data.get("error", {})
            logger.warning(f"Cobalt error: {error.get('code', 'unknown')}")
            return None

    except requests.Timeout:
        logger.warning("Cobalt API timeout")
    except Exception as e:
        logger.error(f"Cobalt API error: {e}")

    return None


def download_file_from_cobalt(url: str, output_dir: str, filename: str = "") -> Optional[str]:
    """Download the actual file from a Cobalt tunnel/redirect URL."""
    try:
        resp = requests.get(url, stream=True, timeout=120)
        if resp.status_code != 200:
            return None

        if not filename:
            # Try to get from Content-Disposition
            cd = resp.headers.get("Content-Disposition", "")
            if "filename=" in cd:
                filename = cd.split("filename=")[1].strip('"')
            else:
                filename = "cobalt_download.mp4"

        output_path = Path(output_dir) / filename
        with open(output_path, "wb") as f:
            for chunk in resp.iter_content(chunk_size=1024 * 1024):
                f.write(chunk)

        return str(output_path)
    except Exception as e:
        logger.error(f"Failed to download from Cobalt: {e}")
        return None
