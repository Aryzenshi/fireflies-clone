"""Pydantic schemas for meetings, transcripts, summaries and action items.

These are the API contract objects; ORM entities are never returned directly.
"""

from __future__ import annotations

import json
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.common import UTCDateTime, parse_datetime

# --------------------------------------------------------------------------- #
# Participants
# --------------------------------------------------------------------------- #


class ParticipantOut(BaseModel):
    id: str
    name: str
    email: str | None = None


class ParticipantSummary(ParticipantOut):
    meeting_count: int = 0


# --------------------------------------------------------------------------- #
# Transcript
# --------------------------------------------------------------------------- #


class TranscriptSegmentOut(BaseModel):
    id: str
    speaker: str
    start_seconds: int = Field(ge=0)
    end_seconds: int = Field(ge=0)
    sequence: int
    text: str


class TranscriptOut(BaseModel):
    segments: list[TranscriptSegmentOut] = Field(default_factory=list)


class TranscriptSegmentUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    text: str = Field(min_length=1, max_length=5000)

    @field_validator("text")
    @classmethod
    def _strip(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("text must not be blank")
        return cleaned


# --------------------------------------------------------------------------- #
# Summary
# --------------------------------------------------------------------------- #


class SummarySectionOut(BaseModel):
    id: str
    title: str
    timestamp_seconds: int | None = None
    bullets: list[str] = Field(default_factory=list)


class SummaryOut(BaseModel):
    overview: str
    key_points: list[str] = Field(default_factory=list)
    sections: list[SummarySectionOut] = Field(default_factory=list)
    topics: list[str] = Field(default_factory=list)
    generated_by: str = "deterministic-extractive"

    @staticmethod
    def bullets_from_json(raw: str) -> list[str]:
        try:
            data = json.loads(raw or "[]")
        except json.JSONDecodeError:
            return []
        return [str(item) for item in data] if isinstance(data, list) else []


# --------------------------------------------------------------------------- #
# Action items
# --------------------------------------------------------------------------- #


class ActionItemOut(BaseModel):
    id: str
    meeting_id: str
    title: str
    assignee: str | None = None
    due_date: date | None = None
    completed: bool = False
    created_at: UTCDateTime | None = None
    updated_at: UTCDateTime | None = None


class ActionItemCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1, max_length=400)
    assignee: str | None = Field(default=None, max_length=160)
    due_date: date | None = None

    @field_validator("title")
    @classmethod
    def _strip_title(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("title must not be blank")
        return cleaned

    @field_validator("assignee")
    @classmethod
    def _strip_assignee(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None


class ActionItemUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str | None = Field(default=None, min_length=1, max_length=400)
    assignee: str | None = Field(default=None, max_length=160)
    due_date: date | None = None
    completed: bool | None = None

    @field_validator("title")
    @classmethod
    def _strip_title(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("title must not be blank")
        return cleaned

    @field_validator("assignee")
    @classmethod
    def _strip_assignee(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        return cleaned or None


# --------------------------------------------------------------------------- #
# Meetings
# --------------------------------------------------------------------------- #


class MeetingListItem(BaseModel):
    id: str
    title: str
    started_at: UTCDateTime
    duration_seconds: int
    host_name: str | None = None
    source_type: str
    participants: list[ParticipantOut] = Field(default_factory=list)
    action_item_count: int = 0
    open_action_item_count: int = 0
    topics: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)


class CommentOut(BaseModel):
    id: str
    meeting_id: str
    segment_id: str | None = None
    body: str
    author_name: str
    created_at: UTCDateTime | None = None
    updated_at: UTCDateTime | None = None

    # Anchor details, denormalised so the UI can jump to the timestamp without a lookup.
    anchor_start_seconds: int | None = None
    anchor_speaker: str | None = None
    anchor_text: str | None = None


class CommentCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    body: str = Field(min_length=1, max_length=2000)
    segment_id: str | None = Field(default=None, max_length=60)

    @field_validator("body")
    @classmethod
    def _strip_body(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("a comment cannot be empty")
        return cleaned


class CommentUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    body: str = Field(min_length=1, max_length=2000)

    @field_validator("body")
    @classmethod
    def _strip_body(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("a comment cannot be empty")
        return cleaned


class TagSummary(BaseModel):
    """A tag used in the workspace and how many meetings carry it."""

    name: str
    meeting_count: int = 0


class MeetingListResponse(BaseModel):
    items: list[MeetingListItem]
    total: int


class MeetingDetail(BaseModel):
    id: str
    title: str
    started_at: UTCDateTime
    duration_seconds: int
    host_name: str | None = None
    source_type: str
    created_at: UTCDateTime | None = None
    updated_at: UTCDateTime | None = None
    participants: list[ParticipantOut] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    summary: SummaryOut
    action_items: list[ActionItemOut] = Field(default_factory=list)
    comments: list[CommentOut] = Field(default_factory=list)
    transcript: TranscriptOut


class MeetingCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1, max_length=300)
    started_at: datetime | None = None
    participants: list[str] = Field(default_factory=list, max_length=60)
    tags: list[str] = Field(default_factory=list)
    host_name: str | None = Field(default=None, max_length=160)
    transcript_text: str | None = None
    duration_seconds: int | None = Field(default=None, ge=0)

    @field_validator("tags")
    @classmethod
    def _clean_tags(cls, value: list[str]) -> list[str]:
        # Raises ValueError inside the validator, so FastAPI answers 422 rather than 500.
        return normalise_tags(value) or []

    @field_validator("title")
    @classmethod
    def _strip_title(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("title must not be blank")
        return cleaned

    @field_validator("started_at")
    @classmethod
    def _normalise_started_at(cls, value: datetime | None) -> datetime | None:
        return parse_datetime(value)

    @field_validator("participants")
    @classmethod
    def _clean_participants(cls, value: list[str]) -> list[str]:
        cleaned: list[str] = []
        for item in value:
            name = (item or "").strip()
            if name and name not in cleaned:
                cleaned.append(name[:160])
        return cleaned


MAX_TAGS = 12
MAX_TAG_LENGTH = 32


def normalise_tags(values: list[str] | None) -> list[str] | None:
    """Trim, drop blanks, de-duplicate case-insensitively and cap the count.

    Order is preserved (first occurrence wins) so the UI shows tags as typed.
    """

    if values is None:
        return None
    seen: set[str] = set()
    result: list[str] = []
    for raw in values:
        tag = " ".join(str(raw).split())
        if not tag:
            continue
        if len(tag) > MAX_TAG_LENGTH:
            raise ValueError(f"each tag must be at most {MAX_TAG_LENGTH} characters")
        key = tag.lower()
        if key in seen:
            continue
        seen.add(key)
        result.append(tag)
    if len(result) > MAX_TAGS:
        raise ValueError(f"a meeting can have at most {MAX_TAGS} tags")
    return result


class MeetingUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str | None = Field(default=None, min_length=1, max_length=300)
    participants: list[str] | None = Field(default=None, max_length=60)
    tags: list[str] | None = None
    started_at: datetime | None = None
    host_name: str | None = Field(default=None, max_length=160)

    @field_validator("tags")
    @classmethod
    def _clean_tags(cls, value: list[str] | None) -> list[str] | None:
        return normalise_tags(value)

    @field_validator("title")
    @classmethod
    def _strip_title(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("title must not be blank")
        return cleaned

    @field_validator("started_at")
    @classmethod
    def _normalise_started_at(cls, value: datetime | None) -> datetime | None:
        return parse_datetime(value)

    @field_validator("participants")
    @classmethod
    def _clean_participants(cls, value: list[str] | None) -> list[str] | None:
        if value is None:
            return None
        cleaned: list[str] = []
        for item in value:
            name = (item or "").strip()
            if name and name not in cleaned:
                cleaned.append(name[:160])
        return cleaned


class DeleteResponse(BaseModel):
    deleted: bool = True


# --------------------------------------------------------------------------- #
# Misc
# --------------------------------------------------------------------------- #


class UserOut(BaseModel):
    id: str
    name: str
    email: str
    avatar_url: str | None = None
    initials: str


class StatsOut(BaseModel):
    meeting_count: int
    transcript_minutes: int
    transcription_minutes_quota: int
    transcription_minutes_left: int
    open_action_items: int
    completed_action_items: int
    participant_count: int


class HealthOut(BaseModel):
    status: str
    version: str
    database: str
    tables: list[str] = Field(default_factory=list)
    meeting_count: int = 0
