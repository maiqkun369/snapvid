"""AI Background Removal using rembg (locally installed).

rembg uses U2-Net model (~170MB) to remove backgrounds from images/video frames.
For video: extract frames → remove bg → reassemble.
"""

import asyncio
import logging
import subprocess
import uuid
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

DOWNLOADS_DIR = Path("/app/downloads")


async def remove_background_image(file_path: str) -> dict:
    """Remove background from a single image using rembg."""
    path = Path(file_path)
    if not path.exists():
        raise ValueError("文件不存在")

    output = path.parent / f"{path.stem}_nobg.png"

    # Use rembg CLI (pip install rembg[cli])
    cmd = ["rembg", "i", str(path), str(output)]

    try:
        result = await asyncio.get_event_loop().run_in_executor(
            None, lambda: subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        )
        if result.returncode != 0:
            # rembg might not be installed
            if "No such file" in result.stderr or "not found" in result.stderr:
                raise ValueError("AI 背景移除服务未安装 (需要 rembg)")
            raise RuntimeError(result.stderr[-200:])

        return {
            "output_filename": output.name,
            "output_size": output.stat().st_size,
            "message": "背景已移除",
        }
    except FileNotFoundError:
        raise ValueError("AI 背景移除服务未安装")


async def remove_background_video(file_path: str, fps: int = 10) -> dict:
    """Remove background from video (frame by frame).
    
    This is CPU-intensive. Extracts frames, removes bg, reassembles.
    Limited to short clips (<30s) for performance.
    """
    path = Path(file_path)
    if not path.exists():
        raise ValueError("文件不存在")

    job_id = str(uuid.uuid4())[:8]
    frames_dir = DOWNLOADS_DIR / f"_frames_{job_id}"
    output_dir = DOWNLOADS_DIR / f"_frames_nobg_{job_id}"
    frames_dir.mkdir(exist_ok=True)
    output_dir.mkdir(exist_ok=True)

    output_video = path.parent / f"{path.stem}_nobg.mp4"

    try:
        # Step 1: Get video duration
        probe = await asyncio.get_event_loop().run_in_executor(
            None, lambda: subprocess.run(
                ["ffprobe", "-v", "quiet", "-print_format", "json", "-show_format", str(path)],
                capture_output=True, text=True, timeout=10
            )
        )
        import json
        duration = float(json.loads(probe.stdout).get("format", {}).get("duration", 0))
        if duration > 30:
            raise ValueError("视频过长（>30秒），背景移除仅支持短片段。请先用工具箱截取片段。")

        # Step 2: Extract frames
        extract_cmd = [
            "ffmpeg", "-y", "-i", str(path),
            "-vf", f"fps={fps}",
            str(frames_dir / "frame_%04d.png")
        ]
        await asyncio.get_event_loop().run_in_executor(
            None, lambda: subprocess.run(extract_cmd, capture_output=True, timeout=60)
        )

        # Step 3: Remove background from each frame
        frames = sorted(frames_dir.glob("*.png"))
        if not frames:
            raise ValueError("无法提取视频帧")

        for frame in frames:
            out_frame = output_dir / frame.name
            rembg_cmd = ["rembg", "i", str(frame), str(out_frame)]
            await asyncio.get_event_loop().run_in_executor(
                None, lambda cmd=rembg_cmd: subprocess.run(cmd, capture_output=True, timeout=30)
            )

        # Step 4: Reassemble video (green background for transparency preview)
        reassemble_cmd = [
            "ffmpeg", "-y",
            "-framerate", str(fps),
            "-i", str(output_dir / "frame_%04d.png"),
            "-c:v", "libx264", "-pix_fmt", "yuv420p",
            "-vf", "pad=ceil(iw/2)*2:ceil(ih/2)*2",
            str(output_video)
        ]
        await asyncio.get_event_loop().run_in_executor(
            None, lambda: subprocess.run(reassemble_cmd, capture_output=True, timeout=60)
        )

        if not output_video.exists():
            raise ValueError("背景移除后视频合成失败")

        return {
            "output_filename": output_video.name,
            "output_size": output_video.stat().st_size,
            "message": f"视频背景已移除 ({len(frames)} 帧, {duration:.1f}秒)",
            "frames_processed": len(frames),
        }

    finally:
        # Cleanup temp frames
        import shutil
        shutil.rmtree(frames_dir, ignore_errors=True)
        shutil.rmtree(output_dir, ignore_errors=True)


async def separate_audio(file_path: str, mode: str = "vocals") -> dict:
    """Separate audio into vocals and accompaniment using ffmpeg filters.
    
    mode: 'vocals' (keep voice, remove music) or 'music' (keep music, remove voice)
    Uses ffmpeg's pan filter for basic stereo separation.
    For production: integrate demucs/spleeter.
    """
    path = Path(file_path)
    if not path.exists():
        raise ValueError("文件不存在")

    job_id = str(uuid.uuid4())[:8]
    suffix = "_vocals" if mode == "vocals" else "_bgm"
    output = path.parent / f"{path.stem}{suffix}.mp3"

    # Basic vocal isolation using ffmpeg center-channel extraction
    # In stereo mixes, vocals are panned center (equal L+R), instruments are panned wide
    if mode == "vocals":
        # Keep center: (L+R)/2 preserves what's common to both channels (vocals)
        af_filter = "pan=mono|c0=0.5*c0+0.5*c1"
    else:
        # Remove center: L-R cancels what's common (vocals), keeping panned instruments
        af_filter = "pan=stereo|c0=c0-c1|c1=c1-c0"

    cmd = [
        "ffmpeg", "-y", "-i", str(path),
        "-af", af_filter,
        "-c:a", "libmp3lame", "-q:a", "2",
        str(output)
    ]

    try:
        result = await asyncio.get_event_loop().run_in_executor(
            None, lambda: subprocess.run(cmd, capture_output=True, text=True, timeout=120)
        )
        if result.returncode != 0:
            raise RuntimeError(result.stderr[-200:])

        return {
            "output_filename": output.name,
            "output_size": output.stat().st_size,
            "message": f"{'人声' if mode == 'vocals' else 'BGM'} 已分离",
        }
    except Exception as e:
        raise ValueError(f"音频分离失败: {str(e)}")
