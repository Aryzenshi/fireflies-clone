# Fireflies Meeting Notes Clone — Implementation Plan

## Phase 0 — Repository inspection

Before changing code:

1. Inspect the existing repository and identify whether frontend/backend already exist.
2. Read the root README, package manifests, Python requirements, environment files, and existing source tree.
3. Do not overwrite working code without understanding it.
4. If the repository is empty, scaffold the architecture specified in `Architecture.md`.

## Phase 1 — Backend foundation

Deliver:

- FastAPI app.
- SQLite connection.
- SQLAlchemy models.
- Alembic or equivalent schema initialization.
- Pydantic schemas.
- Health endpoint.
- CORS.
- Seed command.

Acceptance:

```text
GET /api/health -> 200
seed -> at least 5 meetings
GET /api/meetings -> 5+ meetings
GET /api/meetings/{id} -> complete detail payload
```

## Phase 2 — Meeting library

Deliver:

- Sidebar shell.
- Topbar.
- Meetings page.
- Meeting list/table.
- Search by title/participant.
- Date filter.
- Recent/oldest sorting.
- Click row -> meeting detail.
- Loading/empty/error states.

Acceptance:

- Search actually changes API query/results.
- Date filter changes results.
- Sort order is deterministic.
- Clicking a meeting always navigates correctly.

## Phase 3 — Meeting notepad

Deliver:

- Meeting header.
- Summary panel.
- Transcript panel.
- Transcript timestamps.
- Player with seek bar.
- Shared current-time state.
- Transcript -> player sync.
- Player -> transcript sync.
- Local transcript search + highlighting.

Acceptance:

1. Clicking a transcript line changes current time.
2. Moving the player changes active transcript line.
3. Search highlights every matching occurrence.
4. The active transcript line is visually distinct.

## Phase 4 — Action items + metadata CRUD

Deliver:

- Edit meeting title.
- Edit participant list.
- Add action item.
- Edit action item.
- Complete/uncomplete action item.
- Delete action item.
- Delete meeting.
- Confirmation dialog for meeting deletion.
- Toasts for every mutation.

Acceptance:

Refresh the page after every operation and verify data remains changed.

## Phase 5 — Import/create meeting

Deliver:

- Upload screen matching supplied reference composition.
- TXT/VTT/JSON parsing.
- Paste transcript option.
- Title + participant metadata.
- Create meeting.
- Redirect to created meeting.

Acceptance:

Create one meeting from each supported source and verify the full notepad works.

## Phase 6 — Visual fidelity pass

Use the supplied screenshots as visual references.

At minimum compare:

- sidebar width and color,
- active navigation state,
- topbar height,
- input/button density,
- modal geometry,
- upload page heading/dropzone placement,
- meeting page two-column proportions,
- typography and muted metadata hierarchy.

Do not spend time matching tiny browser rendering differences.

## Phase 7 — Testing and hardening

Backend:

- parser tests for TXT/VTT/JSON,
- meeting CRUD test,
- action item CRUD test,
- filtering/sorting test.

Frontend:

- TypeScript compile,
- lint,
- production build,
- basic Playwright smoke test if time allows.

## Phase 8 — Documentation and deployment

Complete:

- root README,
- setup instructions,
- environment variables,
- architecture summary,
- schema summary,
- API summary,
- assumptions,
- known limitations.

Then deploy frontend and backend only after local end-to-end flow works.
