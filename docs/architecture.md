# Architecture Overview

## System Diagram
```
┌─────────────────┐     REST API      ┌─────────────────┐     OAuth/API     ┌─────────────────┐
│    Frontend     │ ◄───────────────► │     Backend     │ ◄───────────────► │   Spotify API   │
│  (React/Next)   │   Bearer token    │    (Django)     │                   │                 │
│    Vercel       │                   │    Render       │                   │                 │
└─────────────────┘                   └────────┬────────┘                   └─────────────────┘
                                               │
                                      ┌────────┴────────┐
                                      │   PostgreSQL    │
                                      │  (Render DB)    │    ┌─────────────┐
                                      │  Sessions +     │    │ LRCLIB API  │
                                      │  Auth State     │    │ (Lyrics)    │
                                      └─────────────────┘    └─────────────┘
```

## Frontend (`frontend/`)
- **Framework:** Next.js with React + TypeScript
- **Styling:** TailwindCSS + shadcn/ui components
- **Deployment:** Vercel

### Pages
| Route | Purpose |
|-------|---------|
| `/` | Home/landing |
| `/duplicates` | Find and remove duplicates |
| `/explicit-filter` | Filter explicit content |
| `/top-tracks` | View listening stats |
| `/playlist-builder` | Build playlists from Liked Songs |
| `/auth/success` | OAuth callback handler |

## Backend (`backend/`)
- **Framework:** Django + Django REST Framework
- **Database:** PostgreSQL (Render free tier)
- **Deployment:** Render.com (Web Service)

### Key Modules
| Module | Purpose |
|--------|---------|
| `api/models.py` | UserSession, AuthState models |
| `api/views.py` | Feature API endpoints |
| `api/views_auth.py` | OAuth login, callback, status, logout |
| `api/auth_utils.py` | Per-request auth + token refresh |
| `spotify_tools/client.py` | Spotify API wrapper |
| `spotify_tools/duplicates.py` | Duplicate detection |
| `spotify_tools/explicit.py` | Explicit content scanning |
| `spotify_tools/tops.py` | Top tracks/artists |

## Authentication Flow
1. User clicks "Login with Spotify" on frontend
2. Browser redirects to backend `GET /api/auth/login`
3. Backend generates PKCE verifier, stores state in `AuthState` DB table
4. Backend redirects to Spotify authorization page
5. User grants permissions on Spotify
6. Spotify redirects to backend `GET /api/auth/callback`
7. Backend looks up PKCE state from DB, exchanges code for tokens
8. Backend calls Spotify `GET /me` to get user profile
9. Backend creates `UserSession` in DB with tokens + session token
10. Backend redirects to frontend `/auth/success?session=<token>`
11. Frontend stores session token in `localStorage`
12. All subsequent API calls include `Authorization: Bearer <token>` header
13. Backend validates token, auto-refreshes Spotify access token if expired

**Security:** Frontend never holds `client_secret` or `refresh_token`. Each user has isolated credentials.

## Data Flow (API Request)
1. Frontend sends request with `Authorization: Bearer <session_token>`
2. `auth_utils.require_auth()` looks up `UserSession` by token
3. If Spotify access token expired, refreshes via `client_secret` + `refresh_token`
4. Creates `SpotifyClient(user_token=access_token)`
5. Executes business logic, returns response

## External Dependencies
- **Spotify Web API** - All playlist/user data
- **LRCLIB API** - Lyrics-based explicit detection (optional mode)
- **PostgreSQL** - User sessions and auth state
