"""Declarative base plus small helpers shared by every ORM model."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy.orm import DeclarativeBase


def utcnow() -> datetime:
    """Timezone-naive UTC timestamp.

    SQLite has no native timezone support, so timestamps are stored as naive
    UTC values and serialised back to ISO-8601 with a trailing ``Z``.
    """

    return datetime.now(timezone.utc).replace(tzinfo=None, microsecond=0)


def new_id(prefix: str) -> str:
    """Generate a short, readable, prefixed identifier (e.g. ``mtg_9f2c1a4b``)."""

    return f"{prefix}_{uuid.uuid4().hex[:10]}"


class Base(DeclarativeBase):
    """Base class for all ORM models."""
