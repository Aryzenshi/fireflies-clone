"""Action item CRUD + persistence tests, plus summary-service determinism tests."""

from __future__ import annotations

from fastapi.testclient import TestClient

TRANSCRIPT = (
    "00:00 Ada Lovelace: Let's review the release checklist.\n"
    "00:15 Grace Hopper: I'll update the deployment script by Friday.\n"
    "00:40 Ada Lovelace: Please confirm the rollback plan tomorrow.\n"
    "01:05 Grace Hopper: Agreed, we should also add a canary check.\n"
)


def test_action_item_crud_and_persistence(client: TestClient) -> None:
    meeting = client.post(
        "/api/meetings",
        json={"title": "Action Item Fixture", "participants": ["Ada Lovelace"], "transcript_text": TRANSCRIPT},
    ).json()
    meeting_id = meeting["id"]

    try:
        created = client.post(
            f"/api/meetings/{meeting_id}/action-items",
            json={"title": "Draft the rollback plan", "assignee": "Ada Lovelace", "due_date": "2026-04-01"},
        )
        assert created.status_code == 201, created.text
        item = created.json()
        assert item["completed"] is False
        assert item["due_date"] == "2026-04-01"

        # complete it
        completed = client.patch(f"/api/action-items/{item['id']}", json={"completed": True})
        assert completed.status_code == 200
        assert completed.json()["completed"] is True

        # edit it
        edited = client.patch(
            f"/api/action-items/{item['id']}",
            json={"title": "Draft and review the rollback plan", "assignee": "Grace Hopper"},
        )
        assert edited.json()["title"] == "Draft and review the rollback plan"
        assert edited.json()["assignee"] == "Grace Hopper"

        # uncomplete it
        assert client.patch(f"/api/action-items/{item['id']}", json={"completed": False}).json()["completed"] is False

        # persistence across requests
        listed = client.get(f"/api/meetings/{meeting_id}/action-items").json()
        stored = next(entry for entry in listed if entry["id"] == item["id"])
        assert stored["title"] == "Draft and review the rollback plan"
        assert stored["assignee"] == "Grace Hopper"
        assert stored["completed"] is False

        # delete
        assert client.delete(f"/api/action-items/{item['id']}").json() == {"deleted": True}
        assert client.delete(f"/api/action-items/{item['id']}").status_code == 404
        remaining = client.get(f"/api/meetings/{meeting_id}/action-items").json()
        assert item["id"] not in {entry["id"] for entry in remaining}
    finally:
        client.delete(f"/api/meetings/{meeting_id}")


def test_action_item_validation_errors_are_json(client: TestClient) -> None:
    meeting = client.post("/api/meetings", json={"title": "Validation Fixture", "transcript_text": TRANSCRIPT}).json()
    try:
        blank = client.post(f"/api/meetings/{meeting['id']}/action-items", json={"title": "   "})
        assert blank.status_code == 422
        assert isinstance(blank.json()["detail"], str)

        bad_date = client.post(
            f"/api/meetings/{meeting['id']}/action-items",
            json={"title": "Bad date", "due_date": "not-a-date"},
        )
        assert bad_date.status_code == 422

        unknown_meeting = client.post(
            "/api/meetings/mtg_missing/action-items", json={"title": "Nope"}
        )
        assert unknown_meeting.status_code == 404
        assert unknown_meeting.json()["detail"]
    finally:
        client.delete(f"/api/meetings/{meeting['id']}")


def test_summary_service_is_deterministic_and_extracts_action_items() -> None:
    from app.services.summary_service import DeterministicSummaryService

    service = DeterministicSummaryService()
    segments = [
        {"speaker": "Ada Lovelace", "start_seconds": 0, "end_seconds": 10, "text": "Let's review the release checklist."},
        {"speaker": "Grace Hopper", "start_seconds": 10, "end_seconds": 20, "text": "I'll update the deployment script by Friday."},
        {"speaker": "Ada Lovelace", "start_seconds": 20, "end_seconds": 30, "text": "We decided to add a canary check before rollout."},
    ]

    first = service.build_summary(segments, meeting_title="Determinism Check")
    second = service.build_summary(segments, meeting_title="Determinism Check")

    assert first.overview == second.overview
    assert first.key_points == second.key_points
    assert [section.title for section in first.sections] == [section.title for section in second.sections]
    assert first.topics == second.topics
    assert first.overview.startswith("Determinism Check was a")
    assert first.sections and first.sections[0].timestamp_seconds == 0
    assert any("canary" in point.lower() or "deployment" in point.lower() for point in first.key_points)


def test_summary_service_handles_empty_transcript() -> None:
    from app.services.summary_service import DeterministicSummaryService

    result = DeterministicSummaryService().build_summary([], meeting_title="Empty")
    assert "no transcript" in result.overview.lower()
    assert result.key_points == [] and result.sections == []
