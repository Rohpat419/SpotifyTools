# SpotifyTools - AI Agent Guide

Fullstack Spotify playlist utility app: React/TypeScript frontend (Vercel), Django/Python backend (Render + PostgreSQL).

## Quick Links
- **Architecture:** `docs/architecture.md`
- **Style Guide:** `docs/style_guide.md`
- **Common Pitfalls:** `docs/common_pitfalls.md`
- **Ignored Paths:** `.claudeignore`

## Features
1. **Duplicate Manager** - Scan for and remove duplicate tracks (`/duplicates`)
2. **Explicit Content Filter** - Scan/filter explicit content (metadata or lyrics)
3. **Top Tracks/Artists** - User listening stats by time range
4. **Playlist Builder** - Build playlists from Liked Songs with filters

## Global Rules

### Task Workflow
1. **Plan** - Outline work, acceptance criteria, and test strategy
2. **Implement** - Execute the plan
3. **Validate** - Run tests/checks to confirm correctness
4. **Ask for feedback** when requirements are unclear

### Context Management
- **DO NOT** auto-load: `node_modules/`, `build/`, `dist/`, `.next/`, `__pycache__/`
- Use `grep`/search over reading large files
- Keep context minimal - avoid ingesting unnecessary files

### Code Principles
**Prioritize:** Correctness > Simplicity > Readability > Performance > Extensibility

- Avoid over-engineering and large refactors unless necessary
- Be concise - skip long explanations unless asked
- Ask for clarification - don't guess irresponsibly

### Debugging Protocol
1. Identify root cause
2. Propose minimal fix
3. Implement fix
4. Suggest/write tests
5. Validate fix works

### Documentation
- When a significant mistake or lesson is learned, document in `docs/common_pitfalls.md`
- If it's a global behavioral issue, update this file
- **Update this CLAUDE.md whenever features, routes, architecture, or project scope change.** Stale docs cause stale code.
- **WARNING: Keep ALL markdown files (including this one) minimal.** Every line costs context window tokens. If it doesn't directly help the AI agent write correct code, it doesn't belong here.

## Tech Stack
- **Frontend:** React, TypeScript, Next.js, TailwindCSS, shadcn/ui
- **Backend:** Python 3.10+, Django, Django REST Framework, PostgreSQL
- **Hosting:** Vercel (frontend), Render.com (backend + DB)
- **Auth:** Spotify OAuth (PKCE + per-user session tokens in DB)

## Auth Architecture
- Per-user sessions stored in PostgreSQL (`UserSession` model)
- Frontend stores session token in `localStorage`, sends as `Authorization: Bearer <token>`
- Backend validates token, auto-refreshes Spotify access token when expired
- No tokens stored on filesystem; no shared credentials between users
- Auth helper: `backend/api/auth_utils.py`

## Key Files
| Area | Path |
|------|------|
| API Views | `backend/api/views.py` |
| Auth Views | `backend/api/views_auth.py` |
| Auth Utils | `backend/api/auth_utils.py` |
| Models | `backend/api/models.py` |
| Spotify Client | `backend/spotify_tools/client.py` |
| Frontend Pages | `frontend/app/*/page.tsx` |
| API Client | `frontend/lib/api.ts` |

## API Endpoints
- `POST /api/get_duplicate_tracks` - Find duplicates
- `POST /api/delete_duplicate_tracks` - Remove duplicates
- `POST /api/explicit_report` - Scan for explicit content
- `POST /api/create_clean_playlist` - Create filtered playlist
- `POST /api/remove_tracks` - Remove specific tracks
- `GET /api/top_items` - Get top tracks/artists
- `GET /api/liked_songs` - Paginated liked songs
- `GET /api/my_playlists` - User's playlists
- `POST /api/build_playlist` - Create/add to playlist
- `GET /api/auth/status` - Check auth status
- `POST /api/auth/logout` - End session
- `GET /api/debug/ping` - Health check

## Environment Variables
**Backend (Render):** `DATABASE_URL`, `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REDIRECT_URI`, `SPOTIFY_SCOPES`, `FRONTEND_SUCCESS_URL`, `SECRET_KEY`, `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`
**Frontend (Vercel):** `NEXT_PUBLIC_API_BASE_URL`
