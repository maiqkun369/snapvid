"""FastAPI application entry point for ytdlp-web."""

import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from api.routes import router

# Create downloads directory
DOWNLOADS_DIR = Path(os.environ.get("DOWNLOADS_DIR", "/app/downloads"))
try:
    DOWNLOADS_DIR.mkdir(parents=True, exist_ok=True)
except OSError:
    DOWNLOADS_DIR = Path("./downloads")
    DOWNLOADS_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(
    title="ytdlp-web",
    description="Web-based video downloader powered by yt-dlp",
    version="1.0.0",
)

# CORS middleware for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(router, prefix="/api")

# Serve frontend static files in production mode
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
