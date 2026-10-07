# Fireflies Meeting Notes Clone — Project README

## Overview

A full-stack meeting notes and transcript workspace inspired by the Fireflies.ai desktop experience.

This project is an original implementation created for the supplied SDE Fullstack Assignment. The assignment asks for a Fireflies-like experience centered on meetings, transcripts, summaries, action items, CRUD, persistence, and a polished SaaS UI. Real speech-to-text and live meeting integrations are explicitly out of scope. fileciteturn0file0L2-L18

## Stack

- Next.js + TypeScript
- FastAPI + Python
- SQLAlchemy
- SQLite
- Tailwind CSS (recommended)

## Initial scope

Implemented/required:

- Meetings library.
- Search/filter/sort.
- Meeting notepad.
- Timestamped transcript.
- Transcript/player synchronization.
- Transcript search/highlighting.
- AI summary/notes using mock/seeded data.
- Key topics/outline/chapters.
- Action items.
- Meeting metadata CRUD.
- Meeting deletion.
- Transcript import/paste.
- Persistence.
- Fireflies-style application shell, forms, modals, toasts.
- Settings/non-core placeholders.

Deferred bonus features include comments/highlights/soundbites, exports, global search, tags, meeting chat, and dark mode. fileciteturn0file0L67-L73

## Local setup

### Backend

```bash
cd backend
python -m venv .venv
# Windows PowerShell:
# .venv\Scripts\Activate.ps1
# macOS/Linux:
# source .venv/bin/activate
pip install -r requirements.txt
python -m app.seed
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Set the frontend API base URL to:

```text
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api
```

## Expected local URLs

```text
Frontend: http://localhost:3000
Backend:  http://localhost:8000
Docs:     http://localhost:8000/docs
```

## Documentation

See:

- `docs/Architecture.md`
- `docs/Design.md`
- `docs/API.md`
- `docs/DATABASE.md`
- `docs/IMPLEMENTATION_PLAN.md`
- `docs/CODING_AGENT_PROMPT.md`

## Assumptions

- One default logged-in user is assumed.
- No real authentication is required.
- Uploaded transcript files are the source for imported meetings.
- Media playback may be simulated.
- Summaries are seeded or deterministically generated.
- Fireflies-specific integrations are placeholders.

## Reference material

The supplied assignment is the authoritative functional scope. Its mandatory requirements include meeting library search/filter/sort; interactive transcript and player synchronization; summary/action items/topics; CRUD and persistence; Fireflies-style navigation, forms, modals, and toasts; and seeded sample data. fileciteturn0file0L26-L59 fileciteturn0file0L75-L88

For current Fireflies product terminology and the Notepad two-panel concept, see the Fireflies guide pages consulted during planning.
