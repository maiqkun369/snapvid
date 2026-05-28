"""Video editor service - timeline-based editing via FFmpeg.

Supports: clip trimming, multi-segment concat, speed adjustment,
text overlay, resolution change, and quality export.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import subprocess
import uuid
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

DOWNLOADS_DIR = Path(os.environ.get("DOWNLOADS_DIR", "/app/downloads"))


class EditorService:
    """Video editor backend powered by FFmpeg."""

    def __init__(self) -> None:
        self._jobs: dict[str, dict] = {}

    async def generate_thumbnails(self, file_path: str, count: int = 20) -> dict:
        """Generate evenly-spaced thumbnail strip for timeline visualization.
        
        Returns list of thumbnail image filenames.
        """
        path = Path(file_path)
        if not path.exists():
            raise ValueError("文件不存在")

        job_id = str(uuid.uuid4())

        # Get video duration first
        duration = await self._get_duration(file_path)
        if duration <= 0:
            raise ValueError("无法获取视频时长")

        interval = duration / count
        thumbs_dir = DOWNLOADS_DIR / f"thumbs_{job_id}"
        thumbs_dir.mkdir(exist_ok=True)

        # Generate thumbnails at intervals
        cmd = [
            "ffmpeg", "-y", "-i", str(path),
            "-vf", f"fps=1/{max(interval, 0.5)},scale=160:-1",
            "-q:v", "5",
            str(thumbs_dir / "thumb_%03d.jpg")
        ]

        try:
            result = await asyncio.get_event_loop().run_in_executor(
                None, lambda: subprocess.run(cmd, capture_output=True, text=True, timeout=60)
            )

            # Collect generated thumbnails
            thumbs = sorted(thumbs_dir.glob("thumb_*.jpg"))
            filenames = [f"thumbs_{job_id}/{t.name}" for t in thumbs[:count]]

            return {
                "job_id": job_id,
                "duration": duration,
                "thumbnails": filenames,
                "count": len(filenames),
                "interval": interval,
            }
        except Exception as e:
            raise ValueError(f"缩略图生成失败: {str(e)}")

    async def export_edit(self, file_path: str, edit_plan: dict) -> dict:
        """Execute an edit plan and produce the final video.
        
        edit_plan: {
            clips: [{start, end, speed}],
            output_format: "mp4",
            resolution: "1080p" | "720p" | "original",
            quality: "high" | "medium" | "low",
            texts: [{content, start, duration, position, size}]
        }
        """
        path = Path(file_path)
        if not path.exists():
            raise ValueError("文件不存在")

        job_id = str(uuid.uuid4())
        self._jobs[job_id] = {"status": "processing", "progress": 0}

        clips = edit_plan.get("clips", [])
        output_format = edit_plan.get("output_format", "mp4")
        resolution = edit_plan.get("resolution", "original")
        quality = edit_plan.get("quality", "high")
        texts = edit_plan.get("texts", [])

        if not clips:
            raise ValueError("至少需要一个片段")

        # Quality mapping
        crf_map = {"high": 18, "medium": 23, "low": 28}
        crf = crf_map.get(quality, 23)

        # Resolution mapping
        scale_map = {"1080p": "1920:-2", "720p": "1280:-2", "480p": "854:-2"}
        scale_filter = f"scale={scale_map[resolution]}" if resolution in scale_map else None

        output_path = DOWNLOADS_DIR / f"edit_{job_id}.{output_format}"

        try:
            if len(clips) == 1 and not texts:
                # Simple single-clip trim
                clip = clips[0]
                await self._export_single_clip(path, clip, output_path, crf, scale_filter)
            else:
                # Multi-clip with concat
                await self._export_multi_clip(path, clips, texts, output_path, crf, scale_filter)

            self._jobs[job_id] = {"status": "completed", "progress": 100}

            return {
                "job_id": job_id,
                "status": "completed",
                "output_filename": output_path.name,
                "output_size": output_path.stat().st_size,
                "message": f"导出完成 ({len(clips)} 个片段)",
            }
        except Exception as e:
            self._jobs[job_id] = {"status": "failed", "error": str(e)}
            raise ValueError(f"导出失败: {str(e)}")

    async def _export_single_clip(self, source: Path, clip: dict, output: Path, crf: int, scale_filter: Optional[str]) -> None:
        """Export a single trimmed clip."""
        start = clip.get("start", "00:00:00")
        end = clip.get("end", "")
        speed = clip.get("speed", 1.0)

        cmd = ["ffmpeg", "-y", "-i", str(source), "-ss", start]
        if end:
            cmd.extend(["-to", end])

        # Video filters
        vf_parts = []
        if speed != 1.0:
            vf_parts.append(f"setpts={1/speed}*PTS")
        if scale_filter:
            vf_parts.append(scale_filter)

        if vf_parts:
            cmd.extend(["-vf", ",".join(vf_parts)])

        # Audio speed
        af_parts = []
        if speed != 1.0:
            # atempo only supports 0.5-2.0, chain for extreme speeds
            s = speed
            while s > 2.0:
                af_parts.append("atempo=2.0")
                s /= 2.0
            while s < 0.5:
                af_parts.append("atempo=0.5")
                s *= 2.0
            af_parts.append(f"atempo={s:.3f}")
            cmd.extend(["-af", ",".join(af_parts)])

        cmd.extend(["-c:v", "libx264", "-crf", str(crf), "-c:a", "aac", "-b:a", "128k", str(output)])

        result = await asyncio.get_event_loop().run_in_executor(
            None, lambda: subprocess.run(cmd, capture_output=True, text=True, timeout=600)
        )
        if result.returncode != 0:
            raise RuntimeError(result.stderr[-300:] if result.stderr else "编码失败")

    async def _export_multi_clip(self, source: Path, clips: list, texts: list, output: Path, crf: int, scale_filter: Optional[str]) -> None:
        """Export multiple clips concatenated together."""
        # Step 1: Export each clip as temp file
        temp_files = []
        for i, clip in enumerate(clips):
            temp_path = DOWNLOADS_DIR / f"_temp_clip_{i}_{uuid.uuid4().hex[:6]}.mp4"
            await self._export_single_clip(source, clip, temp_path, crf, scale_filter)
            temp_files.append(temp_path)

        # Step 2: Create concat list
        concat_file = DOWNLOADS_DIR / f"_concat_{uuid.uuid4().hex[:6]}.txt"
        with open(concat_file, "w") as f:
            for tf in temp_files:
                f.write(f"file '{tf}'\n")

        # Step 3: Concat
        cmd = ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(concat_file)]

        # Add text overlays if any
        if texts:
            vf_parts = []
            for t in texts:
                content = t.get("content", "").replace("'", "\\'")
                start_t = t.get("start", 0)
                dur = t.get("duration", 3)
                pos = t.get("position", "center")
                size = t.get("size", 36)
                pos_map = {
                    "center": "x=(w-tw)/2:y=(h-th)/2",
                    "top": "x=(w-tw)/2:y=50",
                    "bottom": "x=(w-tw)/2:y=h-th-50",
                }
                xy = pos_map.get(pos, pos_map["center"])
                vf_parts.append(
                    f"drawtext=text='{content}':fontsize={size}:fontcolor=white:"
                    f"{xy}:enable='between(t,{start_t},{start_t + dur})'"
                )
            cmd.extend(["-vf", ",".join(vf_parts), "-c:v", "libx264", "-crf", str(crf), "-c:a", "aac"])
        else:
            cmd.extend(["-c", "copy"])

        cmd.append(str(output))

        result = await asyncio.get_event_loop().run_in_executor(
            None, lambda: subprocess.run(cmd, capture_output=True, text=True, timeout=900)
        )

        # Cleanup temp files
        for tf in temp_files:
            tf.unlink(missing_ok=True)
        concat_file.unlink(missing_ok=True)

        if result.returncode != 0:
            raise RuntimeError(result.stderr[-300:] if result.stderr else "合并失败")

    async def _get_duration(self, file_path: str) -> float:
        """Get video duration in seconds."""
        cmd = [
            "ffprobe", "-v", "quiet", "-print_format", "json",
            "-show_format", str(file_path)
        ]
        result = await asyncio.get_event_loop().run_in_executor(
            None, lambda: subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        )
        if result.returncode == 0:
            try:
                data = json.loads(result.stdout)
                return float(data.get("format", {}).get("duration", 0))
            except (json.JSONDecodeError, ValueError):
                pass
        return 0

    def get_job_status(self, job_id: str) -> Optional[dict]:
        return self._jobs.get(job_id)

    async def export_multi_source(self, plan: dict) -> dict:
        """Export a multi-source edit - clips from different video files.
        
        plan: {
            clips: [{file_path, start, end, speed}],
            output_format, resolution, quality, texts
        }
        """
        clips = plan.get("clips", [])
        output_format = plan.get("output_format", "mp4")
        resolution = plan.get("resolution", "original")
        quality = plan.get("quality", "high")
        texts = plan.get("texts", [])

        if not clips:
            raise ValueError("至少需要一个片段")

        job_id = str(uuid.uuid4())
        self._jobs[job_id] = {"status": "processing", "progress": 0}

        crf_map = {"high": 18, "medium": 23, "low": 28}
        crf = crf_map.get(quality, 23)
        scale_map = {"1080p": "1920:-2", "720p": "1280:-2", "480p": "854:-2"}
        scale_filter = f"scale={scale_map[resolution]}" if resolution in scale_map else None

        output_path = DOWNLOADS_DIR / f"edit_{job_id}.{output_format}"

        try:
            # Step 1: Export each clip from its source as temp file
            temp_files = []
            for i, clip in enumerate(clips):
                temp_path = DOWNLOADS_DIR / f"_temp_multi_{i}_{job_id[:8]}.mp4"
                source = Path(clip["file_path"])
                if not source.exists():
                    raise ValueError(f"源文件不存在: {source.name}")
                await self._export_single_clip(source, clip, temp_path, crf, scale_filter)
                temp_files.append(temp_path)

            # Step 2: Concat all clips
            concat_file = DOWNLOADS_DIR / f"_concat_multi_{job_id[:8]}.txt"
            with open(concat_file, "w") as f:
                for tf in temp_files:
                    f.write(f"file '{tf}'\n")

            cmd = ["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", str(concat_file)]

            if texts:
                import re
                vf_parts = []
                for t in texts:
                    safe_content = re.sub(r"['\";\\:`${}|&<>]", "", t.get("content", ""))[:50]
                    start_t = t.get("start", 0)
                    dur = t.get("duration", 3)
                    pos = t.get("position", "bottom")
                    size = t.get("size", 36)
                    pos_map = {"center": "x=(w-tw)/2:y=(h-th)/2", "top": "x=(w-tw)/2:y=50", "bottom": "x=(w-tw)/2:y=h-th-50"}
                    xy = pos_map.get(pos, pos_map["bottom"])
                    vf_parts.append(f"drawtext=text='{safe_content}':fontsize={size}:fontcolor=white:{xy}:enable='between(t,{start_t},{start_t+dur})'")
                cmd.extend(["-vf", ",".join(vf_parts), "-c:v", "libx264", "-crf", str(crf), "-c:a", "aac"])
            else:
                cmd.extend(["-c", "copy"])

            cmd.append(str(output_path))

            result = await asyncio.get_event_loop().run_in_executor(
                None, lambda: subprocess.run(cmd, capture_output=True, text=True, timeout=900)
            )

            # Cleanup
            for tf in temp_files:
                tf.unlink(missing_ok=True)
            concat_file.unlink(missing_ok=True)

            if result.returncode != 0:
                raise RuntimeError(result.stderr[-300:] if result.stderr else "合并失败")

            self._jobs[job_id] = {"status": "completed", "progress": 100}
            return {
                "job_id": job_id,
                "status": "completed",
                "output_filename": output_path.name,
                "output_size": output_path.stat().st_size,
                "message": f"导出完成 ({len(clips)} 段来自 {len(set(c['file_path'] for c in clips))} 个视频)",
            }
        except Exception as e:
            self._jobs[job_id] = {"status": "failed", "error": str(e)}
            raise ValueError(f"多源导出失败: {str(e)}")
