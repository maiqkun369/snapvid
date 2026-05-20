"""API routes for ytdlp-web."""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse

from api.schemas import (
    DownloadRequest,
    DownloadResponse,
    DownloadTask,
    ErrorResponse,
    VideoInfoRequest,
    VideoInfoResponse,
)
from services.downloader import DownloaderService

logger = logging.getLogger(__name__)

router = APIRouter()
downloader_service = DownloaderService()


@router.post(
    "/info",
    response_model=VideoInfoResponse,
    responses={400: {"model": ErrorResponse}, 500: {"model": ErrorResponse}},
)
async def get_video_info(request: VideoInfoRequest) -> VideoInfoResponse:
    """Extract video information from URL."""
    try:
        info = await downloader_service.get_video_info(request.url)
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
