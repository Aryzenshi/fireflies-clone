"""ORM -> API schema serialisers.

Routes never return ORM objects; they return these Pydantic models.
"""

from __future__ import annotations

import json

from app.models import ActionItem, Meeting, MeetingComment, MeetingSummary, SummarySection
from app.schemas import (
    ActionItemOut,
    CommentOut,
    MeetingDetail,
    MeetingListItem,
    ParticipantOut,
    SummaryOut,
    SummarySectionOut,
    TranscriptOut,
    TranscriptSegmentOut,
    UserOut,
)


def _bullets(raw: str) -> list[str]:
    try:
        data = json.loads(raw or "[]")
    except json.JSONDecodeError:
        return []
    if not isinstance(data, list):
        return []
    return [str(item) for item in data]


def _topics(raw: str) -> list[str]:
    return _bullets(raw)


def participant_out(participant) -> ParticipantOut:  # noqa: ANN001 - ORM entity
    return ParticipantOut(id=participant.id, name=participant.display_name, email=participant.email)


def summary_out(summary: MeetingSummary | None) -> SummaryOut:
    if summary is None:
        return SummaryOut(overview="No summary has been generated for this meeting yet.", key_points=[], sections=[], topics=[])
    return SummaryOut(
        overview=summary.overview,
        key_points=_bullets(summary.key_points_json),
        topics=_topics(summary.topics_json),
        sections=[
            SummarySectionOut(
                id=section.id,
                title=section.title,
                timestamp_seconds=section.timestamp_seconds,
                bullets=_bullets(section.bullets_json),
            )
            for section in summary.sections
        ],
    )


def action_item_out(item: ActionItem) -> ActionItemOut:
    return ActionItemOut(
        id=item.id,
        meeting_id=item.meeting_id,
        title=item.title,
        assignee=item.assignee,
        due_date=item.due_date,
        completed=item.completed,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


def transcript_out(meeting: Meeting) -> TranscriptOut:
    return TranscriptOut(
        segments=[
            TranscriptSegmentOut(
                id=segment.id,
                speaker=segment.speaker_name,
                start_seconds=segment.start_seconds,
                end_seconds=segment.end_seconds,
                sequence=segment.sequence,
                text=segment.text,
            )
            for segment in sorted(meeting.transcript_segments, key=lambda item: item.sequence)
        ]
    )


def meeting_list_item(meeting: Meeting) -> MeetingListItem:
    action_items = meeting.action_items or []
    topics = _topics(meeting.summary.topics_json) if meeting.summary else []
    return MeetingListItem(
        id=meeting.id,
        title=meeting.title,
        started_at=meeting.started_at,
        duration_seconds=meeting.duration_seconds,
        host_name=meeting.host_name,
        source_type=meeting.source_type,
        participants=[participant_out(participant) for participant in meeting.participants],
        tags=meeting_tags(meeting),
        action_item_count=len(action_items),
        open_action_item_count=len([item for item in action_items if not item.completed]),
        topics=topics[:4],
    )


def meeting_tags(meeting: Meeting) -> list[str]:
    """Decode the stored tag array, tolerating rows written by earlier builds."""

    try:
        tags = json.loads(meeting.tags_json or "[]")
    except (TypeError, ValueError):
        return []
    if not isinstance(tags, list):
        return []
    return [tag for tag in tags if isinstance(tag, str) and tag.strip()]


def tags_json(tags: list[str]) -> str:
    return json.dumps(list(tags), ensure_ascii=False)


def meeting_detail(meeting: Meeting) -> MeetingDetail:
    return MeetingDetail(
        id=meeting.id,
        title=meeting.title,
        started_at=meeting.started_at,
        duration_seconds=meeting.duration_seconds,
        host_name=meeting.host_name,
        source_type=meeting.source_type,
        created_at=meeting.created_at,
        updated_at=meeting.updated_at,
        participants=[participant_out(participant) for participant in meeting.participants],
        tags=meeting_tags(meeting),
        summary=summary_out(meeting.summary),
        action_items=[
            action_item_out(item)
            for item in sorted(meeting.action_items, key=lambda entry: (entry.completed, entry.created_at or entry.id))
        ],
        comments=[comment_out(comment) for comment in meeting.comments],
        transcript=transcript_out(meeting),
    )


def comment_out(comment: MeetingComment) -> CommentOut:
    segment = comment.segment
    return CommentOut(
        id=comment.id,
        meeting_id=comment.meeting_id,
        segment_id=comment.segment_id,
        body=comment.body,
        author_name=comment.author_name,
        created_at=comment.created_at,
        updated_at=comment.updated_at,
        anchor_start_seconds=segment.start_seconds if segment else None,
        anchor_speaker=segment.speaker_name if segment else None,
        anchor_text=segment.text if segment else None,
    )


def user_out(user) -> UserOut:  # noqa: ANN001 - ORM entity
    initials = "".join(part[0].upper() for part in user.name.split()[:2]) or "FF"
    return UserOut(id=user.id, name=user.name, email=user.email, avatar_url=user.avatar_url, initials=initials)


def section_bullets_json(bullets: list[str]) -> str:
    return json.dumps(bullets, ensure_ascii=False)


def store_summary(
    summary: MeetingSummary,
    *,
    overview: str,
    key_points: list[str],
    topics: list[str],
    sections: list[tuple[str, int | None, list[str]]],
) -> MeetingSummary:
    """Write a generated summary onto the ORM entity (sections replaced wholesale)."""

    from app.db.base import new_id

    summary.overview = overview
    summary.key_points_json = section_bullets_json(key_points)
    summary.topics_json = section_bullets_json(topics)
    summary.sections = [
        SummarySection(
            id=new_id("sec"),
            summary_id=summary.id,
            title=title,
            timestamp_seconds=timestamp,
            bullets_json=section_bullets_json(bullets),
            sequence=index,
        )
        for index, (title, timestamp, bullets) in enumerate(sections)
    ]
    return summary
