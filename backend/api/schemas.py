"""Pydantic schemas for API request/response models."""

from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class VideoInfoRequest(BaseModel):
    """Request model for video info extraction."""

    url: str = Field(..., description="Video URL to extract info from")


class VideoFormat(BaseModel):
    """Video format information."""

    format_id: str = Field(default="", description="Format identifier")
    format_note: str = Field(default="", description="Format description")
    ext: str = Field(default="", description="File extension")
    resolution: str = Field(default="", description="Video resolution")
    filesize: Optional[int] = Field(default=None, description="File size in bytes")
    vcodec: str = Field(default="none", description="Video codec")
    acodec: str = Field(default="none", description="Audio codec")
    tbr: Optional[float] = Field(default=None, description="Total bitrate")


class VideoInfoResponse(BaseModel):
    """Response model for video info."""

    title: str = Field(default="", description="Video title")
    duration: Optional[int] = Field(default=None, description="Duration in seconds")
    duration_string: str = Field(default="", description="Human-readable duration")
    thumbnail: str = Field(default="", description="Thumbnail URL")
    uploader: str = Field(default="", description="Uploader name")
    platform: str = Field(default="", description="Platform name")
    formats: list[VideoFormat] = Field(default_factory=list, description="Available formats")
    subtitles: list[str] = Field(default_factory=list, description="Available subtitle languages")


class DownloadRequest(BaseModel):
    """Request model for starting a download."""

    url: str = Field(..., description="Video URL to download")
    format_id: str = Field(default="best", description="Format ID to download")
    audio_only: bool = Field(default=False, description="Download audio only as MP3")
    subtitles: Optional[str] = Field(default=None, description="Subtitle language code")
    playlist: bool = Field(default=False, description="Download entire playlist")
    rate_limit: Optional[float] = Field(
        default=None, description="Rate limit in MB/s"
    )


class DownloadStatus(str, Enum):
    """Download task status."""

    PENDING = "pending"
    DOWNLOADING = "downloading"
    COMPLETED = "completed"
    FAILED = "failed"


class DownloadTask(BaseModel):
    """Download task information."""

    id: str = Field(default="", description="Task UUID")
    url: str = Field(default="", description="Original URL")
    title: str = Field(default="", description="Video title")
    status: DownloadStatus = Field(default=DownloadStatus.PENDING)
    progress: float = Field(default=0.0, description="Download progress 0-100")
    speed: str = Field(default="", description="Download speed")
    eta: str = Field(default="", description="Estimated time remaining")
    filename: str = Field(default="", description="Downloaded file name")
    filesize: Optional[int] = Field(default=None, description="File size in bytes")
    error: str = Field(default="", description="Error message if failed")
    created_at: str = Field(default="", description="Task creation time")


class DownloadResponse(BaseModel):
    """Response model for download initiation."""

    task_id: str = Field(default="", description="Task UUID for tracking")
    message: str = Field(default="", description="Status message")


class ErrorResponse(BaseModel):
    """Error response model."""

    detail: str = Field(default="", description="Error detail message")
