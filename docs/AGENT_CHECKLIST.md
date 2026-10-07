# Coding Agent Acceptance Checklist

Use this as the final gate before submitting the clone.

## Functional

- [ ] Home/Meetings shell loads without errors.
- [ ] Seed data appears on first run.
- [ ] Meeting list shows title/date/duration/participants.
- [ ] Search works.
- [ ] Participant filter works.
- [ ] Date filter works.
- [ ] Recent/oldest sorting works.
- [ ] Meeting opens on click.
- [ ] Meeting summary loads.
- [ ] Transcript loads with speaker + timestamps.
- [ ] Transcript row click seeks player.
- [ ] Player seek/tick changes active transcript row.
- [ ] Transcript search highlights matches.
- [ ] Action item completion persists.
- [ ] Action item add/edit/delete persists.
- [ ] Meeting title edit persists.
- [ ] Meeting participant edit persists.
- [ ] Meeting delete works with confirmation.
- [ ] TXT import works.
- [ ] VTT import works.
- [ ] JSON import works.
- [ ] Paste transcript create flow works.
- [ ] Created meeting opens automatically.

## Visual

- [ ] Sidebar has correct dark blue proportion.
- [ ] Active nav item has clear highlight.
- [ ] Topbar density resembles reference.
- [ ] Search/filter controls resemble reference.
- [ ] Main content uses white/light surfaces and thin borders.
- [ ] Purple accent is used consistently.
- [ ] Meeting page uses two-panel notes/transcript layout.
- [ ] Upload page resembles supplied upload screenshot.
- [ ] Modals use centered white panels over a dimmed page.
- [ ] Toasts appear bottom-right.
- [ ] Empty/loading/error states are polished.

## Engineering

- [ ] No frontend TypeScript errors.
- [ ] Production build passes.
- [ ] Backend tests pass.
- [ ] API errors use consistent JSON.
- [ ] ORM models are not returned directly.
- [ ] Business logic is not embedded in route handlers.
- [ ] Environment variables are documented.
- [ ] Seed operation is repeatable/safe.
- [ ] No secrets committed.
- [ ] README explains setup and assumptions.

## Evaluation readiness

- [ ] Can explain database relationships.
- [ ] Can explain transcript/player synchronization.
- [ ] Can explain why real STT is not implemented.
- [ ] Can explain API separation and service/repository layers.
- [ ] Can demonstrate CRUD and persistence live.
- [ ] Can explain how the UI was derived from the references without copying an existing repository.
