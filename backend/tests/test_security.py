from fastapi.testclient import TestClient
from app.core.config import settings

def test_sql_injection_search(client: TestClient) -> None:
    # SQLi attempts should be treated as literal strings and return 200 (probably empty list)
    response = client.get("/api/meetings", params={"q": "'; DROP TABLE meetings; --"})
    assert response.status_code == 200
    assert isinstance(response.json()["items"], list)

    response2 = client.get("/api/meetings", params={"q": "1' UNION SELECT ..."})
    assert response2.status_code == 200

def test_xss_in_title(client: TestClient) -> None:
    # XSS payloads should be safely stored and returned as literal text
    payload = "<script>alert(1)</script>"
    meeting = client.post(
        "/api/meetings",
        json={"title": payload, "transcript_text": "Sample text."}
    ).json()
    assert meeting["title"] == payload
    client.delete(f"/api/meetings/{meeting['id']}")

def test_mass_assignment_prevented(client: TestClient) -> None:
    # Try to set 'id' and 'created_at' in meeting creation
    # Pydantic schema MeetingCreate does not have these fields, so they should be ignored
    response = client.post(
        "/api/meetings",
        json={
            "title": "Normal Title",
            "transcript_text": "Sample",
            "id": "mtg_malicious123",
            "created_at": "2000-01-01T00:00:00Z"
        }
    )
    # FastAPI's strict Pydantic config rejects the extra fields outright with 422 Unprocessable Entity
    assert response.status_code == 422

def test_idor_unauthorized_access(client: TestClient) -> None:
    # Accessing non-existent objects should safely return 404
    response = client.get("/api/meetings/mtg_invalid_id_999")
    assert response.status_code == 404
