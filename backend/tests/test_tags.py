"""Meeting tag tests: validation, persistence, filtering and the tag directory."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

TRANSCRIPT = (
    "00:00 Ada Lovelace: Let's plan the release.\n"
    "00:20 Grace Hopper: I'll write the checklist.\n"
)


@pytest.fixture()
def tagged_meeting(client: TestClient) -> dict:
    created = client.post(
        "/api/meetings",
        json={
            "title": "Tag Fixture Meeting",
            "participants": ["Ada Lovelace"],
            "tags": ["  Release ", "release", "QA", "q3"],
            "transcript_text": TRANSCRIPT,
        },
    )
    assert created.status_code == 201, created.text
    yield created.json()
    client.delete(f"/api/meetings/{created.json()['id']}")


def test_tags_are_trimmed_and_deduplicated_case_insensitively(tagged_meeting: dict) -> None:
    # " Release " and "release" collapse into one tag, order preserved.
    assert tagged_meeting["tags"] == ["Release", "QA", "q3"]


def test_tags_survive_a_reload_and_can_be_replaced(client: TestClient, tagged_meeting: dict) -> None:
    meeting_id = tagged_meeting["id"]

    # persists
    fetched = client.get(f"/api/meetings/{meeting_id}").json()
    assert fetched["tags"] == ["Release", "QA", "q3"]

    # replace with a different set
    patched = client.patch(f"/api/meetings/{meeting_id}", json={"tags": ["eng", "planning"]})
    assert patched.status_code == 200
    assert patched.json()["tags"] == ["eng", "planning"]

    # clearing tags is allowed
    cleared = client.patch(f"/api/meetings/{meeting_id}", json={"tags": []})
    assert cleared.json()["tags"] == []

    # omitting the field leaves existing tags untouched
    client.patch(f"/api/meetings/{meeting_id}", json={"tags": ["keep"]})
    renamed = client.patch(f"/api/meetings/{meeting_id}", json={"title": "Tag Fixture Meeting (edited)"})
    assert renamed.json()["tags"] == ["keep"]


def test_tag_validation_rejects_too_many_or_too_long_tags(client: TestClient) -> None:
    too_many = client.post(
        "/api/meetings",
        json={"title": "Too many tags", "tags": [f"tag-{index}" for index in range(13)]},
    )
    assert too_many.status_code == 422

    too_long = client.post(
        "/api/meetings",
        json={"title": "Too long a tag", "tags": ["x" * 33]},
    )
    assert too_long.status_code == 422


def test_list_filters_by_tag_case_insensitively(client: TestClient, tagged_meeting: dict) -> None:
    # Assertions are scoped to the fixture (and to properties of the response) because
    # the shared test database may also contain seeded meetings.
    exact = client.get("/api/meetings", params={"tag": "release", "q": "Tag Fixture"}).json()
    assert [item["id"] for item in exact["items"]] == [tagged_meeting["id"]]
    for item in exact["items"]:
        assert "release" in [tag.lower() for tag in item["tags"]]

    upper = client.get("/api/meetings", params={"tag": "RELEASE", "q": "Tag Fixture"}).json()
    assert upper["total"] == exact["total"]

    # a partial tag name must not match: the filter compares the whole quoted value
    partial = client.get("/api/meetings", params={"tag": "rel", "q": "Tag Fixture"}).json()
    assert partial["total"] == 0

    # unrelated tags never return this meeting
    other = client.get("/api/meetings", params={"tag": "definitely-not-a-tag"}).json()
    assert other["total"] == 0


def test_tag_directory_lists_every_tag_with_counts(client: TestClient) -> None:
    before = {tag["name"].lower(): tag["meeting_count"] for tag in client.get("/api/tags").json()}
    created: list[str] = []
    for title, tags in [
        ("Directory One", ["engineering", "release"]),
        ("Directory Two", ["engineering"]),
        ("Directory Three", ["design"]),
    ]:
        response = client.post("/api/meetings", json={"title": title, "tags": tags})
        assert response.status_code == 201, response.text
        created.append(response.json()["id"])

    try:
        after = {tag["name"].lower(): tag["meeting_count"] for tag in client.get("/api/tags").json()}

        # Delta assertions: the shared test database may already hold tagged meetings.
        assert after.get("engineering", 0) - before.get("engineering", 0) == 2
        assert after.get("release", 0) - before.get("release", 0) == 1
        assert after.get("design", 0) - before.get("design", 0) == 1

        tags = client.get("/api/tags").json()
        assert all(tag["name"] for tag in tags)
        counts = [tag["meeting_count"] for tag in tags]
        assert counts == sorted(counts, reverse=True), "tags come back most used first"
    finally:
        for meeting_id in created:
            client.delete(f"/api/meetings/{meeting_id}")


def test_import_accepts_tags_and_exposes_them_on_the_list_item(client: TestClient) -> None:
    files = {
        "file": (
            "tagged-import.txt",
            b"00:00 Ada Lovelace: Imported line one.\n00:10 Grace Hopper: Imported line two.\n",
            "text/plain",
        )
    }
    created = client.post(
        "/api/meetings/import",
        files=files,
        data={"title": "Tagged Import", "tags": "imported, q3"},
    )
    assert created.status_code == 201, created.text
    meeting = created.json()
    try:
        assert meeting["tags"] == ["imported", "q3"]

        listing = client.get("/api/meetings", params={"tag": "imported", "q": "Tagged Import"}).json()
        assert listing["total"] == 1
        assert listing["items"][0]["tags"] == ["imported", "q3"]
    finally:
        client.delete(f"/api/meetings/{meeting['id']}")


def test_export_includes_tags(client: TestClient, tagged_meeting: dict) -> None:
    body = client.get(f"/api/meetings/{tagged_meeting['id']}/export", params={"format": "markdown"}).text
    assert "**Tags:** Release, QA, q3  " in body

    text_body = client.get(f"/api/meetings/{tagged_meeting['id']}/export", params={"format": "txt"}).text
    assert "Tags:         Release, QA, q3" in text_body
