"""Tests for the Markdown / plain-text meeting exporters."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

# Deterministic fixture meeting: title with punctuation/spaces (filename slugging),
# a complete action item and an open one, and three timestamped segments.
EXPORT_MEETING = {
    "title": "Export Fixture — Q3 Rollout",
    "participants": ["Ada Lovelace", "Grace Hopper"],
    "transcript_text": (
        "00:00 Ada Lovelace: Welcome, this meeting covers the Q3 rollout plan.\n"
        "00:45 Grace Hopper: I will own the migration checklist and share it on Friday.\n"
        "02:30 Ada Lovelace: We also need a rollback rehearsal before launch."
    ),
}


@pytest.fixture()
def exportable_meeting(client: TestClient) -> dict:
    created = client.post("/api/meetings", json=EXPORT_MEETING)
    assert created.status_code == 201, created.text
    meeting = created.json()

    first = client.post(
        f"/api/meetings/{meeting['id']}/action-items",
        json={"title": "Draft the rollback plan", "assignee": "Ada Lovelace", "due_date": "2026-04-01"},
    ).json()
    client.patch(f"/api/action-items/{first['id']}", json={"completed": True})
    client.post(
        f"/api/meetings/{meeting['id']}/action-items",
        json={"title": "Book the rollout review", "assignee": "Grace Hopper"},
    )

    yield client.get(f"/api/meetings/{meeting['id']}").json()
    client.delete(f"/api/meetings/{meeting['id']}")


def test_markdown_export_contains_notes_actions_and_transcript(
    client: TestClient, exportable_meeting: dict
) -> None:
    meeting_id = exportable_meeting["id"]
    detail = exportable_meeting

    response = client.get(f"/api/meetings/{meeting_id}/export", params={"format": "markdown"})
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/markdown")
    assert "attachment; filename=" in response.headers["content-disposition"]

    body = response.text
    assert body.startswith(f"# {detail['title']}")
    assert "## Summary" in body
    assert "## Key points" in body
    assert "## Action items" in body
    assert "## Transcript" in body

    # every transcript segment is present with speaker and mm:ss stamp
    for segment in detail["transcript"]["segments"]:
        assert f"[{segment['start_seconds'] // 60:02d}:{segment['start_seconds'] % 60:02d}] {segment['speaker']}:" in body
        assert segment["text"] in body

    # completed / open action items are distinguishable
    assert "- [x]" in body or "- [ ]" in body


def test_markdown_download_filename_is_slugged_with_the_date(
    client: TestClient, exportable_meeting: dict
) -> None:
    meeting_id = exportable_meeting["id"]
    detail = exportable_meeting

    response = client.get(f"/api/meetings/{meeting_id}/export", params={"format": "markdown"})
    disposition = response.headers["content-disposition"]
    assert detail["started_at"][:10] in disposition
    assert ".md" in disposition
    assert " " not in disposition.split("filename=")[1]
    assert "export-fixture-q3-rollout.md" in disposition


def test_plain_text_export_has_no_markdown_syntax(
    client: TestClient, exportable_meeting: dict
) -> None:
    meeting_id = exportable_meeting["id"]
    detail = exportable_meeting

    response = client.get(f"/api/meetings/{meeting_id}/export", params={"format": "txt"})
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/plain")

    body = response.text
    assert detail["title"].upper() in body
    assert "TRANSCRIPT" in body
    assert "## " not in body
    assert "**" not in body


def test_export_defaults_to_markdown_and_is_case_insensitive(
    client: TestClient, exportable_meeting: dict
) -> None:
    meeting_id = exportable_meeting["id"]

    default = client.get(f"/api/meetings/{meeting_id}/export")
    upper = client.get(f"/api/meetings/{meeting_id}/export", params={"format": "MARKDOWN"})
    assert default.status_code == 200
    assert default.headers["content-type"].startswith("text/markdown")
    assert upper.text == default.text


def test_unsupported_format_is_a_400_with_a_helpful_message(
    client: TestClient, exportable_meeting: dict
) -> None:
    meeting_id = exportable_meeting["id"]

    response = client.get(f"/api/meetings/{meeting_id}/export", params={"format": "pdf"})
    assert response.status_code == 400
    assert response.json() == {
        "detail": "Unsupported export format 'pdf'. Supported formats: markdown, txt."
    }


def test_export_of_an_unknown_meeting_is_a_404(client: TestClient) -> None:
    response = client.get("/api/meetings/does-not-exist/export")
    assert response.status_code == 404
    assert response.json() == {"detail": "Meeting 'does-not-exist' was not found."}
