# Coding Agent Master Prompt — Fireflies Meeting Notes Clone

Copy/paste the prompt below into Cursor, Claude Code, Codex, Windsurf, or another coding agent after placing all specification files in the repository.

---

You are the primary implementation engineer for this repository.

Build a functional, original Fireflies.ai-style meeting notes application from the supplied assignment and the specification files in `docs/`.

## Mandatory reading

Read these files before coding:

1. `docs/Architecture.md`
2. `docs/Design.md`
3. `docs/API.md`
4. `docs/DATABASE.md`
5. `docs/IMPLEMENTATION_PLAN.md`
6. `README.md` if already present

Also inspect the repository tree and all existing application code before making architectural changes.

## Product target

The product is a meeting-library + meeting-notepad clone with this v1 scope:

- meetings library,
- meeting search/filter/sort,
- meeting detail page,
- interactive transcript,
- transcript search + match highlighting,
- seekable placeholder/sample player,
- transcript/player bidirectional synchronization,
- AI summary/notes from deterministic mock or seeded data,
- action items with add/edit/complete/delete,
- meeting create/import,
- meeting metadata edit,
- meeting delete,
- persistence in SQLite,
- Fireflies-style sidebar/topbar/forms/modals/toasts,
- settings/non-core navigation placeholders.

The assignment says real speech-to-text and real integrations are out of scope. Do not add them now.

## Technical constraints

Frontend:

- Next.js
- TypeScript
- strict typing
- componentized React UI
- Tailwind CSS or another maintainable CSS system

Backend:

- Python
- FastAPI preferred
- SQLAlchemy 2.x
- SQLite
- Pydantic

Use REST JSON APIs between frontend and backend.

## Important implementation rule

Work in small, verifiable vertical slices. Do not attempt the entire product in one giant change.

After each phase:

1. Run formatter/linter.
2. Run type-check/build for frontend if applicable.
3. Run backend tests.
4. Start the required services.
5. Exercise the changed workflow manually or with a smoke test.
6. Fix regressions before continuing.

Do not mark a phase complete merely because code compiles.

## Build order

Follow this order exactly unless repository constraints make a change necessary:

### Step 1 — foundation

- Set up frontend/backend.
- Set up SQLite and models.
- Add migrations/schema initialization.
- Seed 5+ realistic meetings.
- Add health endpoint.

### Step 2 — app shell + meeting library

- Build sidebar.
- Build topbar.
- Build meetings list.
- Implement search.
- Implement participant filter.
- Implement date filter.
- Implement recency sorting.
- Link rows to meeting detail.

### Step 3 — meeting notepad

- Build meeting header.
- Build summary panel.
- Build transcript panel.
- Build player.
- Build one canonical `currentTimeSeconds` state.
- Implement transcript click -> seek.
- Implement player seek/tick -> active transcript line.
- Implement transcript search + highlights.

### Step 4 — CRUD

- Edit title/participants.
- Add/edit/complete/delete action items.
- Delete meeting.
- Add confirmation dialog.
- Add success/error toasts.

### Step 5 — upload/import

- Match the supplied upload page composition.
- Implement TXT/VTT/JSON upload.
- Implement paste transcript.
- Parse into transcript segments.
- Generate seeded/deterministic summary.
- Redirect to created meeting.

### Step 6 — polish

- Match screenshot proportions.
- Refine typography, spacing, icons, borders, panel split, modal geometry.
- Add empty/loading/error states.
- Verify responsive behavior.

## Visual implementation rules

The goal is a Fireflies-style SaaS UI, not a generic dashboard.

Prioritize:

- deep blue sidebar,
- white content canvas,
- purple accent,
- compact controls,
- light borders,
- small muted metadata,
- rounded but restrained surfaces,
- high whitespace around major headings,
- document-like meeting notes,
- dense but readable transcript rows.

Use the supplied screenshots as direct visual references.

The screenshot references are evidence of layout only; do not scrape or copy proprietary frontend source code. Create the implementation yourself and use original sample data.

## Routing target

Implement at least:

```text
/
/meetings
/meetings/[meetingId]
/uploads
/settings
/coming-soon/[slug]
```

The sidebar may show additional Fireflies-like labels for visual fidelity, but only required routes need full behavior.

## Seed data

Seed at least 5 meetings with:

- title,
- date/time,
- duration,
- 3–6 participants,
- 10–25 transcript segments,
- summary overview,
- key points,
- 2–5 outline/chapter sections,
- 3–5 action items.

Make the fictional meeting content internally consistent so that a demo user can click around without encountering obviously broken data.

## Media player

A real recording is NOT required.

Use either:

- a simulated player whose time state advances while playing, or
- a sample media asset.

The important behavior is synchronization with transcript timestamps.

Implement:

```text
Transcript click -> currentTimeSeconds = segment.start_seconds
Player tick/seek -> locate active segment
```

## Transcript search

Search only the currently loaded transcript.

Requirements:

- case-insensitive,
- highlight all visible matches,
- clear search button,
- no backend dependency for each keystroke.

## Summary

Use deterministic/mock summary data.

Create a service abstraction so an LLM implementation could be added later without changing the UI or route contracts.

Do not require OpenAI/Gemini/Anthropic keys for the demo.

## Upload parser

Support:

- TXT,
- VTT,
- JSON.

Reject malformed files with a clear message.

At minimum, JSON must accept:

```json
[
  {"speaker":"Alice","start":0,"end":5,"text":"Hello"}
]
```

and:

```json
{"segments":[{"speaker":"Alice","start":0,"end":5,"text":"Hello"}]}
```

## Database rules

Use relational tables as described in `docs/DATABASE.md`.

Do not put the entire meeting object into one giant JSON column.

Do not expose ORM models directly from FastAPI endpoints.

## UX rules

Every mutation must have visible feedback.

Destructive actions require confirmation.

Forms must preserve user input when validation fails.

Loading and empty states must look intentional.

No route may result in a blank white page.

## Do NOT implement yet

Do not spend implementation time on:

- real auth,
- real bot/live meeting capture,
- speech-to-text,
- external meeting integrations,
- team permissions,
- comments/highlights/soundbites,
- exports,
- global semantic search,
- AskFred/chat,
- dark mode.

Placeholders are acceptable for non-core sidebar routes.

## Definition of done

The clone is done only when all of the following are true:

- The app launches locally with documented commands.
- The database is populated with sample meetings.
- Meetings can be searched, filtered, and sorted.
- A meeting opens into a polished two-panel notepad.
- Transcript rows are timestamped and clickable.
- Player time and transcript active state stay synchronized.
- Transcript search highlights matches.
- Meeting title/participants can be edited.
- Action items can be added, edited, completed, and deleted.
- Meetings can be deleted with confirmation.
- A transcript can be imported from TXT/VTT/JSON or pasted.
- Data persists across page refreshes.
- Toasts appear for mutation success/failure.
- The UI visually follows the supplied Fireflies screenshots closely.
- Frontend production build passes.
- Backend tests pass.
- README explains setup, architecture, schema, APIs, and assumptions.

## Final response from the coding agent

When implementation is complete, report:

1. What was implemented.
2. Exact local run commands for frontend and backend.
3. Test/build commands and results.
4. Any remaining limitations.
5. Deployment notes.

Do not claim a feature is complete if it is only a placeholder.

---
