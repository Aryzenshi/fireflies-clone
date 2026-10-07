"""Shared schema helpers (UTC serialisation)."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated, Any

from pydantic import PlainSerializer


def to_iso_z(value: datetime | None) -> str | None:
    """Serialise a datetime as ISO-8601 UTC with a trailing ``Z``."""

    if value is None:
        return None
    if value.tzinfo is not None:
        value = value.astimezone(timezone.utc).replace(tzinfo=None)
    return value.replace(microsecond=0).isoformat() + "Z"


def parse_datetime(value: Any) -> Any:
    """Normalise incoming datetimes to timezone-naive UTC."""

    if isinstance(value, datetime) and value.tzinfo is not None:
        return value.astimezone(timezone.utc).replace(tzinfo=None)
    return value


UTCDateTime = Annotated[
    datetime,
    PlainSerializer(to_iso_z, return_type=str | None, when_used="json"),
]
