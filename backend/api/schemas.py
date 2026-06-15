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
    description: str = Field(default="", description="Video description/copywriting")
    formats: list[VideoFormat] = Field(default_factory=list, description="Available formats")
    subtitles: list[str] = Field(default_factory=list, description="Available subtitle languages")
    chapters: Optional[list[dict]] = Field(default=None, description="Video chapters")
    comment_count: Optional[int] = Field(default=None, description="Number of comments")
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
    # New features
    concurrent_fragments: int = Field(default=1, description="Concurrent download fragments (1-16)")
    download_sections: Optional[str] = Field(default=None, description="Time range to download e.g. *00:01:00-00:02:30")
    output_template: Optional[str] = Field(default=None, description="Custom filename template")
    thumbnail_only: bool = Field(default=False, description="Download only thumbnail image")
    remux_format: Optional[str] = Field(default=None, description="Remux to format without re-encoding")
    # Roadmap features
    write_comments: bool = Field(default=False, description="Export video comments")
    use_archive: bool = Field(default=True, description="Skip already downloaded videos")
    safe_mode: bool = Field(default=False, description="Anti-ban mode with sleep between requests")
    playlist_random: bool = Field(default=False, description="Randomize playlist order")
    filter_duration_min: Optional[int] = Field(default=None, description="Min duration filter in seconds")
    filter_duration_max: Optional[int] = Field(default=None, description="Max duration filter in seconds")
    max_filesize: Optional[str] = Field(default=None, description="Max file size e.g. 500M")
    min_filesize: Optional[str] = Field(default=None, description="Min file size e.g. 10M")
    date_after: Optional[str] = Field(default=None, description="Only videos after date YYYYMMDD")
    date_before: Optional[str] = Field(default=None, description="Only videos before date YYYYMMDD")
    format_sort: Optional[str] = Field(default=None, description="Format sort e.g. res:1080,ext:mp4")
    geo_bypass_country: Optional[str] = Field(default=None, description="Country code for geo bypass e.g. US")
    convert_subs_format: Optional[str] = Field(default=None, description="Convert subtitles to: srt, ass, vtt")
    convert_thumbnail_format: Optional[str] = Field(default=None, description="Convert thumbnail: png, jpg, webp")


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
    owner: str = Field(default="anonymous", description="Owner phone or anonymous")
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


# === Auth ===

class SendCodeRequest(BaseModel):
    """Request to send SMS verification code."""

    phone: str = Field(..., description="Phone number")


class LoginRequest(BaseModel):
    """Request to login with code."""

    phone: str = Field(..., description="Phone number")
    code: str = Field(..., description="6-digit verification code")


class UserInfo(BaseModel):
    """User info model."""

    phone: str = Field(default="")
    plan: str = Field(default="free")
    daily_remaining: int = Field(default=3)
    features: dict = Field(default_factory=dict)


class LoginResponse(BaseModel):
    """Login response with token and user info."""

    token: str = Field(default="")
    user: UserInfo = Field(default_factory=UserInfo)


# === AI Chat & Analysis ===


class AIChatRequest(BaseModel):
    """Request for AI chat."""

    prompt: str = Field(..., description="User prompt text")
    system_prompt: Optional[str] = Field(default=None, description="Optional system prompt")


class AIVideoAnalysisRequest(BaseModel):
    """Request for AI video analysis (summary, copywriting, tags)."""

    video_info: dict = Field(..., description="Video metadata dict")
    context: Optional[str] = Field(default="", description="Additional context")
    style: Optional[str] = Field(default="social", description="Copywriting style: social, professional, quirky, seo")
    count: Optional[int] = Field(default=5, description="Number of tags to generate")


class AIFileAnalysisRequest(BaseModel):
    """Request for AI file analysis."""

    file_path: str = Field(..., description="Path to the file to analyse")
    instruction: Optional[str] = Field(default="", description="Analysis instruction")


class AITokensUsed(BaseModel):
    """Token usage statistics."""

    prompt_tokens: int = Field(default=0)
    completion_tokens: int = Field(default=0)


class AIResponse(BaseModel):
    """Response for AI operations."""

    success: bool = Field(default=False, description="Whether the operation succeeded")
    data: str | list = Field(default="", description="Result data (string or list of tags)")
    tokens_used: AITokensUsed = Field(default_factory=AITokensUsed, description="Token usage info")
    cost_estimate: float = Field(default=0.0, description="Estimated cost in USD")
    error: Optional[str] = Field(default=None, description="Error message if failed")

