"""Douyin fallback parser when yt-dlp fails.

Uses iesdouyin.com mobile share page to extract video info without requiring cookies.
"""

import re
import json
import logging
from typing import Optional

import requests

logger = logging.getLogger(__name__)


def extract_douyin_info(video_id: str) -> Optional[dict]:
    """Extract video info from Douyin using mobile share page fallback.
    
    Returns dict with: title, author, video_url, thumbnail, duration
    """
    headers = {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) "
                      "AppleWebKit/605.1.15 (KHTML, like Gecko) "
                      "Version/16.6 Mobile/15E148 Safari/604.1",
        "Referer": "https://www.douyin.com/",
    }

    url = f"https://www.iesdouyin.com/share/video/{video_id}/"

    try:
        resp = requests.get(url, headers=headers, timeout=15, allow_redirects=True)
        if resp.status_code != 200:
            return None

        # Extract _ROUTER_DATA JSON from page
        match = re.search(r'window\._ROUTER_DATA\s*=\s*({.*?})</script>', resp.text, re.DOTALL)
        if not match:
            return None

        data = json.loads(match.group(1))

        # Navigate to video data
        info = _extract_video_data(data)
        if info:
            info["platform"] = "Douyin"
            info["extractor"] = "Douyin (fallback)"
            return info

        return None

    except Exception as e:
        logger.error(f"Douyin fallback failed: {e}")
        return None


def _extract_video_data(data: dict) -> Optional[dict]:
    """Recursively extract video info from the page JSON."""
    result = {
        "title": "",
        "author": "",
        "video_url": "",
        "thumbnail": "",
        "duration": 0,
    }

    # Search for key fields recursively
    _search(data, result, depth=0)

    if result["title"] or result["video_url"]:
        return result
    return None


def _search(obj, result: dict, depth: int = 0) -> None:
    """Recursively search for video data fields."""
    if depth > 10:
        return

    if isinstance(obj, dict):
        # Title/description
        if "desc" in obj and isinstance(obj["desc"], str) and len(obj["desc"]) > 3:
            if not result["title"]:
                result["title"] = obj["desc"]

        # Author
        if "nickname" in obj and isinstance(obj["nickname"], str):
            if not result["author"]:
                result["author"] = obj["nickname"]

        # Video play address
        if "play_addr" in obj and isinstance(obj["play_addr"], dict):
            play = obj["play_addr"]
            if "url_list" in play and play["url_list"]:
                # Get the first URL (usually the CDN URL)
                url = play["url_list"][0]
                # Convert to no-watermark URL
                url = url.replace("/playwm/", "/play/")
                result["video_url"] = url
            if "uri" in play:
                result["video_uri"] = play["uri"]

        # Download address (higher quality, no watermark)
        if "download_addr" in obj and isinstance(obj["download_addr"], dict):
            dl = obj["download_addr"]
            if "url_list" in dl and dl["url_list"]:
                result["video_url"] = dl["url_list"][0]

        # Duration
        if "duration" in obj and isinstance(obj["duration"], (int, float)):
            if obj["duration"] > 0:
                result["duration"] = obj["duration"] / 1000  # ms to seconds

        # Thumbnail/cover
        if "cover" in obj and isinstance(obj["cover"], dict):
            cover = obj["cover"]
            if "url_list" in cover and cover["url_list"]:
                result["thumbnail"] = cover["url_list"][0]

        # Recurse into all values
        for v in obj.values():
            _search(v, result, depth + 1)

    elif isinstance(obj, list):
        for item in obj[:10]:
            _search(item, result, depth + 1)
