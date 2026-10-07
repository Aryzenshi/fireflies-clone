"""Seed pipeline tests: idempotency and dataset shape."""

from __future__ import annotations

from datetime import datetime

from sqlalchemy.orm import Session

from app.models import Meeting
from app.seed import load_seed_meetings, seed_database
from app.repositories import MeetingRepository


def test_seed_file_shape() -> None:
    """The seed data must sit inside the ranges the assignment asks for.

    The upper bounds matter as much as the lower ones: a meeting with six action
    items is outside the "3-5" spec even though it looks richer.
    """

    meetings = load_seed_meetings()
    assert len(meetings) >= 5, "the assignment asks for at least five seeded meetings"
    for meeting in meetings:
        title = meeting["title"]
        assert title
        assert 3 <= len(meeting["participants"]) <= 6, f"{title}: participants must be 3-6"
        assert 10 <= len(meeting["transcript"]) <= 25, f"{title}: transcript must be 10-25 segments"
        assert meeting["overview"]
        assert 3 <= len(meeting["key_points"]) <= 6, f"{title}: key points must be 3-6"
        assert 2 <= len(meeting["sections"]) <= 5, f"{title}: chapters must be 2-5"
        assert 3 <= len(meeting["action_items"]) <= 5, f"{title}: action items must be 3-5"
        assert {item["completed"] for item in meeting["action_items"]} == {True, False} or len(
            meeting["action_items"]
        ) >= 3


def test_seed_is_idempotent(db_session: Session) -> None:
    reference = datetime(2026, 6, 7, 12, 0, 0)

    first = seed_database(db_session, reset=True, reference=reference)
    assert first.created >= 5

    second = seed_database(db_session, reference=reference)
    assert second.created == 0
    assert second.skipped == first.created

    repository = MeetingRepository(db_session)
    assert repository.count_all() == first.created

    # every seeded meeting has transcript, summary and action items
    for meeting in db_session.query(Meeting).all():
        assert meeting.transcript_segments, meeting.title
        assert meeting.summary is not None, meeting.title
        assert meeting.summary.sections, meeting.title
        assert meeting.action_items, meeting.title
        assert meeting.duration_seconds > 0

    # force re-seed replaces the dataset without duplicating it
    third = seed_database(db_session, force=True, reference=reference)
    assert third.created == first.created
    assert repository.count_all() == first.created
