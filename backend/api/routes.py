"""API routes for ytdlp-web."""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse

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

logger = logging.getLogger(__name__)

router = APIRouter()
downloader_service = DownloaderService()
auth_service = AuthService()


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
async def start_download(request: DownloadRequest) -> DownloadResponse:
    """Start a download task."""
    try:
        task_id = await downloader_service.start_download(request)
        return DownloadResponse(task_id=task_id, message="下载任务已创建")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to start download: {e}")
        raise HTTPException(status_code=500, detail=f"创建下载任务失败: {str(e)}")


@router.get("/downloads", response_model=list[DownloadTask])
async def get_download_history() -> list[DownloadTask]:
    """Get all download tasks."""
    return downloader_service.get_all_tasks()


@router.get("/downloads/{task_id}/file")
async def download_file(task_id: str) -> FileResponse:
    """Download a completed file."""
    task = downloader_service.get_task(task_id)
    if task is None:
        raise HTTPException(status_code=404, detail="下载任务不存在")

    if task.status != "completed":
        raise HTTPException(status_code=400, detail="文件尚未下载完成")

    file_path = downloader_service.get_downloads_dir() / task.filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="文件不存在")

    return FileResponse(
        path=str(file_path),
        filename=task.filename,
        media_type="application/octet-stream",
    )


@router.delete("/downloads/{task_id}")
async def delete_download(task_id: str) -> dict[str, str]:
    """Delete a download task and its file."""
    success = downloader_service.delete_task(task_id)
    if not success:
        raise HTTPException(status_code=404, detail="下载任务不存在")
    return {"message": "已删除"}


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
async def batch_download(request: BatchDownloadRequest) -> list[DownloadResponse]:
    """Batch start downloads for multiple URLs (max 10)."""
    urls = request.urls[:10]
    results = []
    for url in urls:
        try:
            dl_request = DownloadRequest(
                url=url,
                audio_only=request.audio_only,
                format_id=request.format_id,
            )
            task_id = await downloader_service.start_download(dl_request)
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
