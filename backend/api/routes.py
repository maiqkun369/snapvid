"""API routes for ytdlp-web."""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect, Request
from fastapi.responses import FileResponse, StreamingResponse

from api.schemas import (
    BatchDownloadRequest,
    BatchInfoItem,
    BatchInfoRequest,
    CookieStatusResponse,
    CookieUploadRequest,
    DownloadRequest,
    DownloadResponse,
    DownloadTask,
    ErrorResponse,
    LoginRequest,
    LoginResponse,
    SendCodeRequest,
    UserInfo,
    VideoInfoRequest,
    VideoInfoResponse,
)
from services.downloader import DownloaderService
from services.auth import AuthService
from services.cloud_sync import CloudSyncService
from services.ai_tools import AIToolsService
from services.media_tools import MediaToolsService
from services.referral import ReferralService
from services.scheduler import SchedulerService
from services.editor import EditorService

logger = logging.getLogger(__name__)

router = APIRouter()
downloader_service = DownloaderService()
auth_service = AuthService()
cloud_sync_service = CloudSyncService()
ai_tools_service = AIToolsService()
media_tools_service = MediaToolsService()
referral_service = ReferralService()
scheduler_service = SchedulerService()
editor_service = EditorService()
auth_service = AuthService()
cloud_sync_service = CloudSyncService()
ai_tools_service = AIToolsService()


@router.post(
    "/info",
    response_model=VideoInfoResponse,
    responses={400: {"model": ErrorResponse}, 500: {"model": ErrorResponse}},
)
async def get_video_info(request: VideoInfoRequest) -> VideoInfoResponse:
    """Extract video information from URL."""
    try:
        info = await downloader_service.get_video_info(request.url, request.platform_cookie)
        return info
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to get video info: {e}")
        raise HTTPException(status_code=500, detail=f"获取视频信息失败: {str(e)}")


@router.post(
    "/download",
    response_model=DownloadResponse,
    responses={400: {"model": ErrorResponse}, 500: {"model": ErrorResponse}},
)
async def start_download(request: DownloadRequest, token: str = "") -> DownloadResponse:
    """Start a download task. Requires login for quota tracking."""
    # Check permission
    perm = auth_service.check_download_permission(token or None)
    if not perm.get("allowed"):
        raise HTTPException(status_code=403, detail=perm.get("message", "下载次数已用完，请升级 Pro"))

    # Determine owner
    owner = "anonymous"
    if token:
        payload = auth_service._verify_token(token)
        if payload:
            owner = payload.get("phone", "anonymous")

    try:
        task_id = await downloader_service.start_download(request, owner=owner)
        # Record download for quota
        auth_service.record_download(token or None)
        return DownloadResponse(task_id=task_id, message="下载任务已创建")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to start download: {e}")
        raise HTTPException(status_code=500, detail=f"创建下载任务失败: {str(e)}")


@router.get("/downloads", response_model=list[DownloadTask])
async def get_download_history(token: str = "", page: int = 1, limit: int = 50) -> list[DownloadTask]:
    """Get download tasks for current user with pagination."""
    owner = "anonymous"
    if token:
        payload = auth_service._verify_token(token)
        if payload:
            owner = payload.get("phone", "anonymous")
    tasks = downloader_service.get_tasks_by_owner(owner)
    start = (page - 1) * limit
    return tasks[start:start + limit]


@router.get("/tasks/active", response_model=list[DownloadTask])
async def get_active_tasks(token: str = "") -> list[DownloadTask]:
    """Get currently active (downloading/pending) tasks for current user."""
    owner = "anonymous"
    if token:
        payload = auth_service._verify_token(token)
        if payload:
            owner = payload.get("phone", "anonymous")
    return downloader_service.get_active_tasks(owner)


@router.post("/tasks/{task_id}/cancel")
async def cancel_task(task_id: str) -> dict[str, str]:
    """Cancel a running download task."""
    success = downloader_service.cancel_task(task_id)
    if not success:
        raise HTTPException(status_code=404, detail="任务不存在或已完成")
    return {"message": "已取消"}


@router.get("/user/stats")
async def get_user_stats(token: str = "") -> dict:
    """Get user statistics: downloads today, plan info, etc."""
    if not token:
        return {"plan": "none", "downloads_today": 0, "downloads_total": 0}
    payload = auth_service._verify_token(token)
    if not payload:
        return {"plan": "none", "downloads_today": 0, "downloads_total": 0}
    phone = payload["phone"]
    stats = auth_service.get_user_stats(phone)

    # Override with real task counts from memory (more accurate)
    all_tasks = downloader_service.get_tasks_by_owner(phone)
    from datetime import datetime, timezone
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    today_count = sum(1 for t in all_tasks if t.created_at and t.created_at.startswith(today))
    stats["downloads_today"] = today_count
    stats["downloads_total"] = len(all_tasks)
    return stats


@router.get("/downloads/{task_id}/file")
async def download_file(task_id: str) -> FileResponse:
    """Download a completed file."""
    task = downloader_service.get_task(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="下载任务不存在")

    if task.status != "completed":
        raise HTTPException(status_code=400, detail="文件尚未下载完成")

    downloads_dir = downloader_service.get_downloads_dir()

    # Try exact filename first
    if task.filename:
        file_path = downloads_dir / task.filename
        if file_path.exists():
            return FileResponse(
                path=str(file_path),
                filename=task.filename,
                media_type="application/octet-stream",
            )

    # Fallback: scan for any file starting with task_id
    for f in downloads_dir.iterdir():
        if f.name.startswith(task_id) and f.is_file():
            return FileResponse(
                path=str(f),
                filename=f.name,
                media_type="application/octet-stream",
            )

    raise HTTPException(status_code=404, detail="文件不存在")


@router.delete("/downloads/{task_id}")
async def delete_download(task_id: str) -> dict[str, str]:
    """Delete a download task and its file."""
    success = downloader_service.delete_task(task_id)
    if not success:
        raise HTTPException(status_code=404, detail="下载任务不存在")
    return {"message": "已删除"}


@router.get("/comments/{task_id}")
async def get_comments(task_id: str) -> dict:
    """Get exported comments for a download task."""
    task = downloader_service.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="下载任务不存在")
    comments = downloader_service.get_comments(task_id)
    return {"task_id": task_id, "count": len(comments), "comments": comments[:200]}


# Cookie management endpoints
@router.post("/cookies")
async def upload_cookies(request: CookieUploadRequest) -> dict[str, str]:
    """Upload cookies for a platform."""
    try:
        downloader_service.save_cookies(request.platform, request.cookies_text)
        return {"message": f"{request.platform} cookies 已保存"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/cookies", response_model=list[CookieStatusResponse])
async def get_cookies_status() -> list[CookieStatusResponse]:
    """Get cookies status for all platforms."""
    return downloader_service.get_cookies_status()


@router.delete("/cookies/{platform}")
async def delete_cookies(platform: str) -> dict[str, str]:
    """Delete cookies for a platform."""
    downloader_service.delete_cookies(platform)
    return {"message": f"{platform} cookies 已删除"}


@router.post("/cookies/auto-extract")
async def auto_extract_cookies(platform: str = "douyin") -> dict:
    """Auto-extract cookies from the server-side browser (if available).
    This uses yt-dlp's browser cookie extraction as fallback.
    """
    import subprocess
    import tempfile

    # Try using yt-dlp to extract cookies from available browsers
    browsers = ["chrome", "chromium", "firefox", "edge", "safari"]
    for browser in browsers:
        try:
            with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
                tmp_path = f.name

            result = subprocess.run(
                ["yt-dlp", "--cookies-from-browser", browser, "--cookies", tmp_path,
                 "--skip-download", "--print", "title", "https://www.douyin.com/"],
                capture_output=True, text=True, timeout=15
            )

            from pathlib import Path
            tmp = Path(tmp_path)
            if tmp.exists() and tmp.stat().st_size > 100:
                cookies_text = tmp.read_text()
                downloader_service.save_cookies(platform, cookies_text)
                tmp.unlink(missing_ok=True)
                return {"success": True, "browser": browser, "message": f"已从 {browser} 提取 Cookies"}
            tmp.unlink(missing_ok=True)
        except Exception:
            continue

    return {"success": False, "message": "无法自动提取 Cookies（Docker 容器内无浏览器）。请使用下方的终端命令方式。"}


# === Batch Operations ===

@router.post("/batch-info", response_model=list[BatchInfoItem])
async def batch_get_info(request: BatchInfoRequest) -> list[BatchInfoItem]:
    """Batch extract video info for multiple URLs (max 10)."""
    urls = request.urls[:10]  # Cap at 10
    results = []
    for url in urls:
        try:
            info = await downloader_service.get_video_info(url)
            results.append(BatchInfoItem(
                url=url,
                success=True,
                title=info.title,
                platform=info.platform,
                duration_string=info.duration_string,
                thumbnail=info.thumbnail,
            ))
        except Exception as e:
            results.append(BatchInfoItem(url=url, success=False, error=str(e)))
    return results


@router.post("/batch-download")
async def batch_download(request: BatchDownloadRequest, token: str = "") -> list[DownloadResponse]:
    """Batch start downloads for multiple URLs (max 10)."""
    # Determine owner from token
    owner = "anonymous"
    if token:
        payload = auth_service._verify_token(token)
        if payload:
            owner = payload.get("phone", "anonymous")

    urls = request.urls[:10]
    results = []
    for url in urls:
        try:
            dl_request = DownloadRequest(
                url=url,
                audio_only=request.audio_only,
                format_id=request.format_id,
            )
            task_id = await downloader_service.start_download(dl_request, owner=owner)
            results.append(DownloadResponse(task_id=task_id, message="已创建"))
        except Exception as e:
            results.append(DownloadResponse(task_id="", message=str(e)))
    return results


# === Auth Endpoints ===

@router.post("/auth/send-code")
async def send_code(request: SendCodeRequest) -> dict[str, str]:
    """Send SMS verification code (simulated)."""
    try:
        msg = auth_service.send_code(request.phone)
        return {"message": msg}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/auth/login", response_model=LoginResponse)
async def login(request: LoginRequest) -> LoginResponse:
    """Login with phone + verification code."""
    try:
        result = auth_service.login(request.phone, request.code)
        return LoginResponse(
            token=result["token"],
            user=UserInfo(**result["user"]),
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/auth/me", response_model=UserInfo)
async def get_me(authorization: str = "") -> UserInfo:
    """Get current user info from token."""
    from fastapi import Header
    # Token from query param or will be sent via header
    token = authorization.replace("Bearer ", "") if authorization else ""
    if not token:
        raise HTTPException(status_code=401, detail="请先登录")
    info = auth_service.get_user_info(token)
    if not info:
        raise HTTPException(status_code=401, detail="登录已过期，请重新登录")
    return UserInfo(**info)


@router.get("/auth/check-permission")
async def check_permission(token: str = "") -> dict:
    """Check download permission for current user."""
    return auth_service.check_download_permission(token or None)


# === Cloud Sync Endpoints ===

@router.get("/cloud/status")
async def cloud_status(phone: str = "") -> dict:
    """Get cloud sync status."""
    return cloud_sync_service.get_status(phone)


@router.get("/cloud/auth-url")
async def cloud_auth_url(phone: str = "") -> dict:
    """Get Baidu NetDisk OAuth URL."""
    url = cloud_sync_service.get_auth_url(phone)
    if not url:
        return {"url": "", "message": "百度网盘 API 尚未配置（需设置 BAIDU_APP_KEY 环境变量）", "configured": False}
    return {"url": url, "configured": True}


@router.post("/cloud/connect")
async def cloud_connect(phone: str = "", code: str = "") -> dict:
    """Exchange OAuth code for token."""
    try:
        return cloud_sync_service.exchange_code(phone, code)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/cloud/upload")
async def cloud_upload(task_id: str = "", phone: str = "") -> dict:
    """Upload a downloaded file to cloud."""
    task = downloader_service.get_task(task_id)
    if not task or not task.filename:
        raise HTTPException(status_code=404, detail="下载任务不存在或文件未完成")

    file_path = str(downloader_service.get_downloads_dir() / task.filename)
    try:
        result = cloud_sync_service.upload_file(phone, file_path)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# === AI Tools Endpoints ===

@router.get("/ai/capabilities")
async def ai_capabilities() -> list[dict]:
    """Get available AI tool capabilities."""
    return ai_tools_service.get_capabilities()


@router.post("/ai/subtitle")
async def ai_subtitle(task_id: str = "", language: str = "auto", format: str = "srt") -> dict:
    """Generate subtitles for a downloaded video."""
    task = downloader_service.get_task(task_id)
    if not task or not task.filename:
        raise HTTPException(status_code=404, detail="下载任务不存在或文件未完成")

    file_path = str(downloader_service.get_downloads_dir() / task.filename)
    try:
        result = await ai_tools_service.generate_subtitles(file_path, language, format)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/ai/super-resolution")
async def ai_super_resolution(task_id: str = "", scale: str = "2x") -> dict:
    """Enhance video resolution."""
    task = downloader_service.get_task(task_id)
    if not task or not task.filename:
        raise HTTPException(status_code=404, detail="下载任务不存在或文件未完成")

    file_path = str(downloader_service.get_downloads_dir() / task.filename)
    try:
        result = await ai_tools_service.super_resolution(file_path, scale)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/ai/watermark-removal")
async def ai_watermark_removal(task_id: str = "") -> dict:
    """Remove watermark from video."""
    task = downloader_service.get_task(task_id)
    if not task or not task.filename:
        raise HTTPException(status_code=404, detail="下载任务不存在或文件未完成")

    file_path = str(downloader_service.get_downloads_dir() / task.filename)
    try:
        result = await ai_tools_service.remove_watermark(file_path)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.websocket("/ws/progress/{task_id}")
async def websocket_progress(websocket: WebSocket, task_id: str) -> None:
    """WebSocket endpoint for real-time download progress."""
    await websocket.accept()
    try:
        await downloader_service.subscribe_progress(websocket, task_id)
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for task {task_id}")
    except Exception as e:
        logger.error(f"WebSocket error for task {task_id}: {e}")
    finally:
        downloader_service.unsubscribe_progress(task_id)


# === Media Tools Endpoints (FFmpeg-based) ===

@router.post("/tools/convert")
async def tools_convert(task_id: str = "", target_format: str = "mp4") -> dict:
    """Convert video/audio format."""
    task = downloader_service.get_task(task_id)
    if not task or not task.filename:
        raise HTTPException(status_code=404, detail="下载任务不存在或文件未完成")
    file_path = str(downloader_service.get_downloads_dir() / task.filename)
    try:
        return await media_tools_service.convert_format(file_path, target_format)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/tools/audio-extract")
async def tools_audio_extract(task_id: str = "", audio_format: str = "mp3", quality: str = "192") -> dict:
    """Extract audio from video."""
    task = downloader_service.get_task(task_id)
    if not task or not task.filename:
        raise HTTPException(status_code=404, detail="下载任务不存在或文件未完成")
    file_path = str(downloader_service.get_downloads_dir() / task.filename)
    try:
        return await media_tools_service.extract_audio(file_path, audio_format, quality)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/tools/thumbnail")
async def tools_thumbnail(task_id: str = "", time_pos: str = "00:00:01") -> dict:
    """Extract video thumbnail/cover."""
    task = downloader_service.get_task(task_id)
    if not task or not task.filename:
        raise HTTPException(status_code=404, detail="下载任务不存在或文件未完成")
    file_path = str(downloader_service.get_downloads_dir() / task.filename)
    try:
        return await media_tools_service.extract_thumbnail(file_path, time_pos)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/tools/compress")
async def tools_compress(task_id: str = "", quality: str = "medium") -> dict:
    """Compress video (reduce file size)."""
    task = downloader_service.get_task(task_id)
    if not task or not task.filename:
        raise HTTPException(status_code=404, detail="下载任务不存在或文件未完成")
    file_path = str(downloader_service.get_downloads_dir() / task.filename)
    crf_map = {"low": 32, "medium": 28, "high": 23}
    crf = crf_map.get(quality, 28)
    try:
        return await media_tools_service.compress_video(file_path, crf=crf)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/tools/merge")
async def tools_merge(task_ids: str = "") -> dict:
    """Merge multiple videos into one. Pass comma-separated task IDs."""
    if not task_ids:
        raise HTTPException(status_code=400, detail="请提供要合并的视频任务ID")
    ids = [tid.strip() for tid in task_ids.split(",") if tid.strip()]
    file_paths = []
    for tid in ids:
        task = downloader_service.get_task(tid)
        if not task or not task.filename:
            raise HTTPException(status_code=404, detail=f"任务 {tid} 不存在或未完成")
        file_paths.append(str(downloader_service.get_downloads_dir() / task.filename))
    try:
        return await media_tools_service.merge_videos(file_paths)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/tools/download/{filename}")
async def tools_download_file(filename: str):
    """Download a processed file from the tools output."""
    downloads_dir = downloader_service.get_downloads_dir()
    file_path = downloads_dir / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="文件不存在")
    return FileResponse(
        path=str(file_path),
        filename=filename,
        media_type="application/octet-stream",
    )


@router.get("/tools/preview/{filename}")
async def tools_preview_file(filename: str):
    """Preview an image file (for thumbnails)."""
    downloads_dir = downloader_service.get_downloads_dir()
    file_path = downloads_dir / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="文件不存在")
    # Determine media type
    ext = file_path.suffix.lower()
    media_types = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif"}
    media_type = media_types.get(ext, "application/octet-stream")
    return FileResponse(path=str(file_path), media_type=media_type)


@router.post("/tools/gif")
async def tools_video_to_gif(task_id: str = "", start: str = "00:00:00", duration: str = "5", fps: int = 15, width: int = 480) -> dict:
    """Convert video segment to GIF."""
    task = downloader_service.get_task(task_id)
    if not task or not task.filename:
        raise HTTPException(status_code=404, detail="下载任务不存在或文件未完成")
    file_path = str(downloader_service.get_downloads_dir() / task.filename)
    try:
        return await media_tools_service.video_to_gif(file_path, start, duration, fps, width)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/tools/watermark")
async def tools_add_watermark(task_id: str = "", text: str = "SnapVid", position: str = "bottomright") -> dict:
    """Add text watermark to video."""
    task = downloader_service.get_task(task_id)
    if not task or not task.filename:
        raise HTTPException(status_code=404, detail="下载任务不存在或文件未完成")
    file_path = str(downloader_service.get_downloads_dir() / task.filename)
    try:
        return await media_tools_service.add_watermark(file_path, text, position)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/tools/denoise")
async def tools_denoise_audio(task_id: str = "") -> dict:
    """Remove background noise from audio."""
    task = downloader_service.get_task(task_id)
    if not task or not task.filename:
        raise HTTPException(status_code=404, detail="下载任务不存在或文件未完成")
    file_path = str(downloader_service.get_downloads_dir() / task.filename)
    try:
        return await media_tools_service.denoise_audio(file_path)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/tools/summary")
async def tools_video_summary(task_id: str = "") -> dict:
    """Generate video summary/info."""
    task = downloader_service.get_task(task_id)
    if not task or not task.filename:
        raise HTTPException(status_code=404, detail="下载任务不存在或文件未完成")
    file_path = str(downloader_service.get_downloads_dir() / task.filename)
    try:
        return await media_tools_service.video_summary(file_path)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# === Referral/Invite System ===

@router.get("/invite/code")
async def get_invite_code(token: str = "") -> dict:
    """Generate or get invite code for current user."""
    if not token:
        raise HTTPException(status_code=401, detail="请先登录")
    payload = auth_service._verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="登录已过期")
    phone = payload["phone"]
    return referral_service.generate_invite_code(phone)


@router.post("/invite/use")
async def use_invite_code(token: str = "", code: str = "") -> dict:
    """Use an invite code to get Pro days."""
    if not token:
        raise HTTPException(status_code=401, detail="请先登录")
    payload = auth_service._verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="登录已过期")
    phone = payload["phone"]
    try:
        return referral_service.use_invite_code(phone, code)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/invite/stats")
async def get_invite_stats(token: str = "") -> dict:
    """Get invite statistics."""
    if not token:
        raise HTTPException(status_code=401, detail="请先登录")
    payload = auth_service._verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="登录已过期")
    phone = payload["phone"]
    return referral_service.get_invite_stats(phone)


# === Scheduled Downloads ===

@router.post("/schedule")
async def schedule_download(token: str = "", url: str = "", scheduled_at: str = "") -> dict:
    """Schedule a download for later."""
    if not token:
        raise HTTPException(status_code=401, detail="请先登录")
    payload = auth_service._verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="登录已过期")
    if not url or not scheduled_at:
        raise HTTPException(status_code=400, detail="请提供URL和定时时间")
    phone = payload["phone"]
    return scheduler_service.schedule_download(phone, url, scheduled_at)


@router.get("/schedule")
async def get_scheduled_downloads(token: str = "") -> list[dict]:
    """Get scheduled downloads."""
    if not token:
        raise HTTPException(status_code=401, detail="请先登录")
    payload = auth_service._verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="登录已过期")
    phone = payload["phone"]
    return scheduler_service.get_scheduled(phone)


@router.delete("/schedule/{schedule_id}")
async def cancel_scheduled_download(schedule_id: str) -> dict:
    """Cancel a scheduled download."""
    success = scheduler_service.cancel_scheduled(schedule_id)
    if not success:
        raise HTTPException(status_code=404, detail="定时任务不存在或已执行")
    return {"message": "已取消"}


# === Video Editor ===

@router.post("/editor/thumbnails")
async def editor_thumbnails(task_id: str = "", count: int = 20) -> dict:
    """Generate timeline thumbnail strip for a video."""
    task = downloader_service.get_task(task_id)
    if not task or not task.filename:
        raise HTTPException(status_code=404, detail="下载任务不存在或文件未完成")
    file_path = str(downloader_service.get_downloads_dir() / task.filename)
    try:
        return await editor_service.generate_thumbnails(file_path, count)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/editor/export")
async def editor_export(task_id: str = "", edit_plan: str = "{}") -> dict:
    """Export edited video based on edit plan JSON."""
    task = downloader_service.get_task(task_id)
    if not task or not task.filename:
        raise HTTPException(status_code=404, detail="下载任务不存在或文件未完成")
    file_path = str(downloader_service.get_downloads_dir() / task.filename)
    import json as _json
    try:
        plan = _json.loads(edit_plan)
    except _json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="编辑方案格式错误")
    try:
        return await editor_service.export_edit(file_path, plan)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/editor/stream/{task_id}")
async def editor_stream_video(task_id: str, request: Request):
    """Stream video file with Range support for in-browser playback."""
    task = downloader_service.get_task(task_id)
    if not task or not task.filename:
        raise HTTPException(status_code=404, detail="文件不存在")
    downloads_dir = downloader_service.get_downloads_dir()
    file_path = downloads_dir / task.filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="文件不存在")

    ext = file_path.suffix.lower()
    mt = {".mp4": "video/mp4", ".webm": "video/webm", ".mkv": "video/x-matroska", ".mov": "video/quicktime"}
    media_type = mt.get(ext, "video/mp4")
    file_size = file_path.stat().st_size

    # Handle Range request for video seeking
    range_header = request.headers.get("range")
    if range_header:
        # Parse "bytes=start-end"
        range_val = range_header.strip().split("=")[1]
        range_parts = range_val.split("-")
        start = int(range_parts[0])
        end = int(range_parts[1]) if range_parts[1] else file_size - 1
        end = min(end, file_size - 1)
        chunk_size = end - start + 1

        def iter_file():
            with open(file_path, "rb") as f:
                f.seek(start)
                remaining = chunk_size
                while remaining > 0:
                    read_size = min(1024 * 1024, remaining)
                    data = f.read(read_size)
                    if not data:
                        break
                    remaining -= len(data)
                    yield data

        return StreamingResponse(
            iter_file(),
            status_code=206,
            media_type=media_type,
            headers={
                "Content-Range": f"bytes {start}-{end}/{file_size}",
                "Accept-Ranges": "bytes",
                "Content-Length": str(chunk_size),
            },
        )

    # Full file response with Accept-Ranges header
    return FileResponse(
        path=str(file_path),
        media_type=media_type,
        headers={"Accept-Ranges": "bytes"},
    )

