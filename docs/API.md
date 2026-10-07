# Fireflies Meeting Notes Clone — API Contract

Base path: `/api`

Content type: `application/json` unless noted.

## 1. Health

### `GET /api/health`

Response:

```json
{"status":"ok"}
```

## 2. List meetings

### `GET /api/meetings`

Query parameters:

```text
q           optional text search across title + participant names
participant optional exact/partial participant filter
date_from   optional ISO date
 date_to    optional ISO date
sort        `recent` | `oldest` (default `recent`)
```

Example response:

```json
{
  "items": [
    {
      "id": "mtg_01",
      "title": "Weekly Product Sync",
      "started_at": "2026-06-07T09:00:00Z",
      "duration_seconds": 1750,
      "participants": [
        {"id":"p1","name":"Aaron Kantor"},
        {"id":"p2","name":"Maya Chen"}
      ]
    }
  ],
  "total": 1
}
```

## 3. Get meeting detail

### `GET /api/meetings/{meeting_id}`

Response must include the complete notepad payload:

```json
{
  "id": "mtg_01",
  "title": "Weekly Product Sync",
  "started_at": "2026-06-07T09:00:00Z",
  "duration_seconds": 1750,
  "host_name": "Aaron Kantor",
  "participants": [
    {"id":"p1","name":"Aaron Kantor"}
  ],
  "summary": {
    "overview": "...",
    "key_points": ["...", "..."],
    "sections": [
      {
        "id":"sec1",
        "title":"Roadmap",
        "timestamp_seconds":120,
        "bullets":["..."]
      }
    ]
  },
  "action_items": [
    {
      "id":"ai1",
      "title":"Send revised mockups",
      "assignee":"Maya Chen",
      "due_date":"2026-06-10",
      "completed":false
    }
  ],
  "transcript": {
    "segments": [
      {
        "id":"seg1",
        "speaker":"Aaron Kantor",
        "start_seconds":0,
        "end_seconds":5,
        "text":"Hello everyone."
      }
    ]
  }
}
```

## 4. Create meeting

### `POST /api/meetings`

JSON body:

```json
{
  "title": "Design Review",
  "started_at": "2026-06-08T11:00:00Z",
  "participants": ["Alice", "Bob"],
  "transcript_text": "Alice: Hello...\nBob: Hi..."
}
```

The backend creates:

- meeting,
- participants,
- transcript segments,
- summary,
- action items (mocked/deterministic when not derivable),
- summary sections/topics.

Response: `201 Created` with the created meeting ID and full detail.

## 5. Import transcript file

### `POST /api/meetings/import`

`multipart/form-data`:

```text
file        required
 title      optional
 participants optional comma-separated string
```

Supported: TXT, VTT, JSON.

Return `201 Created` with the created meeting detail.

## 6. Update meeting metadata

### `PATCH /api/meetings/{meeting_id}`

Body:

```json
{
  "title": "Updated title",
  "participants": ["Alice", "Bob", "Charlie"]
}
```

Return updated meeting detail.

## 7. Delete meeting

### `DELETE /api/meetings/{meeting_id}`

Return:

```json
{"deleted":true}
```

The UI must confirm destructive deletion first.

## 8. Update transcript segment

### `PATCH /api/meetings/{meeting_id}/transcript/{segment_id}`

Body:

```json
{"text":"Corrected transcript text"}
```

Transcript editing is a useful implementation detail because current Fireflies supports editing the transcript from its Notepad; however, the assignment does not require transcript editing, so this endpoint may be omitted from the first implementation unless the agent already has the underlying model in place. citeturn629797search11

## 9. Action items

### `POST /api/meetings/{meeting_id}/action-items`

```json
{
  "title":"Prepare release notes",
  "assignee":"Aaron Kantor",
  "due_date":"2026-06-12"
}
```

### `PATCH /api/action-items/{action_item_id}`

```json
{
  "title":"Prepare final release notes",
  "assignee":"Aaron Kantor",
  "due_date":"2026-06-13",
  "completed":true
}
```

### `DELETE /api/action-items/{action_item_id}`

Return `{"deleted":true}`.

## 10. Summary

For v1 the summary is persisted as part of the meeting payload and does not need a separate regeneration endpoint.

Future extension:

### `POST /api/meetings/{meeting_id}/summary/regenerate`

This is intentionally not required in v1.

## 11. Error shape

All handled API errors should use:

```json
{
  "detail": "Human-readable message"
}
```

Never return HTML error pages from the API.

## 12. API design rules

- Route handlers should be thin.
- Business rules belong in services.
- Database queries belong in repositories.
- Request/response types belong in Pydantic schemas.
- Never expose ORM objects directly.
- Return deterministic ordering.
- Use ISO-8601 timestamps.
- Use integer seconds for transcript/media synchronization.
