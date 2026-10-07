"""Meeting routes. Handlers validate input and delegate to ``MeetingService``."""

from __future__ import annotations

from datetime import date, datetime

from fastapi import APIRouter, File, Form, Query, Response, UploadFile, status

from app.api.deps import MeetingServiceDep
from app.core.config import settings
from app.core.errors import BadRequestError
from app.schemas import (
    DeleteResponse,
    MeetingCreate,
    MeetingDetail,
    MeetingListResponse,
    MeetingUpdate,
    ParticipantSummary,
    StatsOut,
    TranscriptSegmentOut,
    TranscriptSegmentUpdate,
    TagSummary,
    UserOut,
)

router = APIRouter(tags=["meetings"])


@router.get("/meetings", response_model=MeetingListResponse)
def list_meetings(
    service: MeetingServiceDep,
    q: str | None = Query(default=None, max_length=200, description="Search title, host or participant"),
    participant: str | None = Query(default=None, max_length=160),
    tag: str | None = Query(default=None, max_length=32, description="Exact tag match (case-insensitive)"),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    sort: str = Query(default="recent", pattern="^(recent|oldest)$"),
    limit: int | None = Query(default=None, ge=1, le=200),
) -> MeetingListResponse:
    """List meetings with search / filter / sort support (recency by default)."""

    if date_from and date_to and date_from > date_to:
        raise BadRequestError("date_from must be earlier than or equal to date_to.")
    return service.list_meetings(
        query=q,
        participant=participant,
        tag=tag,
        date_from=date_from,
        date_to=date_to,
        sort=sort,
        limit=limit,
    )


@router.post("/meetings", response_model=MeetingDetail, status_code=status.HTTP_201_CREATED)
def create_meeting(payload: MeetingCreate, service: MeetingServiceDep) -> MeetingDetail:
    """Create a meeting, optionally with a pasted transcript."""

    return service.create_meeting(payload, source_type="manual")


@router.post(
    "/meetings/import",
    response_model=MeetingDetail,
    status_code=status.HTTP_201_CREATED,
)
async def import_meeting(
    service: MeetingServiceDep,
    file: UploadFile = File(..., description="TXT, VTT or JSON transcript file"),
    title: str | None = Form(default=None),
    participants: str | None = Form(default=None, description="Comma separated participant names"),
    tags: str | None = Form(default=None, description="Comma separated tags"),
    started_at: str | None = Form(default=None, description="ISO-8601 meeting start time"),
) -> MeetingDetail:
    """Import a transcript file and create a meeting with AI notes."""

    content = await file.read(settings.max_upload_bytes + 1)
    if not content:
        raise BadRequestError("The uploaded file is empty.")
    if len(content) > settings.max_upload_bytes:
        raise BadRequestError(f"File exceeds maximum upload size of {settings.max_upload_bytes} bytes.")

    parsed_started_at: datetime | None = None
    if started_at:
        try:
            parsed_started_at = datetime.fromisoformat(started_at.replace("Z", "+00:00")).replace(tzinfo=None)
        except ValueError as exc:
            raise BadRequestError("started_at must be an ISO-8601 datetime string.") from exc

    return service.import_meeting(
        filename=file.filename or "transcript.txt",
        content=content,
        title=title,
        participants=participants,
        tags=tags,
        started_at=parsed_started_at,
    )


@router.get(
    "/meetings/{meeting_id}/export",
    response_class=Response,
    responses={
        200: {"content": {"text/markdown": {}, "text/plain": {}}, "description": "Meeting document"},
        400: {"description": "Unsupported export format"},
        404: {"description": "Meeting not found"},
    },
)
def export_meeting(
    meeting_id: str,
    service: MeetingServiceDep,
    format: str = Query("markdown", description="markdown or txt"),
) -> Response:
    """Download the notes, action items and transcript as a text document."""

    filename, media_type, content = service.export_meeting(meeting_id, format.lower())
    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/meetings/{meeting_id}", response_model=MeetingDetail)
def get_meeting(meeting_id: str, service: MeetingServiceDep) -> MeetingDetail:
    return service.get_detail(meeting_id)


@router.patch("/meetings/{meeting_id}", response_model=MeetingDetail)
def update_meeting(meeting_id: str, payload: MeetingUpdate, service: MeetingServiceDep) -> MeetingDetail:
    return service.update_meeting(meeting_id, payload)


@router.delete("/meetings/{meeting_id}", response_model=DeleteResponse)
def delete_meeting(meeting_id: str, service: MeetingServiceDep) -> DeleteResponse:
    service.delete_meeting(meeting_id)
    return DeleteResponse(deleted=True)


@router.get("/meetings/{meeting_id}/transcript", response_model=list[TranscriptSegmentOut])
def get_transcript(meeting_id: str, service: MeetingServiceDep) -> list[TranscriptSegmentOut]:
    return service.list_segments(meeting_id)


@router.post("/meetings/{meeting_id}/transcript", response_model=MeetingDetail)
def replace_transcript(
    meeting_id: str,
    service: MeetingServiceDep,
    body: dict[str, str],
) -> MeetingDetail:
    """Replace a meeting transcript with pasted text and regenerate AI notes."""

    text = (body or {}).get("transcript_text", "")
    if not text or not text.strip():
        raise BadRequestError("transcript_text is required.")
    return service.replace_transcript(meeting_id, text)


@router.patch(
    "/meetings/{meeting_id}/transcript/{segment_id}",
    response_model=TranscriptSegmentOut,
)
def update_transcript_segment(
    meeting_id: str,
    segment_id: str,
    payload: TranscriptSegmentUpdate,
    service: MeetingServiceDep,
) -> TranscriptSegmentOut:
    return service.update_segment_text(meeting_id, segment_id, payload)


@router.post("/meetings/{meeting_id}/summary/regenerate", response_model=MeetingDetail)
def regenerate_summary(meeting_id: str, service: MeetingServiceDep) -> MeetingDetail:
    """Regenerate the deterministic AI summary from the stored transcript."""

    return service.regenerate_summary(meeting_id)


@router.get("/tags", response_model=list[TagSummary])
def list_tags(service: MeetingServiceDep) -> list[TagSummary]:
    """Tags across the workspace, most used first (used by the library filter)."""

    return service.list_tags()


@router.get("/participants", response_model=list[ParticipantSummary])
def list_participants(service: MeetingServiceDep) -> list[ParticipantSummary]:
    return service.list_participants()


@router.get("/users/me", response_model=UserOut)
def current_user(service: MeetingServiceDep) -> UserOut:
    return service.get_default_user()


@router.get("/stats", response_model=StatsOut)
def stats(service: MeetingServiceDep) -> StatsOut:
    return service.get_stats()
