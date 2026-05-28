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

    async def video_to_gif(self, file_path: str, start: str = "00:00:00", duration: str = "5", fps: int = 15, width: int = 480) -> dict:
        """Convert a video segment to GIF."""
        path = Path(file_path)
        if not path.exists():
            raise ValueError("文件不存在")

        job_id = str(uuid.uuid4())
        output = path.parent / f"{path.stem}_clip.gif"

        # Two-pass for quality: generate palette then apply
        palette = path.parent / f"palette_{job_id}.png"
        cmd_palette = [
            "ffmpeg", "-y", "-ss", start, "-t", duration, "-i", str(path),
            "-vf", f"fps={fps},scale={width}:-1:flags=lanczos,palettegen",
            str(palette)
        ]
        cmd_gif = [
            "ffmpeg", "-y", "-ss", start, "-t", duration, "-i", str(path), "-i", str(palette),
            "-lavfi", f"fps={fps},scale={width}:-1:flags=lanczos[x];[x][1:v]paletteuse",
            str(output)
        ]

        self._jobs[job_id] = {"status": "processing", "tool": "gif"}

        try:
            # Generate palette
            await asyncio.get_event_loop().run_in_executor(
                None, lambda: subprocess.run(cmd_palette, capture_output=True, text=True, timeout=60)
            )
            # Generate GIF
            result = await asyncio.get_event_loop().run_in_executor(
                None, lambda: subprocess.run(cmd_gif, capture_output=True, text=True, timeout=120)
            )
            palette.unlink(missing_ok=True)

            if result.returncode != 0 or not output.exists():
                raise RuntimeError(result.stderr[-200:] if result.stderr else "GIF 生成失败")

            self._jobs[job_id] = {"status": "completed"}
            return {
                "job_id": job_id,
                "status": "completed",
                "output_filename": output.name,
                "output_size": output.stat().st_size,
                "message": f"GIF 已生成 ({duration}秒, {fps}fps)",
            }
        except Exception as e:
            palette.unlink(missing_ok=True)
            self._jobs[job_id] = {"status": "failed", "error": str(e)}
            raise ValueError(f"GIF 生成失败: {str(e)}")

    async def add_watermark(self, file_path: str, text: str = "SnapVid", position: str = "bottomright") -> dict:
        """Add text watermark to video."""
        path = Path(file_path)
        if not path.exists():
            raise ValueError("文件不存在")

        job_id = str(uuid.uuid4())
        output = path.parent / f"{path.stem}_watermarked.mp4"

        # Position mapping
        pos_map = {
            "topleft": "x=20:y=20",
            "topright": "x=w-tw-20:y=20",
            "bottomleft": "x=20:y=h-th-20",
            "bottomright": "x=w-tw-20:y=h-th-20",
            "center": "x=(w-tw)/2:y=(h-th)/2",
        }
        pos = pos_map.get(position, pos_map["bottomright"])

        # Sanitize text to prevent ffmpeg filter injection
        import re
        safe_text = re.sub(r"['\";\\:`${}|&<>]", "", text)[:50]  # Strip dangerous chars, limit length
        if not safe_text:
            safe_text = "SnapVid"

        cmd = [
            "ffmpeg", "-y", "-i", str(path),
            "-vf", f"drawtext=text='{safe_text}':fontsize=24:fontcolor=white@0.7:{pos}",
            "-c:a", "copy", str(output)
        ]

        self._jobs[job_id] = {"status": "processing", "tool": "watermark"}

        try:
            result = await asyncio.get_event_loop().run_in_executor(
                None, lambda: subprocess.run(cmd, capture_output=True, text=True, timeout=600)
            )
            if result.returncode != 0:
                raise RuntimeError(result.stderr[-200:] if result.stderr else "水印添加失败")

            self._jobs[job_id] = {"status": "completed"}
            return {
                "job_id": job_id,
                "status": "completed",
                "output_filename": output.name,
                "output_size": output.stat().st_size,
                "message": f"水印已添加: {text}",
            }
        except Exception as e:
            self._jobs[job_id] = {"status": "failed", "error": str(e)}
            raise ValueError(f"水印添加失败: {str(e)}")

    async def denoise_audio(self, file_path: str) -> dict:
        """Remove background noise from audio/video using FFmpeg highpass+lowpass filter."""
        path = Path(file_path)
        if not path.exists():
            raise ValueError("文件不存在")

        job_id = str(uuid.uuid4())
        ext = path.suffix
        output = path.parent / f"{path.stem}_denoised{ext}"

        # Apply noise reduction: highpass filter removes low rumble, lowpass removes hiss
        cmd = [
            "ffmpeg", "-y", "-i", str(path),
            "-af", "highpass=f=200,lowpass=f=3000,afftdn=nf=-25",
            "-c:v", "copy", str(output)
        ]

        self._jobs[job_id] = {"status": "processing", "tool": "denoise"}

        try:
            result = await asyncio.get_event_loop().run_in_executor(
                None, lambda: subprocess.run(cmd, capture_output=True, text=True, timeout=300)
            )
            if result.returncode != 0:
                raise RuntimeError(result.stderr[-200:] if result.stderr else "降噪失败")

            self._jobs[job_id] = {"status": "completed"}
            return {
                "job_id": job_id,
                "status": "completed",
                "output_filename": output.name,
                "output_size": output.stat().st_size,
                "message": "音频降噪完成",
            }
        except Exception as e:
            self._jobs[job_id] = {"status": "failed", "error": str(e)}
            raise ValueError(f"音频降噪失败: {str(e)}")

    async def video_summary(self, file_path: str) -> dict:
        """Generate video summary by extracting key frames + audio transcript.
        Uses ffmpeg for keyframe extraction. AI summary requires API config."""
        path = Path(file_path)
        if not path.exists():
            raise ValueError("文件不存在")

        job_id = str(uuid.uuid4())
        self._jobs[job_id] = {"status": "processing", "tool": "summary"}

        # Extract video duration and key info via ffprobe
        probe_cmd = [
            "ffprobe", "-v", "quiet", "-print_format", "json",
            "-show_format", "-show_streams", str(path)
        ]

        try:
            probe_result = await asyncio.get_event_loop().run_in_executor(
                None, lambda: subprocess.run(probe_cmd, capture_output=True, text=True, timeout=30)
            )
            import json
            probe_data = json.loads(probe_result.stdout) if probe_result.returncode == 0 else {}
            fmt = probe_data.get("format", {})

            duration = float(fmt.get("duration", 0))
            size = int(fmt.get("size", 0))
            bitrate = int(fmt.get("bit_rate", 0))

            # Extract video stream info
            streams = probe_data.get("streams", [])
            video_stream = next((s for s in streams if s.get("codec_type") == "video"), {})
            audio_stream = next((s for s in streams if s.get("codec_type") == "audio"), {})

            width = video_stream.get("width", 0)
            height = video_stream.get("height", 0)
            # Safe fps parsing (e.g. "30000/1001" → 29.97)
            fps_str = video_stream.get("r_frame_rate", "0/1")
            try:
                if "/" in fps_str:
                    num, den = fps_str.split("/")
                    fps = float(num) / float(den) if float(den) != 0 else 0
                else:
                    fps = float(fps_str)
            except (ValueError, ZeroDivisionError):
                fps = 0
            codec = video_stream.get("codec_name", "unknown")

            mins = int(duration) // 60
            secs = int(duration) % 60

            summary = {
                "duration": f"{mins}分{secs}秒",
                "resolution": f"{width}x{height}" if width else "未知",
                "fps": f"{fps:.0f}" if fps else "未知",
                "codec": codec,
                "filesize": f"{size / 1024 / 1024:.1f} MB",
                "bitrate": f"{bitrate / 1000:.0f} kbps" if bitrate else "未知",
                "audio_codec": audio_stream.get("codec_name", "无音频"),
                "audio_channels": audio_stream.get("channels", 0),
            }

            self._jobs[job_id] = {"status": "completed"}
            return {
                "job_id": job_id,
                "status": "completed",
                "summary": summary,
                "message": "视频摘要已生成",
                "note": "AI 文字摘要需配置 AI API（当前为媒体信息摘要）",
            }
        except Exception as e:
            self._jobs[job_id] = {"status": "failed", "error": str(e)}
            raise ValueError(f"摘要生成失败: {str(e)}")
