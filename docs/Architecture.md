# Fireflies Meeting Notes Clone — Architecture Specification

## 1. Purpose

Build a functional, original implementation of the Fireflies.ai-style meeting workspace required by the supplied full-stack assignment. The target is a visually faithful meeting-library + meeting-notepad experience, not a real speech-to-text system.

The assignment explicitly requires a Next.js/TypeScript frontend, a Python backend using FastAPI or Django, and SQLite persistence. It also states that real transcription is out of scope and that seeded/mock transcript data or uploaded transcript files are acceptable. The mandatory scope includes meeting search/filter/sort, interactive transcript + player synchronization, AI summary/notes, action items, CRUD, persistence, Fireflies-like navigation/layout, forms/modals, toasts, and settings placeholders.

## 2. Architecture style

Use a pragmatic modular monolith:

```text
Browser
  |
  | HTTPS / JSON REST
  v
Next.js 15+ / TypeScript frontend
  |
  | REST API client
  v
FastAPI backend
  |
  +-- Service layer
  |
  +-- Repository layer
  |
  +-- Pydantic schemas
  |
  v
SQLAlchemy 2.x
  |
  v
SQLite
```

Do not introduce microservices, message queues, Redis, authentication providers, object storage, or vector databases in the initial version. They are unnecessary for the required scope and would reduce the chance of delivering a reliable 24-hour assignment implementation.

## 3. Repository structure

```text
fireflies-clone/
├── frontend/
│   ├── app/
│   │   ├── page.tsx                         # Home / recent meetings
│   │   ├── meetings/page.tsx                # Meetings library
│   │   ├── meetings/[meetingId]/page.tsx    # Meeting notepad
│   │   ├── uploads/page.tsx                 # Create/import meeting
│   │   ├── settings/page.tsx                # Placeholder settings
│   │   └── coming-soon/[slug]/page.tsx      # Non-core sidebar routes
│   ├── components/
│   │   ├── shell/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Topbar.tsx
│   │   │   └── AppShell.tsx
│   │   ├── meetings/
│   │   │   ├── MeetingTable.tsx
│   │   │   ├── MeetingRow.tsx
│   │   │   ├── MeetingFilters.tsx
│   │   │   ├── MeetingCreateModal.tsx
│   │   │   └── MeetingDeleteDialog.tsx
│   │   ├── notepad/
│   │   │   ├── MeetingHeader.tsx
│   │   │   ├── MediaPlayer.tsx
│   │   │   ├── SummaryPanel.tsx
│   │   │   ├── TranscriptPanel.tsx
│   │   │   ├── TranscriptLine.tsx
│   │   │   ├── TranscriptSearch.tsx
│   │   │   ├── ActionItems.tsx
│   │   │   └── ShareModal.tsx
│   │   └── ui/
│   ├── lib/
│   │   ├── api.ts
│   │   ├── types.ts
│   │   ├── format.ts
│   │   └── constants.ts
│   ├── hooks/
│   │   ├── useMeetings.ts
│   │   ├── useMeeting.ts
│   │   └── useToast.ts
│   ├── public/
│   │   └── demo/
│   ├── package.json
│   └── README.md
│
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── core/config.py
│   │   ├── db/session.py
│   │   ├── db/base.py
│   │   ├── models/
│   │   │   ├── meeting.py
│   │   │   ├── participant.py
│   │   │   ├── transcript.py
│   │   │   ├── summary.py
│   │   │   └── action_item.py
│   │   ├── schemas/
│   │   │   ├── meeting.py
│   │   │   ├── transcript.py
│   │   │   ├── summary.py
│   │   │   └── action_item.py
│   │   ├── repositories/
│   │   │   └── meeting_repository.py
│   │   ├── services/
│   │   │   ├── meeting_service.py
│   │   │   ├── transcript_parser.py
│   │   │   └── summary_service.py
│   │   ├── api/routes/
│   │   │   ├── meetings.py
│   │   │   ├── transcripts.py
│   │   │   ├── action_items.py
│   │   │   └── health.py
│   │   └── seed.py
│   ├── tests/
│   ├── requirements.txt
│   └── README.md
│
├── docs/
│   ├── Architecture.md
│   ├── Design.md
│   ├── API.md
│   ├── DATABASE.md
│   ├── IMPLEMENTATION_PLAN.md
│   └── CODING_AGENT_PROMPT.md
├── README.md
└── .gitignore
```

## 4. Frontend responsibilities

The frontend owns:

- Responsive app shell and Fireflies-style visual hierarchy.
- Client-side interaction state: selected transcript segment, player position, transcript search highlight, modal visibility, optimistic UI where safe.
- REST API calls and typed responses.
- Meeting library controls: search, participant filter, date filter, sort by recency.
- Meeting notepad: summary panel, transcript panel, action items, media player, metadata editing, share/delete dialogs.
- Upload/paste flow for transcript files.
- Toast notifications for success/error operations.

Use server components only where convenient; interactive meeting pages/components should be client components where required.

## 5. Backend responsibilities

The backend owns:

- SQLite persistence.
- CRUD and validation.
- Transcript parsing for TXT/VTT/JSON.
- Seed-data loading.
- Summary/action-item persistence.
- Search/filter/sort query handling.
- Stable IDs and timestamps.
- CORS for the local frontend origin.

Keep API schemas separate from ORM models.

## 6. Core data flow

### Meeting library

```text
GET /api/meetings?q=&participant=&date_from=&date_to=&sort=recent
        |
        v
MeetingRepository.query()
        |
        v
SQLite
        |
        v
MeetingListResponse
        |
        v
MeetingTable -> MeetingRow -> /meetings/:id
```

### Meeting detail

```text
GET /api/meetings/:id
        |
        +--> metadata
        +--> participants
        +--> summary sections
        +--> action items
        +--> transcript segments
```

The frontend initializes a single meeting workspace from this payload. Transcript interaction is then mostly client-side.

### Transcript timestamp synchronization

Maintain one canonical `currentTimeSeconds` state in `MeetingNotepad`.

```text
Transcript line click
      -> set currentTimeSeconds(segment.start)
      -> update player
      -> active segment changes

Player seek / tick
      -> set currentTimeSeconds(t)
      -> find segment where start <= t < end
      -> active transcript line changes
      -> scroll active line into view (optional, but recommended)
```

Do not duplicate time state in multiple child components.

### Transcript search

Search should be local to the currently loaded transcript. For every segment:

```text
normalizedText.includes(normalizedQuery)
```

Render matched substrings using a highlight span. Search result navigation may be simple first/next/previous for the initial scope, but at minimum all visible matches should be highlighted.

## 7. Summary generation strategy

Initial implementation should use deterministic mock/seeded summaries. Do not make the core demo depend on an external LLM API.

`summary_service.py` should expose a stable abstraction:

```python
class SummaryService(Protocol):
    def build_summary(self, transcript: list[TranscriptSegment]) -> SummaryResult: ...
```

Implement `MockSummaryService` first. A future LLM adapter can implement the same interface without changing API contracts.

## 8. Upload/import flow

Required supported import formats:

- `.txt`
- `.vtt`
- `.json`

The assignment explicitly permits uploaded transcript files. The UI may visually resemble the original audio/video upload screen, but the implementation must not pretend that raw audio/video is transcribed.

Flow:

```text
Drop file / paste transcript
  -> parse
  -> validate at least 1 segment
  -> create meeting
  -> create transcript segments
  -> create default/derived summary
  -> redirect to /meetings/:id
```

For JSON, accept either:

```json
[
  {"speaker":"Alice","start":0,"end":5,"text":"Hello"}
]
```

or

```json
{"segments":[{"speaker":"Alice","start":0,"end":5,"text":"Hello"}]}
```

For VTT, parse standard cue timestamps and cue text.

## 9. Error handling

Backend:

- 400 for malformed input.
- 404 for unknown resource IDs.
- 422 for schema validation errors.
- 500 only for unexpected server errors.

Frontend:

- Always show a toast for failed mutations.
- Never silently discard user edits.
- Show empty states instead of broken tables/panels.

## 10. Non-functional requirements

- TypeScript `strict: true`.
- Python type hints for service/repository code.
- Reusable components; avoid huge page components.
- No hard-coded meeting data inside React components.
- No direct SQL from route handlers.
- API base URL configured with environment variable.
- Seed command must be idempotent or safely repeatable.
- Frontend must build without TypeScript errors.
- Backend tests must cover parsing and CRUD at minimum.

## 11. Out of scope for v1

Do not implement these now except as visual placeholders where the shell requires them:

- Real-time bot that joins calls.
- Real speech-to-text.
- Zoom/Google Meet/calendar/CRM integrations.
- Team collaboration and real sharing permissions.
- Real authentication.
- Comments/highlights/soundbites.
- PDF/Markdown/TXT export.
- Global cross-meeting semantic search.
- Tags/topics filtering beyond meeting-local summary/chapter data.
- AskFred/LLM chat.
- Dark mode.

These are explicitly treated by the assignment as mocked/placeholder or optional bonus features.

## 12. Deployment target

Keep deployment straightforward:

- Frontend: Vercel.
- Backend: Render/Railway or equivalent Python host.
- SQLite: acceptable for assignment/demo deployment only if the chosen host provides persistent disk. Otherwise keep the architecture portable so SQLite can be swapped later.

Document local setup first; deployment is a separate step after the local demo is stable.
