"""Whishper integration for AI subtitle generation.

Whishper runs locally via Docker and uses FasterWhisper for speech-to-text.
API endpoint: http://whishper:80 (internal Docker network)
"""

import os
import logging
import asyncio
import requests
import shutil
from typing import Optional
from pathlib import Path

logger = logging.getLogger(__name__)

WHISHPER_API_URL = os.environ.get("WHISHPER_API_URL", "http://whishper:80").rstrip("/")
DOWNLOADS_DIR = Path("/app/downloads")


def is_whishper_available() -> bool:
    """Check if Whishper service is reachable."""
    try:
        resp = requests.get(f"{WHISHPER_API_URL}/api/transcriptions", timeout=5)
        return resp.status_code in (200, 401, 403)  # Any response = service is up
    except Exception:
        return False


async def transcribe_video(file_path: str, language: str = "auto", model: str = "small") -> Optional[dict]:
    """Submit a video/audio file to Whishper for transcription.
    
    Returns: {id, status, text, srt_content, segments} or None
    """
    path = Path(file_path)
    if not path.exists():
        raise ValueError("文件不存在")

    # Copy file to shared volume for Whishper access (if needed)
    # Or upload directly via multipart

    try:
        # Upload file for transcription
        with open(path, "rb") as f:
            files = {"file": (path.name, f, "video/mp4")}
            data = {
                "language": language if language != "auto" else "",
                "modelSize": model,  # tiny, base, small, medium, large
                "task": "transcribe",
            }
            resp = await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: requests.post(
                    f"{WHISHPER_API_URL}/api/transcriptions",
                    files=files,
                    data=data,
                    timeout=300,  # Transcription can take a while
                )
            )

        if resp.status_code in (200, 201):
            result = resp.json()
            return {
                "id": result.get("id", ""),
                "status": "completed",
                "text": result.get("text", ""),
                "segments": result.get("segments", []),
                "language": result.get("language", language),
            }
        else:
            logger.warning(f"Whishper returned {resp.status_code}: {resp.text[:200]}")
            return None

    except requests.Timeout:
        logger.warning("Whishper transcription timeout (>300s)")
        return None
    except requests.ConnectionError:
        logger.info("Whishper service not available")
        return None
    except Exception as e:
        logger.error(f"Whishper error: {e}")
        return None


def segments_to_srt(segments: list) -> str:
    """Convert Whisper segments to SRT format."""
    srt_lines = []
    for i, seg in enumerate(segments, 1):
        start = _format_srt_time(seg.get("start", 0))
        end = _format_srt_time(seg.get("end", 0))
        text = seg.get("text", "").strip()
        srt_lines.append(f"{i}")
        srt_lines.append(f"{start} --> {end}")
        srt_lines.append(text)
        srt_lines.append("")
    return "\n".join(srt_lines)


def segments_to_vtt(segments: list) -> str:
    """Convert Whisper segments to WebVTT format."""
    lines = ["WEBVTT", ""]
    for seg in segments:
        start = _format_vtt_time(seg.get("start", 0))
        end = _format_vtt_time(seg.get("end", 0))
        text = seg.get("text", "").strip()
        lines.append(f"{start} --> {end}")
        lines.append(text)
        lines.append("")
    return "\n".join(lines)


def _format_srt_time(seconds: float) -> str:
    """Format seconds to SRT time format: HH:MM:SS,mmm"""
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    ms = int((seconds % 1) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def _format_vtt_time(seconds: float) -> str:
    """Format seconds to VTT time format: HH:MM:SS.mmm"""
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    ms = int((seconds % 1) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d}.{ms:03d}"


async def generate_subtitle_file(file_path: str, output_format: str = "srt", language: str = "auto") -> Optional[dict]:
    """Full workflow: transcribe → generate subtitle file → return path.
    
    Returns: {output_filename, output_size, text_preview, language, segments_count}
    """
    result = await transcribe_video(file_path, language=language)
    if not result:
        raise ValueError("字幕生成失败：AI 服务不可用或文件格式不支持")

    segments = result.get("segments", [])
    if not segments:
        raise ValueError("未检测到语音内容")

    # Generate subtitle file
    path = Path(file_path)
    if output_format == "srt":
        content = segments_to_srt(segments)
        ext = ".srt"
    elif output_format == "vtt":
        content = segments_to_vtt(segments)
        ext = ".vtt"
    else:
        # JSON format
        import json
        content = json.dumps({"segments": segments, "text": result.get("text", "")}, ensure_ascii=False, indent=2)
        ext = ".json"

    output_path = path.parent / f"{path.stem}_subtitle{ext}"
    output_path.write_text(content, encoding="utf-8")

    text = result.get("text", "")
    return {
        "output_filename": output_path.name,
        "output_size": output_path.stat().st_size,
        "text_preview": text[:200] + ("..." if len(text) > 200 else ""),
        "language": result.get("language", "unknown"),
        "segments_count": len(segments),
        "message": f"字幕已生成 ({len(segments)} 段, {result.get('language', '?')})",
    }
