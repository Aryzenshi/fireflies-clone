"""Meeting, transcript, summary and action item models."""

from __future__ import annotations

from datetime import date, datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, utcnow
from app.models.participant import meeting_participants

if TYPE_CHECKING:  # pragma: no cover
    from app.models.participant import Participant
    from app.models.user import User

SOURCE_TYPES = ("seed", "import", "manual")


class Meeting(Base):
    __tablename__ = "meetings"
    __table_args__ = (
        Index("ix_meetings_owner_started_at", "owner_id", "started_at"),
        Index("ix_meetings_title", "title"),
    )

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    owner_id: Mapped[str] = mapped_column(
        String(40), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, index=True)
    duration_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    host_name: Mapped[str | None] = mapped_column(String(160), nullable=True)
    source_type: Mapped[str] = mapped_column(String(20), nullable=False, default="manual")
    # Tags are stored as a JSON array in a text column: SQLite has no array type and
    # the tag list is always read/written with the meeting, so a join table would add
    # cost without query benefit. Filtering uses a quoted LIKE match (see repositories).
    tags_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=utcnow, onupdate=utcnow
    )

    owner: Mapped["User"] = relationship(back_populates="meetings")
    participants: Mapped[list["Participant"]] = relationship(
        secondary=meeting_participants,
        back_populates="meetings",
        order_by="Participant.display_name",
        lazy="selectin",
    )
    transcript_segments: Mapped[list["TranscriptSegment"]] = relationship(
        back_populates="meeting",
        cascade="all, delete-orphan",
        order_by="TranscriptSegment.sequence",
        lazy="select",  # in the library list reading every segment
    )
    summary: Mapped["MeetingSummary | None"] = relationship(
        back_populates="meeting",
        cascade="all, delete-orphan",
        uselist=False,
        lazy="selectin",
    )
    action_items: Mapped[list["ActionItem"]] = relationship(
        back_populates="meeting",
        cascade="all, delete-orphan",
        order_by="ActionItem.created_at",
        lazy="selectin",
    )
    comments: Mapped[list["MeetingComment"]] = relationship(
        back_populates="meeting",
        cascade="all, delete-orphan",
        order_by="MeetingComment.created_at",
        lazy="select",  # loaded by the detail query only
    )

    @property
    def participant_names(self) -> list[str]:
        return [participant.display_name for participant in self.participants]


class TranscriptSegment(Base):
    __tablename__ = "transcript_segments"
    __table_args__ = (
        Index("ix_transcript_segments_meeting_sequence", "meeting_id", "sequence"),
        Index("ix_transcript_segments_meeting_start", "meeting_id", "start_seconds"),
    )

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    meeting_id: Mapped[str] = mapped_column(
        String(40), ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False
    )
    sequence: Mapped[int] = mapped_column(Integer, nullable=False)
    speaker_name: Mapped[str] = mapped_column(String(160), nullable=False)
    start_seconds: Mapped[int] = mapped_column(Integer, nullable=False)
    end_seconds: Mapped[int] = mapped_column(Integer, nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=utcnow, onupdate=utcnow
    )

    meeting: Mapped["Meeting"] = relationship(back_populates="transcript_segments")


class MeetingSummary(Base):
    __tablename__ = "meeting_summaries"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    meeting_id: Mapped[str] = mapped_column(
        String(40),
        ForeignKey("meetings.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    overview: Mapped[str] = mapped_column(Text, nullable=False)
    key_points_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    topics_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=utcnow, onupdate=utcnow
    )

    meeting: Mapped["Meeting"] = relationship(back_populates="summary")
    sections: Mapped[list["SummarySection"]] = relationship(
        back_populates="summary",
        cascade="all, delete-orphan",
        order_by="SummarySection.sequence",
        # Chapters are only rendered on the notepad, so they are eagerly loaded by the
        # detail query only (MeetingRepository._base_select), never by the library list.
        lazy="select",
    )


class MeetingComment(Base):
    """A comment on a meeting, optionally anchored to one transcript segment.

    Anchoring is what turns a comment into a "highlight": the notepad marks the
    transcript line, and clicking the comment jumps the player to that timestamp.
    """

    __tablename__ = "meeting_comments"
    __table_args__ = (Index("ix_meeting_comments_meeting_created_at", "meeting_id", "created_at"),)

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    meeting_id: Mapped[str] = mapped_column(
        String(40), ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False
    )
    segment_id: Mapped[str | None] = mapped_column(
        String(60), ForeignKey("transcript_segments.id", ondelete="CASCADE"), nullable=True
    )
    author_name: Mapped[str] = mapped_column(String(160), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=utcnow, onupdate=utcnow
    )

    meeting: Mapped["Meeting"] = relationship(back_populates="comments")
    segment: Mapped["TranscriptSegment | None"] = relationship()


class SummarySection(Base):
    """A chapter / topic grouping inside the AI summary (with an optional timestamp)."""

    __tablename__ = "summary_sections"

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    summary_id: Mapped[str] = mapped_column(
        String(40), ForeignKey("meeting_summaries.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    timestamp_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    bullets_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    sequence: Mapped[int] = mapped_column(Integer, nullable=False)

    summary: Mapped["MeetingSummary"] = relationship(back_populates="sections")


class ActionItem(Base):
    __tablename__ = "action_items"
    __table_args__ = (
        Index("ix_action_items_meeting_completed", "meeting_id", "completed"),
        Index("ix_action_items_meeting_due_date", "meeting_id", "due_date"),
    )

    id: Mapped[str] = mapped_column(String(40), primary_key=True)
    meeting_id: Mapped[str] = mapped_column(
        String(40), ForeignKey("meetings.id", ondelete="CASCADE"), nullable=False
    )
    title: Mapped[str] = mapped_column(String(400), nullable=False)
    assignee: Mapped[str | None] = mapped_column(String(160), nullable=True)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    completed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=utcnow, onupdate=utcnow
    )

    meeting: Mapped["Meeting"] = relationship(back_populates="action_items")


class SchemaVersion(Base):
    """Tiny bookkeeping table so schema initialisation is explicit and repeatable."""

    __tablename__ = "schema_version"
    __table_args__ = (UniqueConstraint("version", name="uq_schema_version"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    version: Mapped[str] = mapped_column(String(40), nullable=False)
    applied_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=utcnow)
