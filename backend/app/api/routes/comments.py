"""Comment routes: anchored discussion on a meeting's transcript."""

from __future__ import annotations

from fastapi import APIRouter, status

from app.api.deps import MeetingServiceDep
from app.schemas import CommentCreate, CommentOut, CommentUpdate, DeleteResponse

router = APIRouter(tags=["comments"])


@router.get("/meetings/{meeting_id}/comments", response_model=list[CommentOut])
def list_comments(meeting_id: str, service: MeetingServiceDep) -> list[CommentOut]:
    return service.list_comments(meeting_id)


@router.post(
    "/meetings/{meeting_id}/comments",
    response_model=CommentOut,
    status_code=status.HTTP_201_CREATED,
)
def create_comment(
    meeting_id: str, payload: CommentCreate, service: MeetingServiceDep
) -> CommentOut:
    """Add a comment; `segment_id` anchors it to a transcript line (a highlight)."""

    return service.add_comment(meeting_id, payload)


@router.patch("/comments/{comment_id}", response_model=CommentOut)
def update_comment(
    comment_id: str, payload: CommentUpdate, service: MeetingServiceDep
) -> CommentOut:
    return service.update_comment(comment_id, payload)


@router.delete("/comments/{comment_id}", response_model=DeleteResponse)
def delete_comment(comment_id: str, service: MeetingServiceDep) -> DeleteResponse:
    service.delete_comment(comment_id)
    return DeleteResponse(deleted=True)
