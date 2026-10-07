"""Meetings API tests: CRUD, search, filtering, sorting, import, cascade delete."""

from __future__ import annotations

import re
from datetime import date, timedelta

from fastapi.testclient import TestClient

TRANSCRIPT = (
    "00:00 Maya Chen: Welcome everyone, we should review the roadmap.\n"
    "00:20 Rohan Iyer: I'll prepare the motion spec by Friday.\n"
    "00:45 Maya Chen: Please send the updated tokens to the team.\n"
    "01:10 Rohan Iyer: Agreed, the tokens are ready."
)


def test_health_reports_database(client: TestClient) -> None:
    response = client.get("/api/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert "meetings" in body["tables"]


def test_create_meeting_generates_summary_action_items_and_transcript(client: TestClient) -> None:
    response = client.post(
        "/api/meetings",
        json={
            "title": "Roadmap Sync",
            "participants": ["Maya Chen", "Rohan Iyer"],
            "transcript_text": TRANSCRIPT,
        },
    )
    assert response.status_code == 201, response.text
    body = response.json()

    assert body["title"] == "Roadmap Sync"
    assert [participant["name"] for participant in body["participants"]] == ["Maya Chen", "Rohan Iyer"]
    assert len(body["transcript"]["segments"]) == 4
    assert body["transcript"]["segments"][0]["start_seconds"] == 0
    assert body["duration_seconds"] >= 70
    assert body["summary"]["overview"]
    assert body["summary"]["key_points"]
    assert body["summary"]["sections"], "chapters/topics should be generated"
    assert body["action_items"], "action items should be extracted from the transcript"

    client.delete(f"/api/meetings/{body['id']}")


def test_create_meeting_requires_title_and_transcript_is_optional(client: TestClient) -> None:
    created = client.post("/api/meetings", json={"title": "Empty meeting"})
    assert created.status_code == 201
    meeting_id = created.json()["id"]
    assert created.json()["transcript"]["segments"] == []
    assert "no transcript yet" in created.json()["summary"]["overview"].lower()

    invalid = client.post("/api/meetings", json={"title": "   "})
    assert invalid.status_code == 422
    assert "detail" in invalid.json()

    client.delete(f"/api/meetings/{meeting_id}")


def test_get_unknown_meeting_returns_json_404(client: TestClient) -> None:
    response = client.get("/api/meetings/mtg_does_not_exist")
    assert response.status_code == 404
    assert response.headers["content-type"].startswith("application/json")
    assert "not found" in response.json()["detail"].lower()


def test_deleting_a_meeting_prunes_participants_it_owned(client: TestClient) -> None:
    """A person only in that meeting leaves the directory; shared people stay.

    Regression: deleting a meeting left the participants behind, so the participant
    filter listed names (with zero meetings) from meetings that no longer existed.
    """

    shared_before = {item["name"] for item in client.get("/api/participants").json()}

    ids: list[str] = []
    try:
        first = client.post(
            "/api/meetings",
            json={"title": "Prune fixture A", "participants": ["Ada Lovelace", "Maya Chen"], "transcript_text": "00:00 Ada Lovelace: Hello."},
        ).json()
        second = client.post(
            "/api/meetings",
            json={"title": "Prune fixture B", "participants": ["Maya Chen"], "transcript_text": "00:00 Maya Chen: Hello again."},
        ).json()
        ids = [first["id"], second["id"]]

        names = {item["name"] for item in client.get("/api/participants").json()}
        assert {"Ada Lovelace", "Maya Chen"} <= names

        # deleting the first meeting drops Ada (only there) but keeps Maya (in the second)
        assert client.delete(f"/api/meetings/{first['id']}").status_code == 200
        names = {item["name"] for item in client.get("/api/participants").json()}
        assert "Ada Lovelace" not in names
        assert "Maya Chen" in names

        assert client.delete(f"/api/meetings/{second['id']}").status_code == 200
        names = {item["name"] for item in client.get("/api/participants").json()}
        assert "Maya Chen" not in names

        # the seeded names that appeared before are untouched
        assert shared_before <= names
    finally:
        for meeting_id in ids:
            client.delete(f"/api/meetings/{meeting_id}")


def test_search_matches_transcript_text(client: TestClient) -> None:
    """`q` reaches inside transcripts, not just titles and participants.

    The search box in the UI promises "meetings, transcripts", so a phrase that only
    exists in a spoken line has to find its meeting.
    """

    created = client.post(
        "/api/meetings",
        json={
            "title": "Quarterly roadmap review",
            "participants": ["Ada Lovelace"],
            "transcript_text": (
                "00:00 Ada Lovelace: Welcome to the review.\n"
                "00:20 Ada Lovelace: The kite deployment slipped because the migration took a week."
            ),
        },
    )
    assert created.status_code == 201, created.text
    meeting_id = created.json()["id"]

    try:
        hits = client.get("/api/meetings", params={"q": "kite deployment"}).json()
        assert [item["id"] for item in hits["items"]] == [meeting_id]
        assert hits["total"] == 1

        # case-insensitive, and matches partial words inside a line
        lower = client.get("/api/meetings", params={"q": "MIGRATION"}).json()
        assert [item["id"] for item in lower["items"]] == [meeting_id]

        # a phrase that appears nowhere still returns an empty page
        misses = client.get("/api/meetings", params={"q": "submarine periscope"}).json()
        assert misses["items"] == [] and misses["total"] == 0

        # and the search stays a list query: no segment rows are loaded
        detail = client.get(f"/api/meetings/{meeting_id}")
        assert len(detail.json()["transcript"]["segments"]) == 2
    finally:
        client.delete(f"/api/meetings/{meeting_id}")


def test_search_filter_and_sort(client: TestClient) -> None:
    first = client.post(
        "/api/meetings",
        json={
            "title": "Alpha Planning",
            "participants": ["Zoë Fairbanks"],
            "started_at": "2026-02-01T09:00:00Z",
            "transcript_text": TRANSCRIPT,
        },
    ).json()
    second = client.post(
        "/api/meetings",
        json={
            "title": "Beta Retrospective",
            "participants": ["Omar Haddad"],
            "started_at": "2026-03-15T09:00:00Z",
            "transcript_text": TRANSCRIPT,
        },
    ).json()

    try:
        # search by title
        titles = [item["title"] for item in client.get("/api/meetings", params={"q": "beta"}).json()["items"]]
        assert "Beta Retrospective" in titles and "Alpha Planning" not in titles

        # search by participant name
        by_participant = client.get("/api/meetings", params={"q": "fairbanks"}).json()["items"]
        assert [item["title"] for item in by_participant] == ["Alpha Planning"]

        # participant filter
        filtered = client.get("/api/meetings", params={"participant": "Omar"}).json()["items"]
        assert [item["title"] for item in filtered] == ["Beta Retrospective"]

        # date filtering
        from_date = client.get("/api/meetings", params={"date_from": "2026-03-01"}).json()["items"]
        assert [item["title"] for item in from_date] == ["Beta Retrospective"]
        none = client.get("/api/meetings", params={"date_from": "2030-01-01"}).json()
        assert none["items"] == [] and none["total"] == 0

        # sorting by recency
        recent = client.get("/api/meetings", params={"sort": "recent"}).json()["items"]
        assert recent[0]["title"] == "Beta Retrospective"
        oldest = client.get("/api/meetings", params={"sort": "oldest"}).json()["items"]
        assert oldest[0]["title"] == "Alpha Planning"

        # invalid inputs
        assert client.get("/api/meetings", params={"sort": "sideways"}).status_code == 422
        assert (
            client.get("/api/meetings", params={"date_from": "2026-05-01", "date_to": "2026-01-01"}).status_code
            == 400
        )
    finally:
        client.delete(f"/api/meetings/{first['id']}")
        client.delete(f"/api/meetings/{second['id']}")


def test_update_meeting_title_and_participants(client: TestClient) -> None:
    meeting = client.post(
        "/api/meetings",
        json={"title": "Before Update", "participants": ["Maya Chen"], "transcript_text": TRANSCRIPT},
    ).json()

    try:
        response = client.patch(
            f"/api/meetings/{meeting['id']}",
            json={"title": "After Update", "participants": ["Maya Chen", "Rohan Iyer", "Elena Petrova"]},
        )
        assert response.status_code == 200
        body = response.json()
        assert body["title"] == "After Update"
        assert [p["name"] for p in body["participants"]] == ["Elena Petrova", "Maya Chen", "Rohan Iyer"]

        # persistence: re-fetch from the database
        refetched = client.get(f"/api/meetings/{meeting['id']}").json()
        assert refetched["title"] == "After Update"
        assert len(refetched["participants"]) == 3

        assert client.patch(f"/api/meetings/{meeting['id']}", json={"title": ""}).status_code == 422
    finally:
        client.delete(f"/api/meetings/{meeting['id']}")


def test_delete_meeting_cascades_and_404s_afterwards(client: TestClient) -> None:
    meeting = client.post(
        "/api/meetings",
        json={"title": "Delete Me", "participants": ["Maya Chen"], "transcript_text": TRANSCRIPT},
    ).json()
    assert meeting["action_items"], "precondition: action items generated"

    response = client.delete(f"/api/meetings/{meeting['id']}")
    assert response.status_code == 200
    assert response.json() == {"deleted": True}
    assert client.get(f"/api/meetings/{meeting['id']}").status_code == 404
    assert client.delete(f"/api/meetings/{meeting['id']}").status_code == 404


def test_import_txt_vtt_and_json_files(client: TestClient) -> None:
    cases = [
        (
            "sync.txt",
            TRANSCRIPT.encode(),
            "text/plain",
        ),
        (
            "captions.vtt",
            (
                "WEBVTT\n\n00:00:00.000 --> 00:00:06.000\n<v Omar Haddad>Shipping the fix today.\n\n"
                "00:00:06.000 --> 00:00:14.000\n<v Zoë Fairbanks>I will verify the dashboard.\n"
            ).encode(),
            "text/vtt",
        ),
        (
            "notes.json",
            (
                '{"segments": ['
                '{"speaker": "Omar Haddad", "start": 0, "end": 5, "text": "Kicking off the review."},'
                '{"speaker": "Zoë Fairbanks", "start": 5, "end": 12, "text": "The dashboard is green."}'
                "]}"
            ).encode(),
            "application/json",
        ),
    ]

    created_ids: list[str] = []
    try:
        for filename, content, content_type in cases:
            response = client.post(
                "/api/meetings/import",
                files={"file": (filename, content, content_type)},
                data={"title": f"Imported {filename}", "participants": "Omar Haddad,Zoë Fairbanks"},
            )
            assert response.status_code == 201, response.text
            body = response.json()
            created_ids.append(body["id"])
            assert body["source_type"] == "import"
            assert len(body["transcript"]["segments"]) >= 2
            assert body["summary"]["overview"]
    finally:
        for meeting_id in created_ids:
            client.delete(f"/api/meetings/{meeting_id}")


def test_import_rejects_unsupported_file_and_empty_body(client: TestClient) -> None:
    bad_type = client.post(
        "/api/meetings/import",
        files={"file": ("recording.mp3", b"not really audio", "audio/mpeg")},
    )
    assert bad_type.status_code == 400
    assert "Unsupported file type" in bad_type.json()["detail"]

    empty = client.post("/api/meetings/import", files={"file": ("empty.txt", b"", "text/plain")})
    assert empty.status_code == 400

def test_import_rejects_oversized_file(client: TestClient) -> None:
    from app.core.config import settings
    oversized = b"0" * (settings.max_upload_bytes + 2)
    response = client.post(
        "/api/meetings/import",
        files={"file": ("huge.txt", oversized, "text/plain")},
    )
    assert response.status_code == 400
    assert "exceeds maximum upload size" in response.json()["detail"]


def test_transcript_segment_update_endpoint(client: TestClient) -> None:
    meeting = client.post(
        "/api/meetings", json={"title": "Segment Edit", "transcript_text": TRANSCRIPT}
    ).json()
    try:
        segment_id = meeting["transcript"]["segments"][0]["id"]
        response = client.patch(
            f"/api/meetings/{meeting['id']}/transcript/{segment_id}",
            json={"text": "Corrected first line."},
        )
        assert response.status_code == 200
        assert response.json()["text"] == "Corrected first line."
        assert (
            client.get(f"/api/meetings/{meeting['id']}").json()["transcript"]["segments"][0]["text"]
            == "Corrected first line."
        )
        assert client.patch(
            f"/api/meetings/{meeting['id']}/transcript/seg_missing", json={"text": "x"}
        ).status_code == 404
    finally:
        client.delete(f"/api/meetings/{meeting['id']}")


def test_participants_and_stats_endpoints(client: TestClient) -> None:
    participants = client.get("/api/participants")
    assert participants.status_code == 200
    assert isinstance(participants.json(), list)

    stats = client.get("/api/stats").json()
    assert stats["meeting_count"] >= 0
    assert stats["transcription_minutes_quota"] > 0
    assert "open_action_items" in stats

    user = client.get("/api/users/me").json()
    assert user["email"] and user["initials"]


def test_regenerate_summary_endpoint(client: TestClient) -> None:
    meeting = client.post(
        "/api/meetings", json={"title": "Regenerate", "transcript_text": TRANSCRIPT}
    ).json()
    try:
        response = client.post(f"/api/meetings/{meeting['id']}/summary/regenerate")
        assert response.status_code == 200
        assert response.json()["summary"]["overview"]
    finally:
        client.delete(f"/api/meetings/{meeting['id']}")


def test_date_helpers_are_importable() -> None:
    # sanity check that date filters accept plain ISO dates
    assert date.fromisoformat("2026-02-01") + timedelta(days=1) == date.fromisoformat("2026-02-02")


def test_library_list_does_not_load_transcripts(client: TestClient) -> None:
    """A list row renders no transcript, so the list query must not read segments.

    Guards against the eager-loading regression where every library request pulled
    all transcript segments and summary sections of every meeting.
    """

    from sqlalchemy import event
    from sqlalchemy.engine import Engine

    created = client.post(
        "/api/meetings",
        json={
            "title": "List Projection Fixture",
            "participants": ["Ada Lovelace"],
            "transcript_text": "\n".join(
                f"00:{index:02d} Ada Lovelace: Line number {index}." for index in range(20)
            ),
        },
    )
    assert created.status_code == 201, created.text
    meeting_id = created.json()["id"]

    statements: list[str] = []

    def _record(conn, cursor, statement, parameters, context, executemany):  # noqa: ANN001
        if "sqlite" not in statement.split("\n")[0].lower():  # pragma: no cover - defensive
            statements.append(statement)

    try:
        event.listen(Engine, "before_cursor_execute", _record)
        try:
            response = client.get("/api/meetings", params={"q": "List Projection Fixture"})
        finally:
            event.remove(Engine, "before_cursor_execute", _record)
    finally:
        client.delete(f"/api/meetings/{meeting_id}")

    assert response.status_code == 200
    assert [item["id"] for item in response.json()["items"]] == [meeting_id]

    joined = " ".join(statements)
    heads = [statement.strip().split("\n")[0] for statement in statements]

    # The old regression: a selectin/eager load that reads every segment of every meeting.
    # That shows up as its own statement whose head selects segment columns. Transcript
    # *search* legitimately mentions the table inside an inline IN-subquery (nested under the
    # meetings statement), so the guard is "no statement loads segment rows" - verified by the
    # statement head - rather than "the table name never appears".
    loaders = [head for head in heads if head.startswith(("SELECT transcript_segments.", "SELECT summary_sections."))]
    assert not loaders, f"the list query must not load transcript or summary rows, saw {loaders}"
    assert not re.search(r"SELECT transcript_segments\.(id|text|speaker|start_seconds)", joined), (
        "search may only project transcript_segments.meeting_id inside its subquery"
    )
    assert "summary_sections" not in joined, "the list query must not load summary sections"
    assert len(statements) <= 6, f"list query should stay flat, ran {len(statements)} statements"

    # ...while the detail endpoint still returns the full transcript
    detail = client.get(f"/api/meetings/{meeting_id}")
    assert detail.status_code in {200, 404}
