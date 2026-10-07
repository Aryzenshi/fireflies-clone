"""Application configuration.

All values can be overridden with environment variables so the same code runs
locally, in tests and on a hosted environment without changes.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[2]


def _split_csv(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


@dataclass(frozen=True)
class Settings:
    """Runtime settings for the Fireflies-clone backend."""

    app_name: str = "Fireflies Meeting Notes Clone API"
    app_version: str = "1.0.0"

    # SQLite by default. Example override: sqlite:////tmp/demo.db
    database_url: str = os.getenv(
        "DATABASE_URL", f"sqlite:///{BACKEND_ROOT / 'data' / 'fireflies.db'}"
    )

    # Comma separated list of allowed origins for the Next.js dev server.
    cors_origins: list[str] = field(
        default_factory=lambda: _split_csv(
            os.getenv(
                "CORS_ORIGINS",
                "http://localhost:3000,http://127.0.0.1:3000",
            )
        )
    )

    # When true (default) an empty database is seeded automatically on startup
    # so the app is immediately usable after `pip install` + `uvicorn`.
    auto_seed: bool = os.getenv("AUTO_SEED", "true").lower() in {"1", "true", "yes"}

    # Maximum accepted transcript upload size (10 MiB is plenty for text files).
    max_upload_bytes: int = int(os.getenv("MAX_UPLOAD_BYTES", str(10 * 1024 * 1024)))

    # Default single signed-in user (real auth is out of scope for the assignment).
    default_user_id: str = "usr_default"
    default_user_name: str = os.getenv("DEFAULT_USER_NAME", "Aaron Kantor")
    default_user_email: str = os.getenv("DEFAULT_USER_EMAIL", "aaron.kantor@thebusinessdrive.com")
    transcription_minutes_quota: int = int(os.getenv("TRANSCRIPTION_MINUTES_QUOTA", "800"))


settings = Settings()
