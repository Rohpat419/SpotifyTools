export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface DuplicateGroup {
  trackName: string
  artists: string[]
  count: number
  trackIds: string[]
}

export interface DuplicateCheckResult {
  groups: any[] // Backend returns groups array
  count: number // Backend returns count
}

export interface DuplicateDeletionResult {
  original_count?: number
  kept_count?: number
  removed_count?: number
  playlist_id?: string
  [key: string]: any // Backend may return additional fields
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

const getApiBaseUrl = () => {
  // Use globalThis to safely access process in both environments
  const env = (typeof globalThis !== "undefined" && globalThis.process?.env) || {}
  return env.NEXT_PUBLIC_API_BASE_URL || "https://spotify-tools-eozl.onrender.com"
}

const API_BASE_URL = getApiBaseUrl()

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

class ApiClient {
  private baseUrl: string
  private defaultTimeout = 10000
  private defaultRetries = 3
  private defaultRetryDelay = 1000

  constructor(baseUrl = API_BASE_URL) {
    this.baseUrl = baseUrl
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit & ApiRequestOptions = {},
  ): Promise<ApiResponse<T>> {
    const {
      timeout = this.defaultTimeout,
      retries = this.defaultRetries,
      retryDelay = this.defaultRetryDelay,
      ...fetchOptions
    } = options

    let lastError: Error | null = null

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), timeout)

        const response = await fetch(`${this.baseUrl}${endpoint}`, {
          ...fetchOptions,
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            ...fetchOptions.headers,
          },
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          throw new ApiError(
            `HTTP ${response.status}: ${response.statusText}`,
            response.status,
            `HTTP_${response.status}`,
          )
        }

        const data = await response.json()
        return data
      } catch (error) {
        lastError = error as Error

        if (error instanceof ApiError && error.statusCode && error.statusCode < 500) {
          // Don't retry client errors (4xx)
          break
        }

        if (attempt < retries) {
          await this.delay(retryDelay * Math.pow(2, attempt)) // Exponential backoff
        }
      }
    }

    // If we get here, all retries failed
    if (lastError instanceof ApiError) {
      throw lastError
    }

    throw new ApiError(lastError?.message || "Network request failed", undefined, "NETWORK_ERROR")
  }

  async get<T>(endpoint: string, options?: ApiRequestOptions): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { ...options, method: "GET" })
  }

  async post<T>(endpoint: string, data?: any, options?: ApiRequestOptions): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      ...options,
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async put<T>(endpoint: string, data?: any, options?: ApiRequestOptions): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      ...options,
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async delete<T>(endpoint: string, options?: ApiRequestOptions): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(endpoint, { ...options, method: "DELETE" })
  }
}

// Create singleton API client
const apiClient = new ApiClient()

// Utility functions for common operations
export const validatePlaylistUrl = (url: string): { isValid: boolean; playlistId?: string; error?: string } => {
  console.log("PLaylist ID that the user submitted: ", url)
  if (!url.trim()) {
    return { isValid: false, error: "Playlist URL is required" }
  }

  // Accept full Spotify playlist URLs (with or without query params)
  const spotifyUrlRegex = /^(https?:\/\/)?(open\.)?spotify\.com\/playlist\/[a-zA-Z0-9]+(\?[^\s]*)?$/
  if (spotifyUrlRegex.test(url.trim())) {
    // Return the full URL as playlistId (backend expects this)
    return { isValid: true, playlistId: url.trim() }
  }

  // Optionally, accept just the 22-char playlist ID (legacy support)
  const playlistIdRegex = /^[a-zA-Z0-9]{22}$/
  if (playlistIdRegex.test(url.trim())) {
    // Construct a canonical Spotify playlist URL
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
        return "Do you have authorization? Please try to authenticate."
      case "NETWORK_ERROR":
        return "Network connection failed. Please check your internet connection."
      default:
        return error.message
    }
  }

  if (error instanceof Error) {
    return error.message
  }

  return "An unexpected error occurred"
}

// Enhanced API functions with better error handling
export const enhancedApi = {
  async checkDuplicates(playlistUrl: string, options?: ApiRequestOptions): Promise<ApiResponse<DuplicateCheckResult>> {
    const validation = validatePlaylistUrl(playlistUrl)
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.error,
      }
    }
    console.log("After validation function, playlistId is now: ", validation.playlistId)

    try {
      const response = await fetch(`${API_BASE_URL}/api/get_duplicate_tracks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          playlist_id: `${validation.playlistId}`,
          strict: false,
          tol_secs: 5,
        }),
      })

      if (!response.ok) {
        throw new ApiError(`HTTP ${response.status}: ${response.statusText}`, response.status)
      }

      const data = await response.json()
      return {
        success: true,
        data,
        message: "Duplicate check completed successfully",
      }
    } catch (error) {
      return {
        success: false,
        error: formatError(error),
      }
    }
  },

  async deleteDuplicates(
    playlistUrl: string,
    options?: ApiRequestOptions,
  ): Promise<ApiResponse<DuplicateDeletionResult>> {
    const validation = validatePlaylistUrl(playlistUrl)
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.error,
      }
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/delete_duplicate_tracks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          playlist_id: `${validation.playlistId}`,
        }),
      })

      if (!response.ok) {
        throw new ApiError(`HTTP ${response.status}: ${response.statusText}`, response.status)
      }

      const data = await response.json()
      return {
        success: true,
        data,
        message: "Duplicates deleted successfully",
      }
    } catch (error) {
      return {
        success: false,
        error: formatError(error),
      }
    }
  },

  async filterExplicitContent(
    playlistUrl: string,
    mode: "metadata" | "lyrics",
    customWords: string[] = [],
    options?: ApiRequestOptions,
  ): Promise<ApiResponse<ExplicitFilterResult>> {
    const validation = validatePlaylistUrl(playlistUrl)
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.error,
      }
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/explicit_report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          playlist_id: validation.playlistId,
          mode,
          extra_banned_words: customWords,
        }),
      })

      if (!response.ok) {
        throw new ApiError(`HTTP ${response.status}: ${response.statusText}`, response.status)
      }

      const data = await response.json()
      return {
        success: true,
        data,
        message: "Explicit content scan completed",
      }
    } catch (error) {
      return {
        success: false,
        error: formatError(error),
      }
    }
  },

  async removeTracks(
    playlistUrl: string,
    uris: string[],
    options?: ApiRequestOptions,
  ): Promise<ApiResponse<{ removed_count: number; removed_uris: string[] }>> {
    const validation = validatePlaylistUrl(playlistUrl)
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.error,
      }
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/remove_tracks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          playlist_id: validation.playlistId,
          uris,
        }),
      })

      if (!response.ok) {
        throw new ApiError(`HTTP ${response.status}: ${response.statusText}`, response.status)
      }

      const data = await response.json()
      return {
        success: true,
        data,
        message: "Tracks removed successfully",
      }
    } catch (error) {
      return {
        success: false,
        error: formatError(error),
      }
    }
  },

  async createCleanPlaylist(
    playlistUrl: string,
    explicitRows: ExplicitTrack[],
    options?: ApiRequestOptions,
  ): Promise<ApiResponse<any>> {
    const validation = validatePlaylistUrl(playlistUrl)
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.error,
      }
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/create_clean_playlist`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          playlist_id: validation.playlistId,
          rows: explicitRows,
        }),
      })

      if (!response.ok) {
        throw new ApiError(`HTTP ${response.status}: ${response.statusText}`, response.status)
      }

      const data = await response.json()
      return {
        success: true,
        data,
        message: "Clean playlist created successfully",
      }
    } catch (error) {
      return {
        success: false,
        error: formatError(error),
      }
    }
  },

  async getTopItems(
    kind: "tracks" | "artists",
    timeRange: "4_weeks" | "6_months" | "all_time",
    options?: ApiRequestOptions,
  ): Promise<ApiResponse<TopItemsResult>> {
    try {
      const backendTimeRange =
        timeRange === "4_weeks" ? "short_term" : timeRange === "6_months" ? "medium_term" : "long_term"

      const response = await fetch(
        `${API_BASE_URL}/api/top_items?kind=${kind}&time_range=${backendTimeRange}&limit=5`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        },
      )

      if (!response.ok) {
        throw new ApiError(`HTTP ${response.status}: ${response.statusText}`, response.status)
      }

      const data = await response.json()
      return {
        success: true,
        data,
        message: `Top ${kind} retrieved successfully`,
      }
    } catch (error) {
      return {
        success: false,
        error: formatError(error),
      }
    }
  },

  async getTopTracks(
    timeRange: "4_weeks" | "6_months" | "all_time",
    options?: ApiRequestOptions,
  ): Promise<ApiResponse<TopItemsResult>> {
    return this.getTopItems("tracks", timeRange, options)
  },

  async getTopArtists(
    timeRange: "4_weeks" | "6_months" | "all_time",
    options?: ApiRequestOptions,
  ): Promise<ApiResponse<TopItemsResult>> {
    return this.getTopItems("artists", timeRange, options)
  },
}

export const createApiWithUser = (userId: string) => ({
  async checkDuplicates(playlistUrl: string, options?: ApiRequestOptions): Promise<ApiResponse<DuplicateCheckResult>> {
    const validation = validatePlaylistUrl(playlistUrl)
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.error,
      }
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/duplicates`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user: userId,
          playlist_id: `${validation.playlistId}`,
          strict: false,
          tol_secs: 2,
        }),
      })

      if (!response.ok) {
        throw new ApiError(`HTTP ${response.status}: ${response.statusText}`, response.status)
      }

      const data = await response.json()
      return {
        success: true,
        data,
        message: "Duplicate check completed successfully",
      }
    } catch (error) {
      return {
        success: false,
        error: formatError(error),
      }
    }
  },
  async deleteDuplicates(
    playlistUrl: string,
    options?: ApiRequestOptions,
  ): Promise<ApiResponse<DuplicateDeletionResult>> {
    const validation = validatePlaylistUrl(playlistUrl)
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.error,
      }
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/duplicates/delete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user: userId,
          playlist_id: `${validation.playlistId}`,
        }),
      })

      if (!response.ok) {
        throw new ApiError(`HTTP ${response.status}: ${response.statusText}`, response.status)
      }

      const data = await response.json()
      return {
        success: true,
        data,
        message: "Duplicates deleted successfully",
      }
    } catch (error) {
      return {
        success: false,
        error: formatError(error),
      }
    }
  },

  async filterExplicitContent(
    playlistUrl: string,
    mode: "metadata" | "lyrics",
    customWords: string[] = [], // Added customWords parameter
    options?: ApiRequestOptions,
  ): Promise<ApiResponse<ExplicitFilterResult>> {
    const validation = validatePlaylistUrl(playlistUrl)
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.error,
      }
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/explicit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user: userId,
          playlist_id: validation.playlistId,
          mode,
          extra_banned_words: customWords, // Pass custom words to backend
        }),
      })

      if (!response.ok) {
        throw new ApiError(`HTTP ${response.status}: ${response.statusText}`, response.status)
      }

      const data = await response.json()
      return {
        success: true,
        data,
        message: "Explicit content scan completed",
      }
    } catch (error) {
      return {
        success: false,
        error: formatError(error),
      }
    }
  },

  async createCleanPlaylist(
    playlistUrl: string,
    explicitRows: ExplicitTrack[],
    options?: ApiRequestOptions,
  ): Promise<ApiResponse<any>> {
    const validation = validatePlaylistUrl(playlistUrl)
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.error,
      }
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/explicit/create-clean`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user: userId,
          playlist_id: validation.playlistId,
          rows: explicitRows,
        }),
      })

      if (!response.ok) {
        throw new ApiError(`HTTP ${response.status}: ${response.statusText}`, response.status)
      }

      const data = await response.json()
      return {
        success: true,
        data,
        message: "Clean playlist created successfully",
      }
    } catch (error) {
      return {
        success: false,
        error: formatError(error),
      }
    }
  },

  async getTopItems(
    kind: "tracks" | "artists",
    timeRange: "4_weeks" | "6_months" | "all_time",
    options?: ApiRequestOptions,
  ): Promise<ApiResponse<TopItemsResult>> {
    try {
      const backendTimeRange =
        timeRange === "4_weeks" ? "short_term" : timeRange === "6_months" ? "medium_term" : "long_term"

      const response = await fetch(
        `${API_BASE_URL}/api/tops?user=${userId}&kind=${kind}&time_range=${backendTimeRange}&limit=5`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        },
      )

      if (!response.ok) {
        throw new ApiError(`HTTP ${response.status}: ${response.statusText}`, response.status)
      }

      const data = await response.json()
      return {
        success: true,
        data,
        message: `Top ${kind} retrieved successfully`,
      }
    } catch (error) {
      return {
        success: false,
        error: formatError(error),
      }
    }
  },

  async getTopTracks(
    timeRange: "4_weeks" | "6_months" | "all_time",
    options?: ApiRequestOptions,
  ): Promise<ApiResponse<TopItemsResult>> {
    return this.getTopItems("tracks", timeRange, options)
  },

  async getTopArtists(
    timeRange: "4_weeks" | "6_months" | "all_time",
    options?: ApiRequestOptions,
  ): Promise<ApiResponse<TopItemsResult>> {
    return this.getTopItems("artists", timeRange, options)
  },
})

// Export utilities for testing and development
export const apiUtils = {
  validatePlaylistUrl,
  formatError,
  ApiError,
  apiClient,
}

export const api = enhancedApi
