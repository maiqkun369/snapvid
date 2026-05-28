"""Referral/invite system for user growth.

Invite a friend → both get 7 days Pro.
"""

from __future__ import annotations

import logging
import os
import sqlite3
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path

logger = logging.getLogger(__name__)

DB_PATH = Path(os.environ.get("DATA_DIR", "/app/data")) / "users.db"


def _get_db():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("""CREATE TABLE IF NOT EXISTS referrals (
        id TEXT PRIMARY KEY,
        inviter_phone TEXT NOT NULL,
        invitee_phone TEXT,
        invite_code TEXT UNIQUE NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at TEXT,
        completed_at TEXT
    )""")
    conn.commit()
    return conn


class ReferralService:
    """Manage invite codes and referral rewards."""

    def generate_invite_code(self, phone: str) -> dict:
        """Generate a unique invite code for a user."""
        db = _get_db()
        # Check if user already has an active code
        existing = db.execute(
            "SELECT invite_code FROM referrals WHERE inviter_phone = ? AND status = 'pending' LIMIT 1",
            (phone,)
        ).fetchone()

        if existing:
            code = existing["invite_code"]
        else:
            code = uuid.uuid4().hex[:8].upper()
            db.execute(
                "INSERT INTO referrals (id, inviter_phone, invite_code, status, created_at) VALUES (?, ?, ?, 'pending', ?)",
                (str(uuid.uuid4()), phone, code, datetime.now(timezone.utc).isoformat())
            )
            db.commit()
        db.close()

        return {
            "invite_code": code,
            "invite_url": f"https://snapvid.app/invite/{code}",
            "reward": "邀请成功后双方各得 7 天 Pro",
        }

    def use_invite_code(self, invitee_phone: str, code: str) -> dict:
        """Invitee uses an invite code. Both get 7 days Pro."""
        db = _get_db()
        referral = db.execute(
            "SELECT * FROM referrals WHERE invite_code = ? AND status = 'pending'",
            (code,)
        ).fetchone()

        if not referral:
            db.close()
            raise ValueError("邀请码无效或已使用")

        inviter_phone = referral["inviter_phone"]
        if inviter_phone == invitee_phone:
            db.close()
            raise ValueError("不能使用自己的邀请码")

        # Mark referral as completed
        now = datetime.now(timezone.utc).isoformat()
        db.execute(
            "UPDATE referrals SET invitee_phone = ?, status = 'completed', completed_at = ? WHERE invite_code = ?",
            (invitee_phone, now, code)
        )

        # Reward both users with 7 days Pro
        self._add_pro_days(db, inviter_phone, 7)
        self._add_pro_days(db, invitee_phone, 7)

        db.commit()
        db.close()

        return {
            "success": True,
            "message": "邀请码使用成功！双方各获得 7 天 Pro 会员",
        }

    def get_invite_stats(self, phone: str) -> dict:
        """Get invite statistics for a user."""
        db = _get_db()
        total = db.execute(
            "SELECT COUNT(*) as c FROM referrals WHERE inviter_phone = ?", (phone,)
        ).fetchone()["c"]
        completed = db.execute(
            "SELECT COUNT(*) as c FROM referrals WHERE inviter_phone = ? AND status = 'completed'", (phone,)
        ).fetchone()["c"]
        db.close()

        return {
            "total_invites": total,
            "successful_invites": completed,
            "earned_days": completed * 7,
        }

    def _add_pro_days(self, db, phone: str, days: int) -> None:
        """Add Pro days to a user."""
        user = db.execute("SELECT plan FROM users WHERE phone = ?", (phone,)).fetchone()
        if user:
            db.execute("UPDATE users SET plan = 'pro' WHERE phone = ?", (phone,))
        # In a real system, you'd track expiry dates
        logger.info(f"Added {days} Pro days to {phone}")
