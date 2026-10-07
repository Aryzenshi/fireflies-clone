"""Database seeding.

Usage
-----
    python -m app.seed            # insert demo meetings that are missing (idempotent)
    python -m app.seed --force    # replace existing *seed* meetings with a fresh copy
    python -m app.seed --reset    # delete every meeting, then seed from scratch

The seed dataset lives in ``app/seed_data/meetings.json`` and is original content
written for this assignment.
"""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from pathlib import Path
from typing import Any

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.db.base import utcnow
from app.db.init_db import init_db
from app.db.session import SessionLocal
from app.models import ActionItem, Meeting, MeetingSummary, Participant, SummarySection, TranscriptSegment
from app.repositories import MeetingFilters, MeetingRepository
from app.services.serializers import section_bullets_json
from app.services.transcript_parser import ParsedSegment, normalize_segments

SEED_FILE = Path(__file__).resolve().parent / "seed_data" / "meetings.json"


@dataclass(slots=True)
class SeedResult:
    created: int = 0
    skipped: int = 0

    @property
    def total(self) -> int:
        return self.created + self.skipped


def load_seed_meetings() -> list[dict[str, Any]]:
    with SEED_FILE.open(encoding="utf-8") as handle:
        payload = json.load(handle)
    meetings = payload.get("meetings")
    if not isinstance(meetings, list) or not meetings:
        raise RuntimeError(f"Seed file {SEED_FILE} does not contain any meetings.")
    return meetings


def _started_at(raw: dict[str, Any], reference: datetime) -> datetime:
    days_ago = int(raw.get("days_ago", 0))
    clock = str(raw.get("time", "09:00"))
    hour, minute = (int(part) for part in clock.split(":"))
    base_day = (reference - timedelta(days=days_ago)).date()
    return datetime.combine(base_day, time(hour=hour, minute=minute))


def _scale_to_duration(segments: list[dict[str, Any]], target_seconds: int | None) -> list[dict[str, Any]]:
    """Stretch segment timings so a seeded meeting lands on its documented length.

    The authored transcripts use short, readable timestamps; scaling keeps their
    relative pacing while producing the realistic meeting durations promised by
    the seed specification (e.g. 29:10, 41:32).
    """

    if not segments or not target_seconds:
        return segments
    last_end = max(int(segment["end_seconds"]) for segment in segments)
    if last_end <= 0 or target_seconds <= last_end:
        return segments

    factor = target_seconds / last_end
    scaled: list[dict[str, Any]] = []
    for segment in segments:
        start = int(round(int(segment["start_seconds"]) * factor))
        end = int(round(int(segment["end_seconds"]) * factor))
        if scaled:
            start = max(start, scaled[-1]["end_seconds"])
        end = max(end, start + 1)
        scaled.append({**segment, "start_seconds": start, "end_seconds": end})
    scaled[-1]["end_seconds"] = max(scaled[-1]["end_seconds"], target_seconds)
    return scaled


def _segments(raw_segments: list[dict[str, Any]], target_seconds: int | None = None) -> list[dict[str, Any]]:
    """Turn the compact seed transcript into normalised segment dictionaries."""

    parsed = [
        ParsedSegment(
            speaker=str(item.get("speaker") or "Speaker"),
            start_seconds=int(item.get("start") or 0),
            end_seconds=int(item.get("end") or 0),
            text=str(item.get("text") or ""),
        )
        for item in raw_segments
    ]
    for index, segment in enumerate(parsed):
        if segment.end_seconds <= segment.start_seconds:
            next_start = (
                parsed[index + 1].start_seconds
                if index + 1 < len(parsed)
                else segment.start_seconds + max(4, round(len(segment.text.split()) / 2.4))
            )
            segment.end_seconds = max(segment.start_seconds + 1, next_start)
    return _scale_to_duration(normalize_segments(parsed), target_seconds)


def _create_meeting(
    db: Session,
    repository: MeetingRepository,
    raw: dict[str, Any],
    *,
    reference: datetime,
) -> Meeting:
    segments = _segments(raw.get("transcript", []), raw.get("duration_target_seconds"))
    duration = int(segments[-1]["end_seconds"]) if segments else 0

    meeting = Meeting(
        id=str(raw["id"]),
        owner_id="usr_default",
        title=str(raw["title"]),
        started_at=_started_at(raw, reference),
        duration_seconds=duration,
        host_name=raw.get("host_name"),
        source_type="seed",
        tags_json=section_bullets_json([str(tag) for tag in raw.get("tags", [])]),
        created_at=utcnow(),
        updated_at=utcnow(),
    )
    db.add(meeting)
    db.flush()

    participant_names = [str(name) for name in raw.get("participants", [])]
    if not participant_names:
        participant_names = list(dict.fromkeys(str(segment["speaker"]) for segment in segments))
    meeting.participants = [repository.get_or_create_participant(name) for name in participant_names]

    for index, segment in enumerate(segments):
        db.add(
            TranscriptSegment(
                id=f"{raw['id']}_seg_{index + 1:03d}",
                meeting_id=meeting.id,
                sequence=index,
                speaker_name=str(segment["speaker"]),
                start_seconds=int(segment["start_seconds"]),
                end_seconds=int(segment["end_seconds"]),
                text=str(segment["text"]),
                created_at=utcnow(),
                updated_at=utcnow(),
            )
        )

    summary = MeetingSummary(
        id=f"{raw['id']}_summary",
        meeting_id=meeting.id,
        overview=str(raw.get("overview", "")),
        key_points_json=section_bullets_json([str(point) for point in raw.get("key_points", [])]),
        topics_json=section_bullets_json([str(topic) for topic in raw.get("topics", [])]),
        created_at=utcnow(),
        updated_at=utcnow(),
    )
    db.add(summary)
    for index, section in enumerate(raw.get("sections", [])):
        db.add(
            SummarySection(
                id=f"{raw['id']}_sec_{index + 1:02d}",
                summary_id=summary.id,
                title=str(section["title"]),
                timestamp_seconds=section.get("timestamp_seconds"),
                bullets_json=section_bullets_json([str(bullet) for bullet in section.get("bullets", [])]),
                sequence=index,
            )
        )

    for index, item in enumerate(raw.get("action_items", [])):
        due_in_days = item.get("due_in_days")
        due_date: date | None = (
            reference.date() + timedelta(days=int(due_in_days)) if due_in_days is not None else None
        )
        db.add(
            ActionItem(
                id=f"{raw['id']}_ait_{index + 1:02d}",
                meeting_id=meeting.id,
                title=str(item["title"]),
                assignee=item.get("assignee"),
                due_date=due_date,
                completed=bool(item.get("completed", False)),
                created_at=utcnow(),
                updated_at=utcnow(),
            )
        )

    db.flush()
    return meeting


def _clear_meetings(db: Session, *, only_seed: bool) -> None:
    """Delete meetings (cascades to transcripts, summaries and action items)."""

    if only_seed:
        ids = list(db.scalars(select(Meeting.id).where(Meeting.source_type == "seed")))
        for meeting_id in ids:
            meeting = db.get(Meeting, meeting_id)
            if meeting is not None:
                db.delete(meeting)
    else:
        for meeting in db.scalars(select(Meeting)).all():
            db.delete(meeting)
            # Explicit deletes keep SQLite consistent even without FK cascades.
            db.execute(delete(SummarySection).where(SummarySection.summary_id.like(f"{meeting.id}%")))
    db.flush()


def seed_database(
    db: Session,
    *,
    force: bool = False,
    reset: bool = False,
    reference: datetime | None = None,
) -> SeedResult:
    """Insert the demo dataset. Safe to run repeatedly."""

    reference = reference or utcnow()
    repository = MeetingRepository(db)
    result = SeedResult()

    if reset:
        _clear_meetings(db, only_seed=False)
        for participant in db.scalars(select(Participant)).all():
            db.delete(participant)
        db.flush()
    elif force:
        _clear_meetings(db, only_seed=True)

    for raw in load_seed_meetings():
        if db.get(Meeting, str(raw["id"])) is not None:
            result.skipped += 1
            continue
        if repository.get_by_title(str(raw["title"])) is not None:
            result.skipped += 1
            continue
        _create_meeting(db, repository, raw, reference=reference)
        result.created += 1

    db.commit()
    return result


def main() -> None:  # pragma: no cover - CLI entry point
    parser = argparse.ArgumentParser(description="Seed the Fireflies clone database with demo meetings.")
    parser.add_argument("--force", action="store_true", help="replace existing seed meetings")
    parser.add_argument("--reset", action="store_true", help="delete all meetings before seeding")
    args = parser.parse_args()

    init_db()
    with SessionLocal() as db:
        result = seed_database(db, force=args.force, reset=args.reset)
    print(
        f"Seed complete: {result.created} created, {result.skipped} skipped "
        f"(use --force to replace existing seed data)."
    )


if __name__ == "__main__":  # pragma: no cover
    main()
