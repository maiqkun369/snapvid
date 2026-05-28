"""Media tools service - local ffmpeg-based processing.

Provides: format conversion, audio extraction, thumbnail extraction,
video compression, video merge. No external API needed.
"""

from __future__ import annotations

import asyncio
import logging
import os
import subprocess
import uuid
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

DOWNLOADS_DIR = Path(os.environ.get("DOWNLOADS_DIR", "/app/downloads"))


class MediaToolsService:
    """FFmpeg-based media processing tools."""

    def __init__(self) -> None:
        self._jobs: dict[str, dict] = {}

    def get_job(self, job_id: str) -> Optional[dict]:
        return self._jobs.get(job_id)

    async def convert_format(self, file_path: str, target_format: str) -> dict:
        """Convert video/audio to a different format (lossless remux where possible)."""
        path = Path(file_path)
        if not path.exists():
            raise ValueError("文件不存在")

        job_id = str(uuid.uuid4())
        output = path.parent / f"{path.stem}_converted.{target_format}"

        # Use copy codec for remux (fast, lossless) if compatible
        if target_format in ("mp4", "mkv", "webm", "mov"):
            cmd = ["ffmpeg", "-y", "-i", str(path), "-c", "copy", str(output)]
        else:
            cmd = ["ffmpeg", "-y", "-i", str(path), str(output)]

        self._jobs[job_id] = {"status": "processing", "tool": "convert"}

        try:
            result = await asyncio.get_event_loop().run_in_executor(
                None, lambda: subprocess.run(cmd, capture_output=True, text=True, timeout=300)
            )
            if result.returncode != 0:
                # Fallback: re-encode if copy fails
                cmd_reencode = ["ffmpeg", "-y", "-i", str(path), "-c:v", "libx264", "-c:a", "aac", str(output)]
                result = await asyncio.get_event_loop().run_in_executor(
                    None, lambda: subprocess.run(cmd_reencode, capture_output=True, text=True, timeout=600)
                )
                if result.returncode != 0:
                    raise RuntimeError(result.stderr[-200:] if result.stderr else "转换失败")

            self._jobs[job_id] = {"status": "completed"}
            return {
                "job_id": job_id,
                "status": "completed",
                "output_filename": output.name,
                "output_size": output.stat().st_size,
                "message": f"已转换为 {target_format.upper()}",
            }
        except Exception as e:
            self._jobs[job_id] = {"status": "failed", "error": str(e)}
            raise ValueError(f"格式转换失败: {str(e)}")

    async def extract_audio(self, file_path: str, audio_format: str = "mp3", quality: str = "192") -> dict:
        """Extract audio track from video."""
        path = Path(file_path)
        if not path.exists():
            raise ValueError("文件不存在")

        job_id = str(uuid.uuid4())
        output = path.parent / f"{path.stem}_audio.{audio_format}"

        if audio_format == "mp3":
            cmd = ["ffmpeg", "-y", "-i", str(path), "-vn", "-acodec", "libmp3lame", "-ab", f"{quality}k", str(output)]
        elif audio_format == "m4a":
            cmd = ["ffmpeg", "-y", "-i", str(path), "-vn", "-acodec", "aac", "-ab", f"{quality}k", str(output)]
        elif audio_format == "flac":
            cmd = ["ffmpeg", "-y", "-i", str(path), "-vn", "-acodec", "flac", str(output)]
        elif audio_format == "wav":
            cmd = ["ffmpeg", "-y", "-i", str(path), "-vn", "-acodec", "pcm_s16le", str(output)]
        else:
            cmd = ["ffmpeg", "-y", "-i", str(path), "-vn", str(output)]

        self._jobs[job_id] = {"status": "processing", "tool": "audio_extract"}

        try:
            result = await asyncio.get_event_loop().run_in_executor(
                None, lambda: subprocess.run(cmd, capture_output=True, text=True, timeout=300)
            )
            if result.returncode != 0:
                raise RuntimeError(result.stderr[-200:] if result.stderr else "提取失败")

            self._jobs[job_id] = {"status": "completed"}
            return {
                "job_id": job_id,
                "status": "completed",
                "output_filename": output.name,
                "output_size": output.stat().st_size,
                "message": f"音频已提取为 {audio_format.upper()} ({quality}kbps)",
            }
        except Exception as e:
            self._jobs[job_id] = {"status": "failed", "error": str(e)}
            raise ValueError(f"音频提取失败: {str(e)}")

    async def extract_thumbnail(self, file_path: str, time_pos: str = "00:00:01") -> dict:
        """Extract a frame from video as thumbnail image."""
        path = Path(file_path)
        if not path.exists():
            raise ValueError("文件不存在")

        job_id = str(uuid.uuid4())
        output = path.parent / f"{path.stem}_thumb.jpg"

        cmd = ["ffmpeg", "-y", "-i", str(path), "-ss", time_pos, "-vframes", "1", "-q:v", "2", str(output)]

        self._jobs[job_id] = {"status": "processing", "tool": "thumbnail"}

        try:
            result = await asyncio.get_event_loop().run_in_executor(
                None, lambda: subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            )
            if result.returncode != 0:
                raise RuntimeError(result.stderr[-200:] if result.stderr else "封面提取失败")

            self._jobs[job_id] = {"status": "completed"}
            return {
                "job_id": job_id,
                "status": "completed",
                "output_filename": output.name,
                "output_size": output.stat().st_size,
                "message": "封面已提取",
            }
        except Exception as e:
            self._jobs[job_id] = {"status": "failed", "error": str(e)}
            raise ValueError(f"封面提取失败: {str(e)}")

    async def compress_video(self, file_path: str, crf: int = 28, preset: str = "fast") -> dict:
        """Compress video using H.264 with CRF."""
        path = Path(file_path)
        if not path.exists():
            raise ValueError("文件不存在")

        job_id = str(uuid.uuid4())
        output = path.parent / f"{path.stem}_compressed.mp4"

        cmd = [
            "ffmpeg", "-y", "-i", str(path),
            "-c:v", "libx264", "-crf", str(crf), "-preset", preset,
            "-c:a", "aac", "-b:a", "128k",
            str(output)
        ]

        self._jobs[job_id] = {"status": "processing", "tool": "compress"}

        try:
            result = await asyncio.get_event_loop().run_in_executor(
                None, lambda: subprocess.run(cmd, capture_output=True, text=True, timeout=900)
            )
            if result.returncode != 0:
                raise RuntimeError(result.stderr[-200:] if result.stderr else "压缩失败")

            original_size = path.stat().st_size
            new_size = output.stat().st_size
            ratio = (1 - new_size / original_size) * 100 if original_size > 0 else 0

            # If compressed file is larger, delete it and return original
            if new_size >= original_size:
                output.unlink(missing_ok=True)
                self._jobs[job_id] = {"status": "completed"}
                return {
                    "job_id": job_id,
                    "status": "completed",
                    "output_filename": path.name,
                    "output_size": original_size,
                    "original_size": original_size,
                    "compression_ratio": "0%",
                    "message": "文件已是最优体积，无需压缩",
                }

            self._jobs[job_id] = {"status": "completed"}
            return {
                "job_id": job_id,
                "status": "completed",
                "output_filename": output.name,
                "output_size": new_size,
                "original_size": original_size,
                "compression_ratio": f"{ratio:.1f}%",
                "message": f"压缩完成，体积减小 {ratio:.1f}%",
            }
        except Exception as e:
            self._jobs[job_id] = {"status": "failed", "error": str(e)}
            raise ValueError(f"视频压缩失败: {str(e)}")

    async def merge_videos(self, file_paths: list[str]) -> dict:
        """Merge multiple videos into one using concat demuxer."""
        if len(file_paths) < 2:
            raise ValueError("至少需要两个视频文件")

        for fp in file_paths:
            if not Path(fp).exists():
                raise ValueError(f"文件不存在: {fp}")

        job_id = str(uuid.uuid4())
        # Create concat list file
        concat_file = DOWNLOADS_DIR / f"concat_{job_id}.txt"
        with open(concat_file, "w") as f:
            for fp in file_paths:
                f.write(f"file '{fp}'\n")

        output = DOWNLOADS_DIR / f"merged_{job_id}.mp4"
        cmd = ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(concat_file), "-c", "copy", str(output)]

        self._jobs[job_id] = {"status": "processing", "tool": "merge"}

        try:
            result = await asyncio.get_event_loop().run_in_executor(
                None, lambda: subprocess.run(cmd, capture_output=True, text=True, timeout=600)
            )
            # Clean up concat file
            concat_file.unlink(missing_ok=True)

            if result.returncode != 0:
                raise RuntimeError(result.stderr[-200:] if result.stderr else "拼接失败")

            self._jobs[job_id] = {"status": "completed"}
            return {
                "job_id": job_id,
                "status": "completed",
                "output_filename": output.name,
                "output_size": output.stat().st_size,
                "message": f"已合并 {len(file_paths)} 个视频",
            }
        except Exception as e:
            concat_file.unlink(missing_ok=True)
            self._jobs[job_id] = {"status": "failed", "error": str(e)}
            raise ValueError(f"视频拼接失败: {str(e)}")
