# Common Pitfalls & Lessons Learned

Document debugging insights and mistakes here to avoid repeating them.

## Spotify OAuth

### Redirect URI Strictness
- `127.0.0.1` works in dev, but `localhost` does NOT
- Redirect URIs must match exactly (including trailing slashes)
- Register all URIs in Spotify Developer Dashboard

### Token Storage (RESOLVED)
- **OLD (insecure):** Single `spotify_tokens.json` file shared by all users
- **NEW:** Per-user tokens in PostgreSQL via `UserSession` model
- Never expose `client_secret` to frontend
- Refresh tokens stored server-side only (in DB, never in frontend)
- Token auto-refresh handled in `auth_utils.get_spotify_token()`

### PKCE State Storage (RESOLVED)
- **OLD (buggy):** `/tmp/pkce_state.json` - broke with multiple gunicorn workers
- **NEW:** `AuthState` DB table - works across workers, cleaned up after 10min

### Auth Flow Timing
- Cannot hit auth flow rapidly in succession (wait ~1 min between attempts)
- "Invalid URL" error from Spotify is vague - check redirect URI config first

### Cross-Origin Auth (Bearer Tokens)
- Using bearer tokens in `Authorization` header avoids cross-site cookie issues
- Session token stored in `localStorage` on frontend
- Avoids `SameSite` cookie complexity between Vercel and Render domains

## Render.com Deployment

### Project Structure
- Backend must be in `backend/` folder, not repo root
- Use `render.yaml` for service config
- Environment variables set in Render dashboard, not in code

### Build Script
- `build.sh` handles pip install and migrations
- Ensure Python version matches local dev

## Error Handling

### Opaque Errors
- Generic 500s are bad UX - add context where possible
- Distinguish between: Spotify API failure, backend logic error, auth expiry
- Add logging to narrow down issues

### Logging
- More logging = faster debugging
- Format: `print(f"[function_name] Error: {e}")`
- Wrap external API calls in try/except

## Context Window Management

### Avoid Loading
- `node_modules/`, `build/`, `dist/`, `.next/`, `__pycache__/`
- Large generated files (lockfiles, etc.)
- Use grep/search instead of reading entire files

### Search Strategy
- Use `grep` for known strings/patterns
- Use semantic search for conceptual questions
- Read specific line ranges, not whole files

## Frontend

### Environment Variables
- Next.js requires `NEXT_PUBLIC_` prefix for client-side vars
- Vite uses `VITE_` prefix
- Never commit `.env` files with secrets

---

*Add new entries as issues are discovered and resolved.*
