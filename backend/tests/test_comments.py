"""Comment tests: anchoring, CRUD, validation and cascade behaviour."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

TRANSCRIPT = (
    "00:00 Ada Lovelace: Let's review the migration plan.\n"
    "00:30 Grace Hopper: The rollback step needs a rehearsal.\n"
    "01:10 Ada Lovelace: Agreed, I'll book it for Thursday.\n"
)


@pytest.fixture()
def commented_meeting(client: TestClient) -> dict:
    created = client.post(
        "/api/meetings",
        json={"title": "Comment Fixture", "participants": ["Ada Lovelace"], "transcript_text": TRANSCRIPT},
    )
    assert created.status_code == 201, created.text
    meeting = created.json()
    yield meeting
    client.delete(f"/api/meetings/{meeting['id']}")


def test_comment_on_a_transcript_line_carries_its_anchor(client: TestClient, commented_meeting: dict) -> None:
    meeting_id = commented_meeting["id"]
    segment = commented_meeting["transcript"]["segments"][1]

    created = client.post(
        f"/api/meetings/{meeting_id}/comments",
        json={"body": "  We should add a canary step here.  ", "segment_id": segment["id"]},
    )
    assert created.status_code == 201, created.text
    comment = created.json()

    assert comment["body"] == "We should add a canary step here."  # trimmed
    assert comment["segment_id"] == segment["id"]
    assert comment["anchor_start_seconds"] == segment["start_seconds"] == 30
    assert comment["anchor_speaker"] == segment["speaker"] == "Grace Hopper"
    assert comment["anchor_text"] == segment["text"]
    assert comment["author_name"]  # the default user, never blank

    # the detail payload carries the comments so the notepad needs one request
    detail = client.get(f"/api/meetings/{meeting_id}").json()
    assert [item["id"] for item in detail["comments"]] == [comment["id"]]
    assert detail["comments"][0]["anchor_start_seconds"] == 30


def test_comment_without_an_anchor_is_allowed(client: TestClient, commented_meeting: dict) -> None:
    created = client.post(
        f"/api/meetings/{commented_meeting['id']}/comments",
        json={"body": "General note about this meeting."},
    )
    assert created.status_code == 201
    comment = created.json()
    assert comment["segment_id"] is None
    assert comment["anchor_start_seconds"] is None


def test_comment_edit_and_delete_persist(client: TestClient, commented_meeting: dict) -> None:
    meeting_id = commented_meeting["id"]
    comment = client.post(
        f"/api/meetings/{meeting_id}/comments", json={"body": "First draft"}
    ).json()

    edited = client.patch(f"/api/comments/{comment['id']}", json={"body": "Second draft"})
    assert edited.status_code == 200
    assert edited.json()["body"] == "Second draft"
    assert edited.json()["updated_at"] is not None

    # persists across a fresh read
    listed = client.get(f"/api/meetings/{meeting_id}/comments").json()
    assert [item["body"] for item in listed] == ["Second draft"]

    deleted = client.delete(f"/api/comments/{comment['id']}")
    assert deleted.status_code == 200
    assert deleted.json() == {"deleted": True}
    assert client.get(f"/api/meetings/{meeting_id}/comments").json() == []


def test_comment_validation_and_unknown_ids(client: TestClient, commented_meeting: dict) -> None:
    meeting_id = commented_meeting["id"]

    blank = client.post(f"/api/meetings/{meeting_id}/comments", json={"body": "   "})
    assert blank.status_code == 422

    too_long = client.post(f"/api/meetings/{meeting_id}/comments", json={"body": "x" * 2001})
    assert too_long.status_code == 422

    unknown_field = client.post(
        f"/api/meetings/{meeting_id}/comments", json={"body": "hi", "author": "someone else"}
    )
    assert unknown_field.status_code == 422  # extra="forbid": the author is always the signed-in user

    unknown_meeting = client.post("/api/meetings/nope/comments", json={"body": "hi"})
    assert unknown_meeting.status_code == 404

    unknown_comment = client.patch("/api/comments/nope", json={"body": "hi"})
    assert unknown_comment.status_code == 404


def test_a_comment_cannot_anchor_to_another_meetings_segment(
    client: TestClient, commented_meeting: dict
) -> None:
    other = client.post(
        "/api/meetings",
        json={"title": "Other Comment Fixture", "transcript_text": "00:00 Someone Else: unrelated line\n"},
    ).json()
    try:
        foreign_segment = other["transcript"]["segments"][0]["id"]
        response = client.post(
            f"/api/meetings/{commented_meeting['id']}/comments",
            json={"body": "cross-meeting anchor", "segment_id": foreign_segment},
        )
        assert response.status_code == 404
        assert "was not found in this meeting" in response.json()["detail"]
    finally:
        client.delete(f"/api/meetings/{other['id']}")


def test_deleting_a_meeting_deletes_its_comments(client: TestClient) -> None:
    created = client.post(
        "/api/meetings",
        json={
            "title": "Cascade Comment Fixture",
            "transcript_text": "00:00 Ada Lovelace: cascade check\n",
        },
    ).json()
    meeting_id = created["id"]
    segment_id = created["transcript"]["segments"][0]["id"]

    anchored = client.post(
        f"/api/meetings/{meeting_id}/comments", json={"body": "anchored", "segment_id": segment_id}
    ).json()
    floating = client.post(f"/api/meetings/{meeting_id}/comments", json={"body": "floating"}).json()

    assert client.delete(f"/api/meetings/{meeting_id}").status_code == 200

    # both the meeting's comments and their anchored rows are gone
    assert client.patch(f"/api/comments/{anchored['id']}", json={"body": "x"}).status_code == 404
    assert client.patch(f"/api/comments/{floating['id']}", json={"body": "x"}).status_code == 404


def test_replacing_a_transcript_removes_comments_anchored_to_it(
    client: TestClient, commented_meeting: dict
) -> None:
    meeting_id = commented_meeting["id"]
    segment_id = commented_meeting["transcript"]["segments"][0]["id"]
    anchored = client.post(
        f"/api/meetings/{meeting_id}/comments", json={"body": "anchored", "segment_id": segment_id}
    ).json()
    floating = client.post(f"/api/meetings/{meeting_id}/comments", json={"body": "floating"}).json()

    replaced = client.post(
        f"/api/meetings/{meeting_id}/transcript",
        json={"transcript_text": "00:00 Grace Hopper: A brand new transcript.\n"},
    )
    assert replaced.status_code == 200

    remaining = [item["id"] for item in client.get(f"/api/meetings/{meeting_id}/comments").json()]
    # the anchored comment cannot survive a transcript swap; the floating one does
    assert anchored["id"] not in remaining
    assert floating["id"] in remaining
