"""Meeting queries. All SQL for meetings lives here (never in route handlers)."""

from __future__ import annotations

import json
from datetime import date, datetime, time, timedelta

from sqlalchemy import Select, and_, delete, func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.models import Meeting, MeetingSummary, Participant, TranscriptSegment, meeting_participants


class MeetingFilters:
    """Validated, normalised filter values used by :meth:`MeetingRepository.list`."""

    def __init__(
        self,
        *,
        query: str | None = None,
        participant: str | None = None,
        tag: str | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
        sort: str = "recent",
    ) -> None:
        self.query = (query or "").strip()
        self.participant = (participant or "").strip()
        self.tag = (tag or "").strip()
        self.date_from = date_from
        self.date_to = date_to
        self.sort = sort if sort in {"recent", "oldest"} else "recent"


class MeetingRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    # ------------------------------------------------------------------ #
    # Queries
    # ------------------------------------------------------------------ #
    @staticmethod
    def _base_select() -> Select[tuple[Meeting]]:
        """Everything a meeting *detail* response needs (transcript included)."""

        return select(Meeting).options(
            selectinload(Meeting.participants),
            selectinload(Meeting.summary).selectinload(MeetingSummary.sections),
            selectinload(Meeting.action_items),
            selectinload(Meeting.transcript_segments),
        )

    @staticmethod
    def _list_select() -> Select[tuple[Meeting]]:
        """The lighter projection used by the library list.

        A list row only renders title, date, duration, participants, tags, topics and
        the action-item counters — so transcript segments and summary sections are not
        loaded. That keeps the library query flat as transcripts grow (previously a
        single list request read every segment of every meeting).
        """

        return select(Meeting).options(
            selectinload(Meeting.participants),
            selectinload(Meeting.summary),
            selectinload(Meeting.action_items),
        )

    @staticmethod
    def _apply_filters(stmt: Select[tuple[Meeting]], filters: MeetingFilters) -> Select[tuple[Meeting]]:
        """Attach the shared WHERE clauses so `list` and `count` cannot drift apart."""

        if filters.query:
            like = f"%{filters.query.lower()}%"
            participant_match = (
                select(meeting_participants.c.meeting_id)
                .join(Participant, Participant.id == meeting_participants.c.participant_id)
                .where(func.lower(Participant.display_name).like(like))
            )
            # Transcript text matches too - the search box promises it, and it is what a
            # reviewer reaches for ("which meeting mentioned the invite step?"). This is an
            # inline IN-subquery: it narrows the meeting rows in the same statement and
            # never loads segment rows into the session, so the list stays flat.
            transcript_match = select(TranscriptSegment.meeting_id).where(
                func.lower(TranscriptSegment.text).like(like)
            )
            stmt = stmt.where(
                or_(
                    func.lower(Meeting.title).like(like),
                    func.lower(func.coalesce(Meeting.host_name, "")).like(like),
                    Meeting.id.in_(participant_match),
                    Meeting.id.in_(transcript_match),
                )
            )

        if filters.participant:
            participant_like = f"%{filters.participant.lower()}%"
            participant_match = (
                select(meeting_participants.c.meeting_id)
                .join(Participant, Participant.id == meeting_participants.c.participant_id)
                .where(func.lower(Participant.display_name).like(participant_like))
            )
            stmt = stmt.where(Meeting.id.in_(participant_match))

        if filters.tag:
            # tags_json is a JSON array of strings; match the quoted value so that a
            # filter for "eng" never matches the tag "engineering".
            stmt = stmt.where(
                func.lower(Meeting.tags_json).like(f'%"{filters.tag.lower()}"%')
            )

        if filters.date_from:
            stmt = stmt.where(Meeting.started_at >= datetime.combine(filters.date_from, time.min))
        if filters.date_to:
            # inclusive end date -> add one day and use a strict comparison
            stmt = stmt.where(
                Meeting.started_at
                < datetime.combine(filters.date_to + timedelta(days=1), time.min)
            )
        return stmt

    def list(self, filters: MeetingFilters, *, limit: int | None = None, offset: int = 0) -> list[Meeting]:
        stmt = self._apply_filters(self._list_select(), filters)

        if filters.sort == "oldest":
            stmt = stmt.order_by(Meeting.started_at.asc(), Meeting.id.asc())
        else:
            stmt = stmt.order_by(Meeting.started_at.desc(), Meeting.id.asc())

        if offset:
            stmt = stmt.offset(offset)
        if limit is not None:
            stmt = stmt.limit(limit)
        return list(self.db.scalars(stmt).unique())

    def count(self, filters: MeetingFilters) -> int:
        # Counting with the same filters but without eager loading.
        stmt = self._apply_filters(select(func.count()).select_from(Meeting), filters)
        return int(self.db.scalar(stmt) or 0)

    def get(self, meeting_id: str) -> Meeting | None:
        return self.db.scalars(self._base_select().where(Meeting.id == meeting_id)).unique().first()

    def get_by_title(self, title: str) -> Meeting | None:
        stmt = self._base_select().where(func.lower(Meeting.title) == title.strip().lower())
        return self.db.scalars(stmt).unique().first()

    def tag_counts(self) -> list[tuple[str, int]]:
        """All tags in the workspace with how many meetings use each one."""

        counts: dict[str, int] = {}
        display: dict[str, str] = {}
        for (raw,) in self.db.execute(select(Meeting.tags_json)):
            try:
                tags = json.loads(raw or "[]")
            except (TypeError, ValueError):
                continue
            if not isinstance(tags, list):
                continue
            for tag in tags:
                if not isinstance(tag, str) or not tag.strip():
                    continue
                key = tag.strip().lower()
                counts[key] = counts.get(key, 0) + 1
                display.setdefault(key, tag.strip())
        return sorted(((display[key], value) for key, value in counts.items()), key=lambda item: (-item[1], item[0].lower()))

    def count_all(self) -> int:
        return int(self.db.scalar(select(func.count()).select_from(Meeting)) or 0)

    def total_transcript_seconds(self) -> int:
        return int(self.db.scalar(select(func.coalesce(func.sum(Meeting.duration_seconds), 0))) or 0)

    def ids_by_source(self, source_type: str) -> list[str]:
        return list(self.db.scalars(select(Meeting.id).where(Meeting.source_type == source_type)))

    def transcript_seconds(self, meeting_id: str) -> int:
        stmt = select(func.coalesce(func.max(TranscriptSegment.end_seconds), 0)).where(
            TranscriptSegment.meeting_id == meeting_id
        )
        return int(self.db.scalar(stmt) or 0)

    # ------------------------------------------------------------------ #
    # Mutations
    # ------------------------------------------------------------------ #
    def add(self, meeting: Meeting) -> Meeting:
        self.db.add(meeting)
        self.db.flush()
        return meeting

    def delete(self, meeting: Meeting) -> None:
        self.db.delete(meeting)
        self.db.flush()
        self.prune_orphan_participants()

    def prune_orphan_participants(self) -> int:
        """Drop participants no meeting references any more.

        People are shared between meetings, so deleting one meeting must not delete a
        participant who still appears elsewhere - but leaving the leftovers behind put
        entries with zero meetings in the participant filter.
        """

        referenced = select(meeting_participants.c.participant_id)
        result = self.db.execute(delete(Participant).where(Participant.id.not_in(referenced)))
        return int(result.rowcount or 0)

    def list_participants_with_counts(self) -> list[tuple[Participant, int]]:
        stmt = (
            select(Participant, func.count(meeting_participants.c.meeting_id))
            .join(
                meeting_participants,
                meeting_participants.c.participant_id == Participant.id,
            )
            .group_by(Participant.id)
            .order_by(func.count(meeting_participants.c.meeting_id).desc(), Participant.display_name.asc())
        )
        return [(row[0], int(row[1])) for row in self.db.execute(stmt).all()]

    def get_or_create_participant(self, display_name: str, email: str | None = None) -> Participant:
        name = display_name.strip()
        existing = self.db.scalars(
            select(Participant).where(func.lower(Participant.display_name) == name.lower())
        ).first()
        if existing is not None:
            if email and not existing.email:
                existing.email = email
            return existing
        from app.db.base import new_id

        participant = Participant(id=new_id("prt"), display_name=name, email=email)
        self.db.add(participant)
        self.db.flush()
        return participant

    def replace_participants(self, meeting: Meeting, names: list[str]) -> None:
        participants = [self.get_or_create_participant(name) for name in names]
        meeting.participants = participants
        self.db.flush()

    def action_item_stats(self) -> tuple[int, int]:
        from app.models import ActionItem

        open_count = int(
            self.db.scalar(
                select(func.count()).select_from(ActionItem).where(ActionItem.completed.is_(False))
            )
            or 0
        )
        done_count = int(
            self.db.scalar(
                select(func.count()).select_from(ActionItem).where(ActionItem.completed.is_(True))
            )
            or 0
        )
        return open_count, done_count

    def participant_count(self) -> int:
        return int(self.db.scalar(select(func.count()).select_from(Participant)) or 0)

    def has_any(self) -> bool:
        return int(self.db.scalar(select(func.count()).select_from(Meeting)) or 0) > 0

    def meetings_started_between(self, start: datetime, end: datetime) -> list[Meeting]:
        stmt = select(Meeting).where(and_(Meeting.started_at >= start, Meeting.started_at < end))
        return list(self.db.scalars(stmt))
