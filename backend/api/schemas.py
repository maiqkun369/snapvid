"""Pydantic schemas for API request/response models."""

from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class VideoInfoRequest(BaseModel):
    """Request model for video info extraction."""

    url: str = Field(..., description="Video URL to extract info from")
    platform_cookie: Optional[str] = Field(default=None, description="Platform name for cookie auth")


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
    duration: Optional[float] = Field(default=None, description="Duration in seconds")
    duration_string: str = Field(default="", description="Human-readable duration")
    thumbnail: str = Field(default="", description="Thumbnail URL")
    uploader: str = Field(default="", description="Uploader name")
    platform: str = Field(default="", description="Platform name")
    formats: list[VideoFormat] = Field(default_factory=list, description="Available formats")
    subtitles: list[str] = Field(default_factory=list, description="Available subtitle languages")
    chapters: Optional[list[dict]] = Field(default=None, description="Video chapters")
    requires_auth: bool = Field(default=False, description="Whether platform requires auth")


class DownloadRequest(BaseModel):
    """Request model for starting a download."""

    url: str = Field(..., description="Video URL to download")
    format_id: str = Field(default="best", description="Format ID to download")
    audio_only: bool = Field(default=False, description="Download audio only as MP3")
    audio_format: str = Field(default="mp3", description="Audio format: mp3, m4a, wav, flac")
    audio_quality: str = Field(default="192", description="Audio quality: 128, 192, 256, 320")
    subtitles: Optional[str] = Field(default=None, description="Subtitle language code")
    embed_subtitles: bool = Field(default=False, description="Embed subtitles into video")
    playlist: bool = Field(default=False, description="Download entire playlist")
    playlist_range: Optional[str] = Field(default=None, description="Playlist range e.g. 1:5")
    rate_limit: Optional[float] = Field(default=None, description="Rate limit in MB/s")
    embed_thumbnail: bool = Field(default=False, description="Embed thumbnail in file")
    embed_metadata: bool = Field(default=True, description="Embed metadata in file")
    split_chapters: bool = Field(default=False, description="Split video by chapters")
    sponsor_block: bool = Field(default=False, description="Remove sponsor segments (YouTube)")
    proxy: Optional[str] = Field(default=None, description="Proxy URL")
    output_format: str = Field(default="mp4", description="Preferred output container: mp4, mkv, webm")


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


class CookieUploadRequest(BaseModel):
    """Request model for cookie upload."""

    platform: str = Field(..., description="Platform name: youtube, youku, tencent, etc.")
    cookies_text: str = Field(..., description="Cookies in Netscape format")


class CookieStatusResponse(BaseModel):
    """Response for cookie status check."""

    platform: str = Field(default="")
    has_cookies: bool = Field(default=False)
    expires_hint: str = Field(default="")


# === Batch Operations ===

class BatchInfoRequest(BaseModel):
    """Request for batch video info extraction."""

    urls: list[str] = Field(..., description="List of video URLs (max 10)")


class BatchInfoItem(BaseModel):
    """Single item result in batch info response."""

    url: str = Field(default="")
    success: bool = Field(default=False)
    title: str = Field(default="")
    platform: str = Field(default="")
    duration_string: str = Field(default="")
    thumbnail: str = Field(default="")
    error: str = Field(default="")


class BatchDownloadRequest(BaseModel):
    """Request for batch download."""

    urls: list[str] = Field(..., description="List of video URLs (max 10)")
    audio_only: bool = Field(default=False)
    format_id: str = Field(default="best")

