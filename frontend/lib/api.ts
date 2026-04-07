// ── Types ──────────────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface DuplicateCheckResult {
  groups: any[]
  count: number
}

export interface DuplicateDeletionResult {
  original_count?: number
  kept_count?: number
  removed_count?: number
  playlist_id?: string
  [key: string]: any
}

export interface ExplicitTrack {
  uri: string
  track_name: string
  artists: string[]
  reason: string
  confidence?: number
}

export interface ExplicitFilterResult {
  rows: ExplicitTrack[]
}

export interface TopItem {
  id: string
  name: string
  artists?: string[]
  genres?: string[]
  album?: string
  [key: string]: any
}

export interface TopItemsResult {
  items: TopItem[]
}

export interface LikedSong {
  uri: string
  name: string
  artists: string[]
  album: string
  album_image: string
  release_date: string
  duration_ms: number
  added_at: string
  explicit: boolean
}

export interface LikedSongsResult {
  items: LikedSong[]
  total: number
  offset: number
  limit: number
}

export interface PlaylistSummary {
  id: string
  name: string
  image: string
  track_count: number
  public: boolean
}

export interface MyPlaylistsResult {
  playlists: PlaylistSummary[]
}

export interface BuildPlaylistResult {
  playlist_id: string
  added_count: number
  action: "created" | "added"
}

export interface AuthStatus {
  authenticated: boolean
  spotify_user_id?: string
  display_name?: string
}

// ── Session token helpers ──────────────────────────────────────────────────

const SESSION_KEY = "spotifytools_session"

export function getSessionToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(SESSION_KEY)
}

export function setSessionToken(token: string): void {
  if (typeof window !== "undefined") localStorage.setItem(SESSION_KEY, token)
}

export function clearSessionToken(): void {
  if (typeof window !== "undefined") localStorage.removeItem(SESSION_KEY)
}

// ── API base URL ───────────────────────────────────────────────────────────

const getApiBaseUrl = () => {
  const env = (typeof globalThis !== "undefined" && globalThis.process?.env) || {}
  return env.NEXT_PUBLIC_API_BASE_URL || "https://spotify-tools-jo2u.onrender.com"
}

const API_BASE_URL = getApiBaseUrl()

export { API_BASE_URL }

// ── Error handling ─────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public code?: string,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

export interface ApiRequestOptions {
  timeout?: number
  retries?: number
  retryDelay?: number
}

// ── Authenticated fetch helper ─────────────────────────────────────────────

async function authFetch(
  endpoint: string,
  init: RequestInit = {},
  timeoutMs = 30000,
): Promise<Response> {
  const token = getSessionToken()
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(`${API_BASE_URL}${endpoint}`, {
      ...init,
      headers,
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timer)
  }
}

// ── Validation helpers ─────────────────────────────────────────────────────

export const validatePlaylistUrl = (url: string): { isValid: boolean; playlistId?: string; error?: string } => {
  if (!url.trim()) {
    return { isValid: false, error: "Playlist URL is required" }
  }
  const spotifyUrlRegex = /^(https?:\/\/)?(open\.)?spotify\.com\/playlist\/[a-zA-Z0-9]+(\?[^\s]*)?$/
  if (spotifyUrlRegex.test(url.trim())) {
    return { isValid: true, playlistId: url.trim() }
  }
  const playlistIdRegex = /^[a-zA-Z0-9]{22}$/
  if (playlistIdRegex.test(url.trim())) {
    return { isValid: true, playlistId: `https://open.spotify.com/playlist/${url.trim()}` }
  }
  return { isValid: false, error: "Invalid Spotify playlist URL or ID format" }
}

export const formatError = (error: unknown): string => {
  if (error instanceof ApiError) {
    switch (error.code) {
      case "HTTP_401":
        return "Authentication required. Please connect your Spotify account."
      case "HTTP_403":
        return "Access denied. You may not have permission to access this playlist."
      case "HTTP_404":
        return "Playlist not found. Please check the URL and try again."
      case "HTTP_429":
        return "Too many requests. Please wait a moment and try again."
      case "HTTP_500":
        return "Server error. Please try again later."
      case "NETWORK_ERROR":
        return "Network connection failed. Please check your internet connection."
      default:
        return error.message
    }
  }
  if (error instanceof Error) return error.message
  return "An unexpected error occurred"
}

// ── Wrapped fetch with error handling ──────────────────────────────────────

async function apiFetch<T>(endpoint: string, init: RequestInit = {}): Promise<ApiResponse<T>> {
  try {
    const response = await authFetch(endpoint, init)
    if (!response.ok) {
      throw new ApiError(
        `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        `HTTP_${response.status}`,
      )
    }
    const data = await response.json()
    return { success: true, data }
  } catch (error) {
    return { success: false, error: formatError(error) }
  }
}

// ── Enhanced API ───────────────────────────────────────────────────────────

export const enhancedApi = {
  // ── Auth ──
  async checkAuthStatus(): Promise<ApiResponse<AuthStatus>> {
    return apiFetch<AuthStatus>("/api/auth/status")
  },

  async logout(): Promise<ApiResponse<{ ok: boolean }>> {
    return apiFetch<{ ok: boolean }>("/api/auth/logout", { method: "POST" })
  },

  // ── Duplicates ──
  async checkDuplicates(playlistUrl: string): Promise<ApiResponse<DuplicateCheckResult>> {
    const v = validatePlaylistUrl(playlistUrl)
    if (!v.isValid) return { success: false, error: v.error }
    return apiFetch<DuplicateCheckResult>("/api/get_duplicate_tracks", {
      method: "POST",
      body: JSON.stringify({ playlist_id: v.playlistId, strict: false, tol_secs: 5 }),
    })
  },

  async deleteDuplicates(playlistUrl: string): Promise<ApiResponse<DuplicateDeletionResult>> {
    const v = validatePlaylistUrl(playlistUrl)
    if (!v.isValid) return { success: false, error: v.error }
    return apiFetch<DuplicateDeletionResult>("/api/delete_duplicate_tracks", {
      method: "POST",
      body: JSON.stringify({ playlist_id: v.playlistId }),
    })
  },

  // ── Explicit ──
  async filterExplicitContent(
    playlistUrl: string,
    mode: "metadata" | "lyrics",
  ): Promise<ApiResponse<ExplicitFilterResult>> {
    const v = validatePlaylistUrl(playlistUrl)
    if (!v.isValid) return { success: false, error: v.error }
    return apiFetch<ExplicitFilterResult>("/api/explicit_report", {
      method: "POST",
      body: JSON.stringify({ playlist_id: v.playlistId, mode }),
    })
  },

  async removeTracks(
    playlistUrl: string,
    uris: (string | { uri: string })[],
  ): Promise<ApiResponse<{ removed_count: number; removed_uris: string[] }>> {
    const v = validatePlaylistUrl(playlistUrl)
    if (!v.isValid) return { success: false, error: v.error }
    const cleanUris = uris.map((u) => (typeof u === "string" ? u : u.uri))
    return apiFetch("/api/remove_tracks", {
      method: "POST",
      body: JSON.stringify({ playlist_id: v.playlistId, uris: cleanUris }),
    })
  },

  async createCleanPlaylist(
    playlistUrl: string,
    explicitRows: ExplicitTrack[],
  ): Promise<ApiResponse<any>> {
    const v = validatePlaylistUrl(playlistUrl)
    if (!v.isValid) return { success: false, error: v.error }
    return apiFetch("/api/create_clean_playlist", {
      method: "POST",
      body: JSON.stringify({ playlist_id: v.playlistId, rows: explicitRows }),
    })
  },

  // ── Top Items ──
  async getTopItems(
    kind: "tracks" | "artists",
    timeRange: "4_weeks" | "6_months" | "all_time",
  ): Promise<ApiResponse<TopItemsResult>> {
    const tr = timeRange === "4_weeks" ? "short_term" : timeRange === "6_months" ? "medium_term" : "long_term"
    return apiFetch<TopItemsResult>(`/api/top_items?kind=${kind}&time_range=${tr}&limit=5`)
  },

  async getTopTracks(timeRange: "4_weeks" | "6_months" | "all_time") {
    return this.getTopItems("tracks", timeRange)
  },

  async getTopArtists(timeRange: "4_weeks" | "6_months" | "all_time") {
    return this.getTopItems("artists", timeRange)
  },

  // ── Liked Songs / Playlist Builder ──
  async getLikedSongs(offset = 0, limit = 50): Promise<ApiResponse<LikedSongsResult>> {
    return apiFetch<LikedSongsResult>(`/api/liked_songs?offset=${offset}&limit=${limit}`)
  },

  async getMyPlaylists(): Promise<ApiResponse<MyPlaylistsResult>> {
    return apiFetch<MyPlaylistsResult>("/api/my_playlists")
  },

  async buildPlaylist(
    action: "create" | "add",
    uris: string[],
    opts: { playlist_name?: string; playlist_id?: string } = {},
  ): Promise<ApiResponse<BuildPlaylistResult>> {
    return apiFetch<BuildPlaylistResult>("/api/build_playlist", {
      method: "POST",
      body: JSON.stringify({ action, uris, ...opts }),
    })
  },
}

export const api = enhancedApi

export const apiUtils = { validatePlaylistUrl, formatError, ApiError }
