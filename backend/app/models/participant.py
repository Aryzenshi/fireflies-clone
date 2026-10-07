"""Participants and the meeting <-> participant association table."""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Column, ForeignKey, String, Table
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:  # pragma: no cover
    from app.models.meeting import Meeting

meeting_participants = Table(
    "meeting_participants",
    Base.metadata,
    Column("meeting_id", String(40), ForeignKey("meetings.id", ondelete="CASCADE"), primary_key=True),
    Column(
        "participant_id",
        String(40),
        ForeignKey("participants.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column("role", String(40), nullable=True),
)


class Participant(Base):
    __tablename__ = "participants"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    display_name: Mapped[str] = mapped_column(String(160), nullable=False, index=True)
    email: Mapped[str | None] = mapped_column(String(200), nullable=True)

    meetings: Mapped[list["Meeting"]] = relationship(
        secondary=meeting_participants, back_populates="participants"
    )
