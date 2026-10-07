"""Health endpoint."""

from __future__ import annotations

from fastapi import APIRouter

from app.api.deps import MeetingServiceDep
from app.schemas import HealthOut

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthOut)
def health(service: MeetingServiceDep) -> HealthOut:
    """Liveness + readiness probe used by the frontend and by reviewers."""

    return service.health()
