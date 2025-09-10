# AI Contribution Guide for SpotifyTools

Always include this in context when suggesting code. 

Welcome, AI assistant 👋  
This file provides guidance on how code contributions should be made to this repository. Please read and follow these rules when generating or editing code.

---

## Project Overview

This repository contains a **fullstack application** that reimplements the features of the original SpotifyTools CLI as a website:

- **Frontend**
Located in `frontend/`
  - React + TypeScript
  - Generated initially with Vercel v0
  - Deployed on Vercel (preferred) or Netlify
  - Static-first architecture (JAMstack)
  - Communicates exclusively with the backend via REST API calls
  - Must be accessible (WCAG 2.1 AA) and mobile-friendly

- **Backend**
Located in `backend/`
  - Python + Django
  - Deployed on Render.com
  - Exposes REST API endpoints that wrap existing Python logic
  - Manages Spotify OAuth (Authorization Code flow)
  - Stores and refreshes tokens in `spotify_tokens.json` at the project root
  - Handles all communication with the Spotify Web API
  - The frontend must **never** hold the client secret or refresh tokens

---

## Features to Implement / Maintain

The system provides four main user-facing features:

1. **Duplicate Checker**  
   - Detect duplicates in a playlist
   - Return grouped duplicates and counts

2. **Duplicate Deletion**  
   - Remove duplicates from a playlist
   - Return summary of kept/removed items

3. **Explicit Content Filter**  
   - Scan playlist for explicit content
   - Modes: Spotify metadata flag OR lyrics (LRCLIB API)
   - Options: Do nothing, create new clean playlist, delete explicit songs

4. **Top Tracks / Artists**  
   - Fetch user’s top tracks or artists
   - Time ranges: short_term (4 weeks), medium_term (6 months), long_term (all time)
   - Limit: top 5 by default

---

## Coding Guidelines

### General
- Follow clear, idiomatic code style:
  - **Frontend**: React + TypeScript, functional components, hooks, TailwindCSS for styling, shadcn/ui components where possible
  - **Backend**: Python 3.10+, Django REST Framework (DRF) for endpoints
- Write code that is modular and extensible; new features should be easy to add without large rewrites
- Accessibility is a priority in the frontend (semantic HTML, ARIA attributes, proper color contrast, keyboard navigation)

### Backend
- Endpoints should follow REST conventions:  
  - `/api/check-duplicates`  
  - `/api/delete-duplicates`  
  - `/api/explicit-filter`  
  - `/api/top-tracks`  
  - `/api/top-artists`
- Handle Spotify OAuth with Authorization Code + Refresh Token flow
  - Store tokens in `spotify_tokens.json` (root of repo)
  - Refresh tokens automatically when needed
  - Never expose client secret to the frontend
- Add retry logic for Spotify API calls (handle 429 with Retry-After)

### Frontend
- Pages/routes:
  - `/duplicates`
  - `/explicit`
  - `/tops`
- Forms: Inputs must have accessible labels, validation, and clear error states
- Results should be displayed using accessible tables or lists
- Use environment variables for API base URL (e.g., `VITE_API_BASE`)

---

## Testing

- **Backend**: Use `pytest` or Django’s test framework for endpoint testing. Include token refresh tests and error-handling tests for Spotify API.  
- **Frontend**: Use Jest + React Testing Library for component tests. Include accessibility tests where possible.  
- Provide mocks for Spotify API and LRCLIB when testing.

---

## Deployment

- **Backend**: Hosted on Render as a Web Service
  - Configure `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REDIRECT_URI`, `SPOTIFY_SCOPES` as environment variables
- **Frontend**: Hosted on Vercel (preferred) or Netlify as a static site
  - Configure `VITE_API_BASE` to point to backend URL

---

## Contribution Rules for AI

1. **Do not** commit secrets or hardcoded tokens.  
2. **Do** prefer configuration via `.env` files (frontend) or Render environment variables (backend).  
3. **Do** maintain consistency in API naming and response structures.  
4. **Do** include inline comments explaining tricky logic (esp. around Spotify OAuth).  
5. **Do** include/update tests when adding new features.  
6. **Do not** rewrite large sections of code unnecessarily; make targeted improvements.  
7. **Do** preserve extensibility — new playlist features should be easy to slot into the existing structure.
