"""Action item routes."""

from __future__ import annotations

from fastapi import APIRouter, status

from app.api.deps import MeetingServiceDep
from app.schemas import ActionItemCreate, ActionItemOut, ActionItemUpdate, DeleteResponse

router = APIRouter(tags=["action-items"])


@router.get("/meetings/{meeting_id}/action-items", response_model=list[ActionItemOut])
def list_action_items(meeting_id: str, service: MeetingServiceDep) -> list[ActionItemOut]:
    return service.list_action_items(meeting_id)


@router.post(
    "/meetings/{meeting_id}/action-items",
    response_model=ActionItemOut,
    status_code=status.HTTP_201_CREATED,
)
def create_action_item(
    meeting_id: str, payload: ActionItemCreate, service: MeetingServiceDep
) -> ActionItemOut:
    return service.create_action_item(meeting_id, payload)


@router.patch("/action-items/{action_item_id}", response_model=ActionItemOut)
def update_action_item(
    action_item_id: str, payload: ActionItemUpdate, service: MeetingServiceDep
) -> ActionItemOut:
    return service.update_action_item(action_item_id, payload)


@router.delete("/action-items/{action_item_id}", response_model=DeleteResponse)
def delete_action_item(action_item_id: str, service: MeetingServiceDep) -> DeleteResponse:
    service.delete_action_item(action_item_id)
    return DeleteResponse(deleted=True)
