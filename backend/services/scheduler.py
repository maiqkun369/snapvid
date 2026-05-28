"""Scheduled/timed download service.

Users can schedule downloads to run at specific times.
"""

from __future__ import annotations

import asyncio
import logging
import os
import sqlite3
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

DB_PATH = Path(os.environ.get("DATA_DIR", "/app/data")) / "users.db"


def _get_db():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("""CREATE TABLE IF NOT EXISTS scheduled_downloads (
        id TEXT PRIMARY KEY,
        phone TEXT NOT NULL,
        url TEXT NOT NULL,
        scheduled_at TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        task_id TEXT,
        created_at TEXT,
        executed_at TEXT
    )""")
    conn.commit()
    return conn


class SchedulerService:
    """Manage scheduled downloads."""

    def __init__(self) -> None:
        self._running = False

    def schedule_download(self, phone: str, url: str, scheduled_time: str) -> dict:
        """Schedule a download for a specific time.
        
        Args:
            phone: User phone
            url: Video URL to download
            scheduled_time: ISO format datetime string
        """
        sid = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()

        db = _get_db()
        db.execute(
            "INSERT INTO scheduled_downloads (id, phone, url, scheduled_at, status, created_at) VALUES (?, ?, ?, ?, 'pending', ?)",
            (sid, phone, url, scheduled_time, now)
        )
        db.commit()
        db.close()

        return {
            "id": sid,
            "url": url,
            "scheduled_at": scheduled_time,
            "status": "pending",
            "message": f"已设定定时下载",
        }

    def get_scheduled(self, phone: str) -> list[dict]:
        """Get all scheduled downloads for a user."""
        db = _get_db()
        rows = db.execute(
            "SELECT * FROM scheduled_downloads WHERE phone = ? ORDER BY scheduled_at DESC",
            (phone,)
        ).fetchall()
        db.close()

        return [dict(row) for row in rows]

    def cancel_scheduled(self, schedule_id: str) -> bool:
        """Cancel a scheduled download."""
        db = _get_db()
        result = db.execute(
            "UPDATE scheduled_downloads SET status = 'cancelled' WHERE id = ? AND status = 'pending'",
            (schedule_id,)
        )
        db.commit()
        affected = result.rowcount
        db.close()
        return affected > 0

    def get_due_downloads(self) -> list[dict]:
        """Get downloads that are due to execute."""
        now = datetime.now(timezone.utc).isoformat()
        db = _get_db()
        rows = db.execute(
            "SELECT * FROM scheduled_downloads WHERE status = 'pending' AND scheduled_at <= ?",
            (now,)
        ).fetchall()
        db.close()
        return [dict(row) for row in rows]

    def mark_executed(self, schedule_id: str, task_id: str) -> None:
        """Mark a scheduled download as executed."""
        now = datetime.now(timezone.utc).isoformat()
        db = _get_db()
        db.execute(
            "UPDATE scheduled_downloads SET status = 'executed', task_id = ?, executed_at = ? WHERE id = ?",
            (task_id, now, schedule_id)
        )
        db.commit()
        db.close()
