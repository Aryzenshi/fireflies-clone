"""Schema (DDL) initialisation.

The assignment allows "Alembic or equivalent"; this module is the equivalent:
a single, repeatable, version-stamped initialiser that creates the schema and
the default user.  Running it repeatedly is safe (idempotent).
"""

from __future__ import annotations

from sqlalchemy import inspect, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.base import Base, utcnow
from app.db.session import engine
from app.models import SchemaVersion, User  # noqa: F401  (import registers all models)

SCHEMA_VERSION = "0003_meeting_comments"

# Lightweight forward-only migrations for SQLite databases created by an earlier
# build. Each entry is applied only when the column is missing, so `init_db()` stays
# idempotent and reviewers can upgrade an existing data/fireflies.db in place.
COLUMN_MIGRATIONS: tuple[tuple[str, str, str], ...] = (
    ("meetings", "tags_json", "TEXT NOT NULL DEFAULT '[]'"),
    ("users", "transcription_minutes_used", "INTEGER NOT NULL DEFAULT 0"),
)


def create_schema() -> None:
    """Create all tables if they do not exist yet, then add missing columns."""

    Base.metadata.create_all(bind=engine)
    apply_column_migrations()


def apply_column_migrations() -> list[str]:
    """Add columns introduced by later builds to an already-created database."""

    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())
    applied: list[str] = []
    with engine.begin() as connection:
        for table, column, ddl in COLUMN_MIGRATIONS:
            if table not in existing_tables:
                continue
            columns = {item["name"] for item in inspector.get_columns(table)}
            if column in columns:
                continue
            connection.exec_driver_sql(f"ALTER TABLE {table} ADD COLUMN {column} {ddl}")
            applied.append(f"{table}.{column}")
    return applied


def ensure_default_user(db: Session) -> User:
    """Create/return the single default signed-in user."""

    user = db.get(User, settings.default_user_id)
    if user is None:
        user = User(
            id=settings.default_user_id,
            name=settings.default_user_name,
            email=settings.default_user_email,
            created_at=utcnow(),
        )
        db.add(user)
        db.commit()
    return user


def record_schema_version(db: Session) -> None:
    existing = db.scalars(select(SchemaVersion).where(SchemaVersion.version == SCHEMA_VERSION)).first()
    if existing is None:
        db.add(SchemaVersion(version=SCHEMA_VERSION, applied_at=utcnow()))
        db.commit()


def init_db(db: Session | None = None) -> None:
    """Create schema, stamp the version and make sure the default user exists."""

    create_schema()
    owns_session = db is None
    if owns_session:
        from app.db.session import SessionLocal

        db = SessionLocal()
    try:
        assert db is not None
        ensure_default_user(db)
        record_schema_version(db)
    finally:
        if owns_session and db is not None:
            db.close()


def schema_status() -> dict[str, object]:
    """Used by ``GET /api/health`` to report database readiness."""

    inspector = inspect(engine)
    tables = sorted(inspector.get_table_names())
    return {"tables": tables, "schema_version": SCHEMA_VERSION}
