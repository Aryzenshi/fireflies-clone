"""User model.

Real authentication is out of scope for the assignment, so a single default
user is seeded and treated as the signed-in user.
"""

from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, utcnow

if TYPE_CHECKING:  # pragma: no cover
    from app.models.meeting import Meeting


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(200), nullable=False, unique=True)
    avatar_url: Mapped[str | None] = mapped_column(String(400), nullable=True)
    transcription_minutes_used: Mapped[int] = mapped_column(default=0, server_default="0", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=utcnow)

    meetings: Mapped[list["Meeting"]] = relationship(
        back_populates="owner", cascade="all, delete-orphan"
    )
