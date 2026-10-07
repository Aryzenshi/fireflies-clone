"""Comment repository: all SQL for meeting comments lives here."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import MeetingComment, TranscriptSegment


class CommentRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_for_meeting(self, meeting_id: str) -> list[MeetingComment]:
        stmt = (
            select(MeetingComment)
            .options(selectinload(MeetingComment.segment))
            .where(MeetingComment.meeting_id == meeting_id)
            .order_by(MeetingComment.created_at.asc(), MeetingComment.id.asc())
        )
        return list(self.db.scalars(stmt).unique())

    def get(self, comment_id: str) -> MeetingComment | None:
        stmt = (
            select(MeetingComment)
            .options(selectinload(MeetingComment.segment))
            .where(MeetingComment.id == comment_id)
        )
        return self.db.scalars(stmt).unique().first()

    def count_for_meeting(self, meeting_id: str) -> int:
        return len(self.list_for_meeting(meeting_id))

    def segment_belongs_to_meeting(self, meeting_id: str, segment_id: str) -> bool:
        stmt = select(TranscriptSegment.id).where(
            TranscriptSegment.id == segment_id, TranscriptSegment.meeting_id == meeting_id
        )
        return self.db.scalar(stmt) is not None

    def add(self, comment: MeetingComment) -> MeetingComment:
        self.db.add(comment)
        self.db.flush()
        return comment

    def delete(self, comment: MeetingComment) -> None:
        self.db.delete(comment)
