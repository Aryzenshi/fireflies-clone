"""Business rules for meetings, transcripts, summaries and action items.

Route handlers stay thin: they validate the request (Pydantic), call this
service, and serialise the result.
"""

from __future__ import annotations

import json
from datetime import date, datetime, timedelta
from typing import Any

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.errors import BadRequestError, NotFoundError
from app.db.base import new_id, utcnow
from app.models import (
    ActionItem,
    Meeting,
    MeetingComment,
    MeetingSummary,
    TranscriptSegment,
    User,
)
from app.repositories import (
    CommentRepository,
    ActionItemRepository,
    MeetingFilters,
    MeetingRepository,
    TranscriptRepository,
)
from app.schemas import (
    ActionItemCreate,
    CommentCreate,
    CommentOut,
    CommentUpdate,
    ActionItemOut,
    ActionItemUpdate,
    HealthOut,
    MeetingCreate,
    MeetingDetail,
    MeetingListResponse,
    MeetingUpdate,
    ParticipantSummary,
    StatsOut,
    TagSummary,
    TranscriptSegmentOut,
    TranscriptSegmentUpdate,
    UserOut,
    normalise_tags,
)
from app.services import serializers
from app.services.summary_service import SummaryService, summary_service
from app.services.exporter import EXPORT_FORMATS, export_filename, is_supported_format, render_export
from app.services.transcript_parser import (
    duration_from_segments,
    parse_transcript,
    participants_from_segments,
)


class MeetingService:
    def __init__(self, db: Session, *, summarizer: SummaryService | None = None) -> None:
        self.db = db
        self.meetings = MeetingRepository(db)
        self.action_items = ActionItemRepository(db)
        self.transcripts = TranscriptRepository(db)
        self.comments = CommentRepository(db)
        self.summarizer = summarizer or summary_service

    # ------------------------------------------------------------------ #
    # Reads
    # ------------------------------------------------------------------ #
    def list_meetings(
        self,
        *,
        query: str | None = None,
        participant: str | None = None,
        tag: str | None = None,
        date_from: date | None = None,
        date_to: date | None = None,
        sort: str = "recent",
        limit: int | None = None,
    ) -> MeetingListResponse:
        filters = MeetingFilters(
            query=query,
            participant=participant,
            tag=tag,
            date_from=date_from,
            date_to=date_to,
            sort=sort,
        )
        meetings = self.meetings.list(filters, limit=limit)
        total = self.meetings.count(filters)
        return MeetingListResponse(items=[serializers.meeting_list_item(m) for m in meetings], total=total)

    def get_meeting(self, meeting_id: str) -> Meeting:
        meeting = self.meetings.get(meeting_id)
        if meeting is None:
            raise NotFoundError(f"Meeting '{meeting_id}' was not found.")
        return meeting

    def export_meeting(self, meeting_id: str, fmt: str) -> tuple[str, str, str | bytes]:
        """Render a meeting as a downloadable document.

        Returns ``(filename, media_type, content)`` so the route stays free of
        formatting logic. Unsupported formats fail as a 400 with a clear detail.
        """

        if not is_supported_format(fmt):
            supported = ", ".join(sorted(EXPORT_FORMATS))
            raise BadRequestError(f"Unsupported export format '{fmt}'. Supported formats: {supported}.")

        detail = self.get_detail(meeting_id)
        return export_filename(detail, fmt), EXPORT_FORMATS[fmt]["media_type"], render_export(detail, fmt)

    def get_detail(self, meeting_id: str) -> MeetingDetail:
        return serializers.meeting_detail(self.get_meeting(meeting_id))

    def list_participants(self) -> list[ParticipantSummary]:
        return [
            ParticipantSummary(
                id=participant.id,
                name=participant.display_name,
                email=participant.email,
                meeting_count=count,
            )
            for participant, count in self.meetings.list_participants_with_counts()
        ]

    # ------------------------------------------------------------------ #
    # Comments
    # ------------------------------------------------------------------ #
    def list_comments(self, meeting_id: str) -> list[CommentOut]:
        meeting = self.get_meeting(meeting_id)
        return [serializers.comment_out(comment) for comment in self.comments.list_for_meeting(meeting.id)]

    def add_comment(self, meeting_id: str, payload: CommentCreate) -> CommentOut:
        meeting = self.get_meeting(meeting_id)

        segment_id = (payload.segment_id or "").strip() or None
        if segment_id and not self.comments.segment_belongs_to_meeting(meeting.id, segment_id):
            raise NotFoundError(f"Transcript segment '{segment_id}' was not found in this meeting.")

        comment = MeetingComment(
            id=new_id("cmt"),
            meeting_id=meeting.id,
            segment_id=segment_id,
            author_name=settings.default_user_name,
            body=payload.body,
            created_at=utcnow(),
            updated_at=utcnow(),
        )
        self.comments.add(comment)
        self.db.commit()
        self.db.refresh(comment)
        return serializers.comment_out(comment)

    def update_comment(self, comment_id: str, payload: CommentUpdate) -> CommentOut:
        comment = self._get_comment(comment_id)
        comment.body = payload.body
        comment.updated_at = utcnow()
        self.db.commit()
        self.db.refresh(comment)
        return serializers.comment_out(comment)

    def delete_comment(self, comment_id: str) -> None:
        comment = self._get_comment(comment_id)
        self.comments.delete(comment)
        self.db.commit()

    def _get_comment(self, comment_id: str) -> MeetingComment:
        comment = self.comments.get(comment_id)
        if comment is None:
            raise NotFoundError(f"Comment '{comment_id}' was not found.")
        return comment

    def list_tags(self) -> list[TagSummary]:
        """Every tag in the workspace with its meeting count (for the filter menu)."""

        return [
            TagSummary(name=name, meeting_count=count)
            for name, count in self.meetings.tag_counts()
        ]

    def get_default_user(self) -> UserOut:
        user = self.db.get(User, settings.default_user_id)
        if user is None:
            raise NotFoundError("The default user is missing. Run the seed command.")
        return serializers.user_out(user)

    def get_stats(self) -> StatsOut:
        total_seconds = self.meetings.total_transcript_seconds()
        minutes = round(total_seconds / 60)
        
        user = self.db.get(User, settings.default_user_id)
        minutes_used = user.transcription_minutes_used if user else minutes

        open_items, done_items = self.meetings.action_item_stats()
        quota = settings.transcription_minutes_quota
        return StatsOut(
            meeting_count=self.meetings.count_all(),
            transcript_minutes=minutes,
            transcription_minutes_quota=quota,
            transcription_minutes_left=max(0, quota - minutes_used),
            open_action_items=open_items,
            completed_action_items=done_items,
            participant_count=self.meetings.participant_count(),
        )

    def health(self) -> HealthOut:
        from app.db.init_db import schema_status

        status = schema_status()
        return HealthOut(
            status="ok",
            version=settings.app_version,
            database=settings.database_url.split("///")[-1],
            tables=list(status["tables"]),  # type: ignore[arg-type]
            meeting_count=self.meetings.count_all(),
        )

    # ------------------------------------------------------------------ #
    # Meeting writes
    # ------------------------------------------------------------------ #
    def create_meeting(self, payload: MeetingCreate, *, source_type: str = "manual") -> MeetingDetail:
        title = payload.title.strip()
        started_at = payload.started_at or utcnow()

        segments: list[dict[str, Any]] = []
        if payload.transcript_text and payload.transcript_text.strip():
            segments = parse_transcript(payload.transcript_text)
        elif source_type == "import":
            raise BadRequestError("The uploaded transcript did not contain any usable segments.")

        participant_names = payload.participants or participants_from_segments(segments)
        if not participant_names and payload.host_name:
            participant_names = [payload.host_name]

        duration = payload.duration_seconds or duration_from_segments(segments)
        meeting = Meeting(
            id=new_id("mtg"),
            owner_id=settings.default_user_id,
            title=title,
            started_at=started_at,
            duration_seconds=max(0, int(duration)),
            host_name=payload.host_name or (participant_names[0] if participant_names else settings.default_user_name),
            source_type=source_type,
            tags_json=serializers.tags_json(normalise_tags(payload.tags) or []),
            created_at=utcnow(),
            updated_at=utcnow(),
        )
        self.meetings.add(meeting)
        self.meetings.replace_participants(meeting, participant_names)

        if segments:
            self.transcripts.replace_all(meeting.id, segments)
            meeting.duration_seconds = max(meeting.duration_seconds, duration_from_segments(segments))

        self._generate_summary(meeting, segments, reference_date=started_at.date())
        
        user = self.db.get(User, settings.default_user_id)
        if user:
            user.transcription_minutes_used += round(meeting.duration_seconds / 60)
            
        self.db.commit()
        self.db.refresh(meeting)
        return serializers.meeting_detail(meeting)

    def import_meeting(
        self,
        *,
        filename: str,
        content: bytes,
        title: str | None = None,
        participants: str | None = None,
        tags: str | None = None,
        started_at: datetime | None = None,
    ) -> MeetingDetail:
        if len(content) > settings.max_upload_bytes:
            raise BadRequestError(
                f"File is too large ({len(content)} bytes). Maximum allowed is {settings.max_upload_bytes} bytes."
            )
        try:
            text = content.decode("utf-8-sig")
        except UnicodeDecodeError as exc:
            raise BadRequestError("The uploaded file must be UTF-8 encoded text.") from exc

        segments = parse_transcript(text, filename=filename)
        name_list = [name.strip() for name in (participants or "").split(",") if name.strip()]
        if not name_list:
            name_list = participants_from_segments(segments)

        resolved_title = (title or "").strip() or self._title_from_filename(filename)
        payload = MeetingCreate(
            title=resolved_title,
            started_at=started_at,
            participants=name_list,
            tags=[tag.strip() for tag in (tags or "").split(",") if tag.strip()],
            transcript_text="",  # segments are supplied directly below
        )
        return self._create_with_segments(
            payload, segments=segments, source_type="import", reference_date=(started_at or utcnow()).date()
        )

    def update_meeting(self, meeting_id: str, payload: MeetingUpdate) -> MeetingDetail:
        meeting = self.get_meeting(meeting_id)
        if payload.title is not None:
            meeting.title = payload.title.strip()
        if payload.host_name is not None:
            meeting.host_name = payload.host_name.strip() or None
        if payload.started_at is not None:
            meeting.started_at = payload.started_at
        if payload.participants is not None:
            self.meetings.replace_participants(meeting, payload.participants)
        if payload.tags is not None:
            meeting.tags_json = serializers.tags_json(normalise_tags(payload.tags) or [])
        meeting.updated_at = utcnow()
        self.db.commit()
        self.db.refresh(meeting)
        return serializers.meeting_detail(meeting)

    def delete_meeting(self, meeting_id: str) -> None:
        meeting = self.get_meeting(meeting_id)
        self.meetings.delete(meeting)
        self.db.commit()

    # ------------------------------------------------------------------ #
    # Transcript
    # ------------------------------------------------------------------ #
    def list_segments(self, meeting_id: str) -> list[TranscriptSegmentOut]:
        meeting = self.get_meeting(meeting_id)
        return list(serializers.transcript_out(meeting).segments)

    def update_segment_text(
        self, meeting_id: str, segment_id: str, payload: TranscriptSegmentUpdate
    ) -> TranscriptSegmentOut:
        meeting = self.get_meeting(meeting_id)
        segment = self.transcripts.get_segment(meeting.id, segment_id)
        if segment is None:
            raise NotFoundError(f"Transcript segment '{segment_id}' was not found in this meeting.")
        self.transcripts.update_text(segment, payload.text)
        meeting.updated_at = utcnow()
        self.db.commit()
        return TranscriptSegmentOut(
            id=segment.id,
            speaker=segment.speaker_name,
            start_seconds=segment.start_seconds,
            end_seconds=segment.end_seconds,
            sequence=segment.sequence,
            text=segment.text,
        )

    def replace_transcript(self, meeting_id: str, transcript_text: str) -> MeetingDetail:
        """Re-import a transcript for an existing meeting and regenerate AI notes."""

        meeting = self.get_meeting(meeting_id)
        segments = parse_transcript(transcript_text)
        self.transcripts.replace_all(meeting.id, segments)
        meeting.duration_seconds = max(duration_from_segments(segments), meeting.duration_seconds)
        meeting.updated_at = utcnow()
        self._generate_summary(meeting, segments, reference_date=meeting.started_at.date())
        self.db.commit()
        self.db.refresh(meeting)
        return serializers.meeting_detail(meeting)

    def regenerate_summary(self, meeting_id: str) -> MeetingDetail:
        meeting = self.get_meeting(meeting_id)
        segments = [
            {
                "speaker": segment.speaker_name,
                "start_seconds": segment.start_seconds,
                "end_seconds": segment.end_seconds,
                "text": segment.text,
            }
            for segment in sorted(meeting.transcript_segments, key=lambda item: item.sequence)
        ]
        self._generate_summary(meeting, segments, reference_date=meeting.started_at.date(), replace=True)
        meeting.updated_at = utcnow()
        self.db.commit()
        self.db.refresh(meeting)
        return serializers.meeting_detail(meeting)

    # ------------------------------------------------------------------ #
    # Action items
    # ------------------------------------------------------------------ #
    def list_action_items(self, meeting_id: str) -> list[ActionItemOut]:
        meeting = self.get_meeting(meeting_id)
        return [serializers.action_item_out(item) for item in meeting.action_items]

    def create_action_item(self, meeting_id: str, payload: ActionItemCreate) -> ActionItemOut:
        meeting = self.get_meeting(meeting_id)
        item = self.action_items.create(
            meeting_id=meeting.id,
            title=payload.title,
            assignee=payload.assignee,
            due_date=payload.due_date,
        )
        if item.assignee:
            self._ensure_participant(item.assignee)
        meeting.updated_at = utcnow()
        self.db.commit()
        return serializers.action_item_out(item)

    def update_action_item(self, action_item_id: str, payload: ActionItemUpdate) -> ActionItemOut:
        item = self.action_items.get(action_item_id)
        if item is None:
            raise NotFoundError(f"Action item '{action_item_id}' was not found.")
        changes: dict[str, Any] = {}
        if payload.title is not None:
            changes["title"] = payload.title
        if payload.assignee is not None:
            changes["assignee"] = payload.assignee or None
        if payload.due_date is not None:
            changes["due_date"] = payload.due_date
        if payload.completed is not None:
            changes["completed"] = payload.completed
        self.action_items.update(item, **changes)
        if item.assignee:
            self._ensure_participant(item.assignee)
        self.db.commit()
        return serializers.action_item_out(item)

    def delete_action_item(self, action_item_id: str) -> None:
        item = self.action_items.get(action_item_id)
        if item is None:
            raise NotFoundError(f"Action item '{action_item_id}' was not found.")
        self.action_items.delete(item)
        self.db.commit()

    # ------------------------------------------------------------------ #
    # Internals
    # ------------------------------------------------------------------ #
    def _create_with_segments(
        self,
        payload: MeetingCreate,
        *,
        segments: list[dict[str, Any]],
        source_type: str,
        reference_date: date,
    ) -> MeetingDetail:
        participant_names = payload.participants or participants_from_segments(segments)
        if not participant_names and payload.host_name:
            participant_names = [payload.host_name]

        meeting = Meeting(
            id=new_id("mtg"),
            owner_id=settings.default_user_id,
            title=payload.title.strip(),
            started_at=payload.started_at or utcnow(),
            duration_seconds=duration_from_segments(segments),
            tags_json=serializers.tags_json(normalise_tags(payload.tags) or []),
            host_name=payload.host_name or (participant_names[0] if participant_names else settings.default_user_name),
            source_type=source_type,
            created_at=utcnow(),
            updated_at=utcnow(),
        )
        self.meetings.add(meeting)
        self.meetings.replace_participants(meeting, participant_names)
        self.transcripts.replace_all(meeting.id, segments)
        self._generate_summary(meeting, segments, reference_date=reference_date)
        self.db.commit()
        self.db.refresh(meeting)
        return serializers.meeting_detail(meeting)

    def _generate_summary(
        self,
        meeting: Meeting,
        segments: list[dict[str, Any]],
        *,
        reference_date: date | None = None,
        replace: bool = False,
    ) -> None:
        if not segments and not replace:
            summary = meeting.summary or MeetingSummary(id=new_id("sum"), meeting_id=meeting.id)
            summary.overview = (
                f"{meeting.title} has no transcript yet. Import or paste a transcript to generate "
                "AI notes, key points and action items."
            )
            summary.key_points_json = json.dumps([])
            summary.topics_json = json.dumps([])
            if meeting.summary is None:
                self.db.add(summary)
            self.db.flush()
            return

        result = self.summarizer.build_summary(
            segments,
            meeting_title=meeting.title,
            reference_date=reference_date or meeting.started_at.date(),
        )
        summary = meeting.summary or MeetingSummary(id=new_id("sum"), meeting_id=meeting.id)
        serializers.store_summary(
            summary,
            overview=result.overview,
            key_points=result.key_points,
            topics=result.topics,
            sections=[
                (section.title, section.timestamp_seconds, section.bullets) for section in result.sections
            ],
        )
        if meeting.summary is None:
            self.db.add(summary)
        self.db.flush()

        if not meeting.action_items:
            for suggestion in result.action_items:
                due = None
                if suggestion.due_date:
                    try:
                        due = date.fromisoformat(suggestion.due_date)
                    except ValueError:
                        due = None
                self.db.add(
                    ActionItem(
                        id=new_id("ait"),
                        meeting_id=meeting.id,
                        title=suggestion.title,
                        assignee=suggestion.assignee,
                        due_date=due,
                        completed=False,
                        created_at=utcnow(),
                        updated_at=utcnow(),
                    )
                )
            self.db.flush()

    def _ensure_participant(self, display_name: str) -> None:
        self.meetings.get_or_create_participant(display_name)

    @staticmethod
    def _title_from_filename(filename: str) -> str:
        stem = filename.rsplit("/", 1)[-1]
        if "." in stem:
            stem = stem.rsplit(".", 1)[0]
        cleaned = stem.replace("_", " ").replace("-", " ").strip()
        return (cleaned[:1].upper() + cleaned[1:]) if cleaned else "Imported meeting"
