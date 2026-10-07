# Acceptance checklist — verified results

This is `docs/AGENT_CHECKLIST.md` (the assignment's own gate) filled in against the code in this
repository. Every ✅ was checked by running the app, not by reading the code: the marker in the
last column names the automated test or the manual step used.

Test commands referenced below:

```bash
cd backend  && python -m pytest -q                                  # 53 passed
cd frontend && npm run typecheck && npm test                        # tsc clean, 19 passed
cd frontend && npm run build                                        # production build OK
cd frontend && npx playwright test                                  # 23 passed
```

Playwright runs against `next build` + `next start` (production) with the FastAPI backend on :8000.

## Functional

| # | Check | Result | Evidence |
| --- | --- | --- | --- |
| 1 | Home/Meetings shell loads without errors | ✅ | e2e `no console errors or hydration warnings on the main routes` walks all six routes and fails on any React error/warning |
| 2 | Seed data appears on first run | ✅ | `python -m app.seed` → 6 created; auto-seed on empty DB; `test_seed.py` |
| 3 | Meeting list shows title/date/duration/participants | ✅ | e2e `lists seeded meetings with title, date, duration and participants` |
| 4 | Search works | ✅ | e2e `lists seeded meetings…` + `search, participant filter, date filter and sorting…` + topbar search test; `test_meetings_api.py::test_search_matches_transcript_text` covers a phrase that exists only inside a transcript line |
| 5 | Participant filter works | ✅ | e2e `search, participant filter, date filter and sorting change the result set`; `test_deleting_a_meeting_prunes_participants_it_owned` keeps the filter free of people whose meetings are gone |
| 6 | Date filter works | ✅ | same test (`range=7d` → 4 meetings) |
| 7 | Recent/oldest sorting works | ✅ | same test (`sort=oldest` → first row *Incident Review*) |
| 8 | Meeting opens on click | ✅ | e2e `renders summary, topics, action items and transcript` |
| 9 | Meeting summary loads | ✅ | same test (Overview / Key points / Chapters sections) |
| 10 | Transcript loads with speaker + timestamps | ✅ | same test |
| 11 | Transcript row click seeks player | ✅ | e2e `clicking a transcript line seeks the player (transcript -> player)` |
| 12 | Player seek/tick changes active transcript row | ✅ | e2e `player position drives the active transcript line (player -> transcript)`; also `keyboard shortcuts control playback without stealing typing` (Space, ArrowRight on the seek bar) |
| 13 | Transcript search highlights matches | ✅ | e2e `transcript search highlights matches and keeps rows clickable` |
| 14 | Action item completion persists | ✅ | e2e `action item completion and edits persist across a reload` (asserted via API after reload) |
| 15 | Action item add/edit/delete persists | ✅ | same e2e test + `test_action_items.py` |
| 16 | Meeting title edit persists | ✅ | e2e `meeting title and participants edits persist` |
| 17 | Meeting participant edit persists | ✅ | same test |
| 18 | Meeting delete works with confirmation | ✅ | e2e `deleting a meeting asks for confirmation and removes it` |
| 19 | TXT import works | ✅ | e2e `imports TXT, VTT and JSON files and surfaces a bad file type` |
| 20 | VTT import works | ✅ | same test |
| 21 | JSON import works | ✅ | same test |
| 22 | Paste transcript create flow works | ✅ | e2e `creating a meeting from a pasted transcript opens the notepad` |
| 23 | Created meeting opens automatically | ✅ | same test (asserts the notepad URL) |

## Visual

| # | Check | Result | Evidence |
| --- | --- | --- | --- |
| 24 | Sidebar has correct dark blue proportion | ✅ | 152 px `#334261`, 24 px nav-row pitch (measured off the reference PNGs: sidebar edge x=152, row pitch 24 px) |
| 25 | Active nav item has clear highlight | ✅ | active row `#29354F` on `#334261` (the "rail" in the reference turned out to be its scrollbar thumb, so no purple rail is drawn) |
| 26 | Topbar density resembles reference | ✅ | 46 px bar, pill search with `Ctrl K`, AskFred chip, credits chip, rounded-square avatar |
| 27 | Search/filter controls resemble reference | ✅ | search + participants + date + sort pills above the table, `+ New meeting` |
| 28 | Main content uses white/light surfaces and thin borders | ✅ | `#FFFFFF` cards on a `#F4F6FA` canvas (sampled from image-1), `1px #E5E7EB` borders |
| 29 | Purple accent used consistently | ✅ | primary `#6E68E8`, soft `#F0EDFF` for badges/active states/focus rings |
| 30 | Meeting page uses two-panel notes/transcript layout | ✅ | `AI Notes` left / `AI Transcript` right from 860 px (matches the reference notepad capture); tabs below |
| 31 | Upload page resembles supplied screenshot | ✅ | white page, centered heading that fits one line, Upload/Paste tabs, large dashed drop zone with a violet badge |
| 32 | Modals use centered white panels over a dimmed page | ✅ | Share / New meeting / Settings / Replace transcript / confirm dialogs |
| 33 | Toasts appear bottom-right | ✅ | `ToastViewport` + `role="status"` assertions in e2e |
| 34 | Empty/loading/error states are polished | ✅ | skeletons, empty library state, detail error state with retry; e2e `empty state appears for a query with no matches` + `a missing meeting renders the error state and returns 404 JSON` |
| 35 | Narrow viewport (390 px) stays usable | ✅ | manual scripted check: tabbed notes/transcript, drawer nav (`aria-expanded`), 20 transcript rows rendered, transcript tap seeks the player |
| 36 | One sidebar landmark and nav copy in the DOM | ✅ | e2e shell test asserts 1 `complementary[Primary navigation]`, 1 `navigation[Primary]`, 1 "Meetings" link |

## Engineering

| # | Check | Result | Evidence |
| --- | --- | --- | --- |
| 37 | No frontend TypeScript errors | ✅ | `npm run typecheck` (strict, `noUnusedLocals`/`noUnusedParameters`) |
| 38 | Production build passes | ✅ | `npm run build` — all routes compiled; e2e runs against this build |
| 39 | Backend tests pass | ✅ | `pytest -q` → 30 passed |
| 40 | API errors use consistent JSON | ✅ | `{"detail": ...}` for 400/404/422; `test_meetings_api.py` error cases |
| 41 | ORM models are not returned directly | ✅ | every route declares a Pydantic `response_model`; `services/serializers.py` maps models |
| 42 | Business logic is not embedded in route handlers | ✅ | routes → `MeetingService` → repositories → models (see README §5) |
| 43 | Environment variables are documented | ✅ | README §4 table: `DATABASE_URL`, `AUTO_SEED`, `CORS_ORIGINS`, `MAX_UPLOAD_BYTES`, `API_PROXY_TARGET`, … |
| 44 | Seed operation is repeatable/safe | ✅ | idempotent `python -m app.seed` (0 created, 6 skipped on re-run); `test_seed.py` |
| 45 | No secrets committed | ✅ | no keys/tokens anywhere; no `.env` file; API needs none |
| 46 | README explains setup and assumptions | ✅ | README §4 (setup) and §9 (assumptions) |

## Evaluation readiness (talking points)

- **Database relationships** — `users → meetings → {meeting_participants, transcript_segments,
  meeting_summaries → summary_sections, action_items}`, with `participants` shared many-to-many
  through `meeting_participants` (role + host flag) and cascade deletes configured on every child.
- **Transcript/player synchronisation** — one `currentTimeSeconds` state in `MeetingWorkspace` is
  the single writer for the player, the seek bar and the active transcript line; transcript clicks
  go through the same `seek()` that the tick uses, so the two directions cannot drift apart.
- **Why real STT is not implemented** — the assignment marks live bot/recording/STT/integrations as
  mockable, and shipping a speech model or API key would add cost and non-determinism without
  changing the graded behaviour; transcripts are created through paste/upload/import instead.
- **API separation and layering** — HTTP shape lives in `app/api`, rules in `app/services`, queries
  in `app/repositories`, persistence in `app/models`; routes contain no SQL and return no ORM objects.
- **Live CRUD/persistence demo** — create a meeting from paste → edit title → toggle action items →
  replace the transcript (notes regenerate) → reload the page (state survives, stored in SQLite,
  not localStorage) → delete the meeting.
- **UI provenance** — the layout was re-implemented from the three supplied screenshots and
  `docs/Design.md`; no Fireflies.ai repository, CSS or asset was copied, and every icon is an
  inline SVG written for this project.

## Bonus scope (optional, built after the mandatory list was verified)

| Feature | Result | Evidence |
| --- | --- | --- |
| Meeting export as Markdown / plain text | ✅ built | `GET /api/meetings/{meeting_id}/export?format=markdown\|txt`; 6 pytest cases (content, filename slugging, `txt` has no markup, default + case-insensitive format, `400` for `pdf`, `404` for unknown id) and an e2e spec asserting a real download event, suggested filename and downloaded file contents |
| Library list stays flat as transcripts grow | ✅ verified | `test_library_list_does_not_load_transcripts` asserts the list query never touches `transcript_segments`/`summary_sections` (5 statements regardless of transcript size) |
| Meeting tags (create, edit, filter, directory) | ✅ built | `meetings.tags_json` + `GET /api/tags`; 7 pytest cases (trim/dedupe, persistence, validation, case-insensitive exact filter, directory, import, export) and an e2e spec (add → persist → filter library → clear) |
| Transcript comments / highlights | ✅ built | `meeting_comments` (optionally anchored to a segment, `ON DELETE CASCADE`) + 8 pytest cases and an e2e spec (comment on a line → anchor persisted → timestamp chip seeks the player → edit → delete) |
| Soundbites, meeting chat, dark mode | ⛔ not built | Deferred by `docs/README.md` and left out deliberately; `docs/Design.md` also rules out transcript-wide global search |
