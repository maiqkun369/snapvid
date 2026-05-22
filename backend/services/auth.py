"""Authentication service - phone + SMS code + JWT."""

from __future__ import annotations

import hashlib
import logging
import os
import random
import sqlite3
import string
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import jwt

logger = logging.getLogger(__name__)

# JWT Config
JWT_SECRET = os.environ.get("JWT_SECRET", "snapvid_jwt_secret_2026_change_in_production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = 72

# Database
DATA_DIR = Path(os.environ.get("DATA_DIR", "/app/data"))
try:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
except OSError:
    DATA_DIR = Path("./data")
    DATA_DIR.mkdir(parents=True, exist_ok=True)

DB_PATH = DATA_DIR / "users.db"

# Plan limits
PLAN_LIMITS = {
    "free": {
        "daily_downloads": 3,
        "max_resolution": "1080p",
        "batch_enabled": False,
        "max_file_size_mb": 500,
        "ads": True,
    },
    "pro": {
        "daily_downloads": -1,  # unlimited
        "max_resolution": "8k",
        "batch_enabled": True,
        "max_file_size_mb": -1,  # unlimited
        "ads": False,
    },
}


def _get_db() -> sqlite3.Connection:
    """Get SQLite connection, create tables if needed."""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            phone TEXT PRIMARY KEY,
            plan TEXT DEFAULT 'free',
            created_at TEXT,
            last_login TEXT
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS codes (
            phone TEXT,
            code TEXT,
            expires_at REAL,
            used INTEGER DEFAULT 0
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS download_log (
            phone TEXT,
            date TEXT,
            count INTEGER DEFAULT 0,
            PRIMARY KEY (phone, date)
        )
    """)
    # Ensure admin user exists (Pro plan)
    conn.execute("""
        INSERT OR IGNORE INTO users (phone, plan, created_at, last_login)
        VALUES ('admin', 'pro', datetime('now'), datetime('now'))
    """)
    conn.commit()
    return conn


class AuthService:
    """Authentication service with phone + code login."""

    def send_code(self, phone: str) -> str:
        """Generate and 'send' verification code (prints to console)."""
        phone = phone.strip()
        if not phone or len(phone) < 5:
            raise ValueError("请输入有效的手机号")

        # Admin shortcut - fixed code 000000
        if phone == "admin":
            db = _get_db()
            db.execute("DELETE FROM codes WHERE phone = ?", (phone,))
            db.execute(
                "INSERT INTO codes (phone, code, expires_at) VALUES (?, ?, ?)",
                (phone, "000000", time.time() + 3600),
            )
            db.commit()
            db.close()
            print(f"\n{'='*50}")
            print(f"  ADMIN LOGIN: code is 000000")
            print(f"{'='*50}\n")
            return "验证码已发送"

        # Generate 6-digit code
        code = ''.join(random.choices(string.digits, k=6))
        expires_at = time.time() + 300  # 5 minutes

        # Store code
        db = _get_db()
        db.execute("DELETE FROM codes WHERE phone = ?", (phone,))
        db.execute(
            "INSERT INTO codes (phone, code, expires_at) VALUES (?, ?, ?)",
            (phone, code, expires_at),
        )
        db.commit()
        db.close()

        # Simulated SMS - print to console
        logger.info(f"[SMS SIMULATED] Phone: {phone}, Code: {code}")
        print(f"\n{'='*50}")
        print(f"  📱 模拟短信发送")
        print(f"  手机号: {phone}")
        print(f"  验证码: {code}")
        print(f"  有效期: 5分钟")
        print(f"{'='*50}\n")

        return "验证码已发送"

    def login(self, phone: str, code: str) -> dict:
        """Verify code and login, return JWT token + user info."""
        phone = phone.strip()
        code = code.strip()

        db = _get_db()

        # Dev mode: universal code 000000 always works
        is_dev_code = (code == "000000")

        if not is_dev_code:
            # Verify code from database
            row = db.execute(
                "SELECT * FROM codes WHERE phone = ? AND code = ? AND used = 0",
                (phone, code),
            ).fetchone()

            if not row:
                db.close()
                raise ValueError("验证码错误或已过期")

            if time.time() > row["expires_at"]:
                db.close()
                raise ValueError("验证码已过期，请重新获取")

            # Mark code as used
            db.execute("UPDATE codes SET used = 1 WHERE phone = ? AND code = ?", (phone, code))
        else:
            # Dev universal code - just clear any existing codes
            db.execute("DELETE FROM codes WHERE phone = ?", (phone,))

        # Create or get user
        user = db.execute("SELECT * FROM users WHERE phone = ?", (phone,)).fetchone()
        now = datetime.now(timezone.utc).isoformat()

        if not user:
            db.execute(
                "INSERT INTO users (phone, plan, created_at, last_login) VALUES (?, 'free', ?, ?)",
                (phone, now, now),
            )
            plan = "free"
        else:
            db.execute("UPDATE users SET last_login = ? WHERE phone = ?", (now, phone))
            plan = user["plan"]

        db.commit()
        db.close()

        # Generate JWT
        token = self._generate_token(phone, plan)

        return {
            "token": token,
            "user": {
                "phone": self._mask_phone(phone),
                "plan": plan,
                "daily_remaining": self._get_daily_remaining(phone, plan),
                "features": PLAN_LIMITS.get(plan, PLAN_LIMITS["free"]),
            },
        }

    def get_user_info(self, token: str) -> Optional[dict]:
        """Get user info from JWT token."""
        payload = self._verify_token(token)
        if not payload:
            return None

        phone = payload.get("phone")
        plan = payload.get("plan", "free")

        return {
            "phone": self._mask_phone(phone),
            "plan": plan,
            "daily_remaining": self._get_daily_remaining(phone, plan),
            "features": PLAN_LIMITS.get(plan, PLAN_LIMITS["free"]),
        }

    def check_download_permission(self, token: Optional[str]) -> dict:
        """Check if user can download. Returns limits info."""
        if not token:
            # Anonymous user - must login to download
            return {
                "allowed": False,
                "plan": "none",
                "daily_remaining": 0,
                "max_resolution": "1080p",
                "batch_enabled": False,
                "message": "请先登录后再下载",
            }

        payload = self._verify_token(token)
        if not payload:
            return {
                "allowed": False,
                "plan": "none",
                "daily_remaining": 0,
                "max_resolution": "1080p",
                "batch_enabled": False,
                "message": "登录已过期，请重新登录",
            }

        phone = payload["phone"]
        # Always check real-time plan from DB (in case admin upgraded)
        db = _get_db()
        user = db.execute("SELECT plan FROM users WHERE phone = ?", (phone,)).fetchone()
        db.close()
        plan = user["plan"] if user else payload.get("plan", "free")
        remaining = self._get_daily_remaining(phone, plan)

        if plan != "pro" and remaining <= 0:
            return {
                "allowed": False,
                "plan": plan,
                "daily_remaining": 0,
                "max_resolution": "1080p",
                "batch_enabled": False,
                "message": "今日免费下载次数已用完，请升级 Pro 会员获取无限下载",
            }

        return {
            "allowed": True,
            "plan": plan,
            "daily_remaining": remaining,
            "max_resolution": PLAN_LIMITS[plan]["max_resolution"],
            "batch_enabled": PLAN_LIMITS[plan]["batch_enabled"],
        }

    def record_download(self, token: Optional[str]) -> None:
        """Record a download for the user."""
        if not token:
            return

        payload = self._verify_token(token)
        if not payload:
            return

        phone = payload["phone"]
        plan = payload.get("plan", "free")

        if plan == "pro":
            return  # Pro users don't need counting

        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        db = _get_db()
        existing = db.execute(
            "SELECT count FROM download_log WHERE phone = ? AND date = ?",
            (phone, today),
        ).fetchone()

        if existing:
            db.execute(
                "UPDATE download_log SET count = count + 1 WHERE phone = ? AND date = ?",
                (phone, today),
            )
        else:
            db.execute(
                "INSERT INTO download_log (phone, date, count) VALUES (?, ?, 1)",
                (phone, today),
            )
        db.commit()
        db.close()

    def _get_daily_remaining(self, phone: str, plan: str) -> int:
        """Get remaining downloads for today."""
        if plan == "pro":
            return -1  # unlimited

        limit = PLAN_LIMITS["free"]["daily_downloads"]
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")

        db = _get_db()
        row = db.execute(
            "SELECT count FROM download_log WHERE phone = ? AND date = ?",
            (phone, today),
        ).fetchone()
        db.close()

        used = row["count"] if row else 0
        return max(0, limit - used)

    def _generate_token(self, phone: str, plan: str) -> str:
        """Generate JWT token."""
        payload = {
            "phone": phone,
            "plan": plan,
            "exp": time.time() + (JWT_EXPIRE_HOURS * 3600),
            "iat": time.time(),
        }
        return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

    def _verify_token(self, token: str) -> Optional[dict]:
        """Verify and decode JWT token."""
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            if payload.get("exp", 0) < time.time():
                return None
            return payload
        except (jwt.InvalidTokenError, jwt.DecodeError):
            return None

    def _mask_phone(self, phone: str) -> str:
        """Mask phone number for display: 138****8888."""
        if len(phone) >= 11:
            return phone[:3] + "****" + phone[-4:]
        return phone[:2] + "****" + phone[-2:]
