"""Shared FastAPI dependencies."""

from __future__ import annotations

from typing import Annotated

from fastapi import Depends
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services import MeetingService

DbSession = Annotated[Session, Depends(get_db)]


def get_meeting_service(db: DbSession) -> MeetingService:
    return MeetingService(db)


MeetingServiceDep = Annotated[MeetingService, Depends(get_meeting_service)]
