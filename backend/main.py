"""FastAPI application entry point for ytdlp-web."""

import asyncio
import os
from pathlib import Path

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware

from api.routes import router, scheduler_service, downloader_service

# Create downloads directory
DOWNLOADS_DIR = Path(os.environ.get("DOWNLOADS_DIR", "/app/downloads"))
try:
    DOWNLOADS_DIR.mkdir(parents=True, exist_ok=True)
except OSError:
    DOWNLOADS_DIR = Path("./downloads")
    DOWNLOADS_DIR.mkdir(parents=True, exist_ok=True)

# Environment
IS_PRODUCTION = os.environ.get("ENV", "").lower() == "production"

app = FastAPI(
    title="SnapVid",
    description="Web-based video downloader and editor",
    version="2.0.0",
)

# CORS - restrict in production
ALLOWED_ORIGINS = os.environ.get("CORS_ORIGINS", "*").split(",")
if IS_PRODUCTION and ALLOWED_ORIGINS == ["*"]:
    # In production without explicit config, only allow same-origin
    ALLOWED_ORIGINS = []

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS if ALLOWED_ORIGINS != ["*"] else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health check endpoint (outside /api prefix for load balancers)
@app.get("/health")
async def health_check():
    """Health check for container orchestration."""
    return {
        "status": "healthy",
        "version": "2.0.0",
        "downloads_dir_exists": DOWNLOADS_DIR.exists(),
    }


# Scheduled downloads background task
async def _scheduler_loop():
    """Background loop that checks for due scheduled downloads every 30s."""
    from api.schemas import DownloadRequest
    while True:
        try:
            due = scheduler_service.get_due_downloads()
            for item in due:
                try:
                    req = DownloadRequest(url=item["url"])
                    task_id = await downloader_service.start_download(req, owner=item["phone"])
                    scheduler_service.mark_executed(item["id"], task_id)
                except Exception:
                    scheduler_service.mark_executed(item["id"], "failed")
        except Exception:
            pass
        await asyncio.sleep(30)


@app.on_event("startup")
async def startup_event():
    """Start background tasks on app startup."""
    asyncio.create_task(_scheduler_loop())


# Include API routes
app.include_router(router, prefix="/api")


# Middleware to add COOP/COEP headers for /tools/ path (required for SharedArrayBuffer/ffmpeg.wasm)
class COOPCOEPMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        if request.url.path.startswith("/tools"):
            response.headers["Cross-Origin-Opener-Policy"] = "same-origin"
            response.headers["Cross-Origin-Embedder-Policy"] = "require-corp"
        return response

app.add_middleware(COOPCOEPMiddleware)


# Serve ffmpeg-web toolbox at /tools/ (same origin, no redirect)
TOOLS_DIR = Path("/app/static/tools")
if TOOLS_DIR.exists():
    app.mount("/tools", StaticFiles(directory=str(TOOLS_DIR), html=True), name="toolbox")

# Serve frontend static files (catch-all, must be last)
STATIC_DIR = Path("/app/static")
if STATIC_DIR.exists():
    app.mount("/", StaticFiles(directory=str(STATIC_DIR), html=True), name="static")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "8080")),
        reload=os.getenv("ENV", "production") == "development",
    )
