# Fireflies Meeting Notes Clone — Database Schema

Database: SQLite
ORM: SQLAlchemy 2.x
Migration tool: Alembic recommended

## 1. Entity relationship

```text
User (default seeded user)
  |
  | 1-to-many
  v
Meeting --------------------< MeetingParticipant >---------------- Participant
  |
  +-------------------------< TranscriptSegment
  |
  +-------------------------  MeetingSummary
  |                              |
  |                              +----< SummarySection
  |
  +-------------------------< ActionItem
```

## 2. users

| Column | Type | Constraints |
|---|---|---|
| id | string | PK |
| name | string | NOT NULL |
| email | string | NOT NULL, UNIQUE |
| avatar_url | string | NULL |
| created_at | datetime | NOT NULL |

A single default logged-in user is sufficient for v1 because real authentication is explicitly out of scope. fileciteturn0file0L60-L66

## 3. meetings

| Column | Type | Constraints |
|---|---|---|
| id | string | PK |
| owner_id | string | FK users.id, NOT NULL |
| title | string | NOT NULL |
| started_at | datetime | NOT NULL |
| duration_seconds | integer | NOT NULL, >= 0 |
| host_name | string | NULL |
| source_type | string | NOT NULL (`seed`/`import`/`manual`) |
| created_at | datetime | NOT NULL |
| updated_at | datetime | NOT NULL |

Indexes:

- `(owner_id, started_at)`
- `title`

## 4. participants

| Column | Type | Constraints |
|---|---|---|
| id | string | PK |
| display_name | string | NOT NULL |
| email | string | NULL |

Keep the participant as its own entity so meetings can reuse the same person while allowing meeting-specific attendance relationships.

## 5. meeting_participants

| Column | Type | Constraints |
|---|---|---|
| meeting_id | string | FK meetings.id, PK part |
| participant_id | string | FK participants.id, PK part |
| role | string | NULL |

Composite primary key: `(meeting_id, participant_id)`.

## 6. transcript_segments

| Column | Type | Constraints |
|---|---|---|
| id | string | PK |
| meeting_id | string | FK meetings.id, NOT NULL |
| sequence | integer | NOT NULL |
| speaker_name | string | NOT NULL |
| start_seconds | integer | NOT NULL, >= 0 |
| end_seconds | integer | NOT NULL, >= start |
| text | text | NOT NULL |
| created_at | datetime | NOT NULL |
| updated_at | datetime | NOT NULL |

Indexes:

- `(meeting_id, sequence)`
- `(meeting_id, start_seconds)`

Do not use floats for canonical timestamps unless needed; integer milliseconds can be used later. Integer seconds are sufficient for v1 and simplify player synchronization.

## 7. meeting_summaries

| Column | Type | Constraints |
|---|---|---|
| id | string | PK |
| meeting_id | string | FK meetings.id, UNIQUE |
| overview | text | NOT NULL |
| created_at | datetime | NOT NULL |
| updated_at | datetime | NOT NULL |

## 8. summary_sections

| Column | Type | Constraints |
|---|---|---|
| id | string | PK |
| summary_id | string | FK meeting_summaries.id, NOT NULL |
| title | string | NOT NULL |
| timestamp_seconds | integer | NULL |
| bullets_json | text | NOT NULL |
| sequence | integer | NOT NULL |

Store the short bullet list as JSON text in SQLite to keep the schema simple. Do not introduce a generic EAV schema.

## 9. action_items

| Column | Type | Constraints |
|---|---|---|
| id | string | PK |
| meeting_id | string | FK meetings.id, NOT NULL |
| title | string | NOT NULL |
| assignee | string | NULL |
| due_date | date | NULL |
| completed | boolean | NOT NULL DEFAULT 0 |
| created_at | datetime | NOT NULL |
| updated_at | datetime | NOT NULL |

Indexes:

- `(meeting_id, completed)`
- `(meeting_id, due_date)`

## 10. Delete behavior

Use cascading deletion from `meetings` to:

- meeting_participants,
- transcript_segments,
- meeting_summaries,
- summary_sections,
- action_items.

This ensures deleting a meeting removes all dependent meeting content and avoids orphan records.

## 11. Seed data requirements

The assignment explicitly asks for several meetings with full transcripts, summaries, and action items so the application is immediately usable. fileciteturn0file0L75-L82

Seed at least 5 meetings:

1. Weekly Product Sync — 4 participants — ~29 min.
2. Design Review — 3 participants — ~41 min.
3. Engineering Standup — 5 participants — ~17 min.
4. Customer Discovery Call — 4 participants — ~32 min.
5. Sprint Planning — 6 participants — ~52 min.

Each meeting should have:

- 10–25 realistic transcript segments minimum.
- One overview paragraph.
- 3–6 key points.
- 3–5 action items, mixed completed/uncompleted.
- 2–5 summary sections with timestamps.

The exact fictional names/content are original sample data, not copied from Fireflies.
