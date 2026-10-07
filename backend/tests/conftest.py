"""Shared pytest fixtures.

Tests run against a temporary SQLite database so they never touch the local
development database.
"""

from __future__ import annotations

import os
import tempfile
from collections.abc import Iterator
from pathlib import Path

import pytest

TMP_DIR = Path(tempfile.mkdtemp(prefix="fireflies-tests-"))
os.environ["DATABASE_URL"] = f"sqlite:///{TMP_DIR / 'test.db'}"
os.environ["AUTO_SEED"] = "false"

from fastapi.testclient import TestClient  # noqa: E402

from app.db.init_db import init_db  # noqa: E402
from app.db.session import SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.models import Base  # noqa: E402


@pytest.fixture(scope="session")
def client() -> Iterator[TestClient]:
    Base.metadata.drop_all(bind=engine)
    init_db()
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture()
def db_session():
    # `init_db()` is idempotent: it guarantees the schema exists even when a session
    # that never requested the API `client` fixture runs first (e.g. `pytest tests/test_seed.py`).
    init_db()
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def seeded_meeting(client: TestClient) -> dict:
    """Create a fresh meeting with a transcript for a single test."""

    payload = {
        "title": "Fixture Sync",
        "participants": ["Ada Lovelace", "Grace Hopper"],
        "transcript_text": (
            "00:00 Ada Lovelace: Welcome everyone, we should review the release plan.\n"
            "00:12 Grace Hopper: I'll send the updated schedule by Friday.\n"
            "00:31 Ada Lovelace: Please also double-check the compiler patch.\n"
            "00:52 Grace Hopper: Agreed, the patch is nearly ready."
        ),
    }
    response = client.post("/api/meetings", json=payload)
    assert response.status_code == 201, response.text
    body = response.json()
    yield body
    client.delete(f"/api/meetings/{body['id']}")
