"""Action item + transcript segment queries."""

from __future__ import annotations

from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.base import new_id, utcnow
from app.models import ActionItem, TranscriptSegment


class ActionItemRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get(self, action_item_id: str) -> ActionItem | None:
        return self.db.get(ActionItem, action_item_id)

    def list_for_meeting(self, meeting_id: str) -> list[ActionItem]:
        stmt = (
            select(ActionItem)
            .where(ActionItem.meeting_id == meeting_id)
            .order_by(ActionItem.completed.asc(), ActionItem.created_at.asc())
        )
        return list(self.db.scalars(stmt))

    def create(
        self,
        *,
        meeting_id: str,
        title: str,
        assignee: str | None = None,
        due_date: date | None = None,
        completed: bool = False,
    ) -> ActionItem:
        item = ActionItem(
            id=new_id("ait"),
            meeting_id=meeting_id,
            title=title,
            assignee=assignee,
            due_date=due_date,
            completed=completed,
            created_at=utcnow(),
            updated_at=utcnow(),
        )
        self.db.add(item)
        self.db.flush()
        return item

    def update(self, item: ActionItem, **changes: object) -> ActionItem:
        for field, value in changes.items():
            setattr(item, field, value)
        item.updated_at = utcnow()
        self.db.flush()
        return item

    def delete(self, item: ActionItem) -> None:
        self.db.delete(item)
        self.db.flush()


class TranscriptRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_segment(self, meeting_id: str, segment_id: str) -> TranscriptSegment | None:
        stmt = select(TranscriptSegment).where(
            TranscriptSegment.id == segment_id, TranscriptSegment.meeting_id == meeting_id
        )
        return self.db.scalars(stmt).first()

    def list_for_meeting(self, meeting_id: str) -> list[TranscriptSegment]:
        stmt = (
            select(TranscriptSegment)
            .where(TranscriptSegment.meeting_id == meeting_id)
            .order_by(TranscriptSegment.sequence.asc())
        )
        return list(self.db.scalars(stmt))

    def replace_all(self, meeting_id: str, segments: list[dict[str, object]]) -> list[TranscriptSegment]:
        """Delete existing segments for a meeting and insert the supplied ones."""

        for existing in self.list_for_meeting(meeting_id):
            self.db.delete(existing)
        self.db.flush()

        created: list[TranscriptSegment] = []
        for index, raw in enumerate(segments):
            segment = TranscriptSegment(
                id=new_id("seg"),
                meeting_id=meeting_id,
                sequence=index,
                speaker_name=str(raw.get("speaker") or "Speaker"),
                start_seconds=int(raw.get("start_seconds") or 0),
                end_seconds=int(raw.get("end_seconds") or 0),
                text=str(raw.get("text") or ""),
                created_at=utcnow(),
                updated_at=utcnow(),
            )
            self.db.add(segment)
            created.append(segment)
        self.db.flush()
        return created

    def update_text(self, segment: TranscriptSegment, text: str) -> TranscriptSegment:
        segment.text = text
        segment.updated_at = utcnow()
        self.db.flush()
        return segment
