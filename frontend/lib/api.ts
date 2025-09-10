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
  totalTracks: number
  duplicateGroups: DuplicateGroup[]
  duplicateCount: number
}

export interface DuplicateDeletionResult {
  originalCount: number
  keptCount: number
  removedCount: number
  playlistId: string
}

export interface ExplicitTrack {
  trackId: string
  trackName: string
  artists: string[]
  reason: string
  confidence: number
}

export interface ExplicitFilterResult {
  totalTracks: number
  explicitTracks: ExplicitTrack[]
  mode: "metadata" | "lyrics"
}

export interface TopTrack {
  trackId: string
  trackName: string
  artists: string[]
  album: string
  playCount: number
  rank: number
}

export interface TopArtist {
  artistId: string
  artistName: string
  genre: string[]
  playCount: number
  rank: number
}

// Mock API functions with realistic delays and responses
export const api = {
  async checkDuplicates(playlistUrl: string): Promise<ApiResponse<DuplicateCheckResult>> {
    await new Promise((resolve) => setTimeout(resolve, 2000)) // Simulate API delay

    // Mock response
    return {
      success: true,
      data: {
        totalTracks: 150,
        duplicateCount: 12,
        duplicateGroups: [
          {
            trackName: "Blinding Lights",
            artists: ["The Weeknd"],
            count: 3,
            trackIds: ["track1", "track2", "track3"],
          },
          {
            trackName: "Shape of You",
            artists: ["Ed Sheeran"],
            count: 2,
            trackIds: ["track4", "track5"],
          },
        ],
      },
    }
  },

  async deleteDuplicates(playlistUrl: string): Promise<ApiResponse<DuplicateDeletionResult>> {
    await new Promise((resolve) => setTimeout(resolve, 3000))

    return {
      success: true,
      data: {
        originalCount: 150,
        keptCount: 138,
        removedCount: 12,
        playlistId: "playlist123",
      },
    }
  },

  async filterExplicitContent(
    playlistUrl: string,
    mode: "metadata" | "lyrics",
  ): Promise<ApiResponse<ExplicitFilterResult>> {
    await new Promise((resolve) => setTimeout(resolve, 2500))

    return {
      success: true,
      data: {
        totalTracks: 150,
        mode,
        explicitTracks: [
          {
            trackId: "track1",
            trackName: "Example Explicit Song",
            artists: ["Artist Name"],
            reason: mode === "metadata" ? "Marked as explicit" : "Contains explicit lyrics",
            confidence: 0.95,
          },
        ],
      },
    }
  },

  async getTopTracks(timeRange: "4_weeks" | "6_months" | "all_time"): Promise<ApiResponse<TopTrack[]>> {
    await new Promise((resolve) => setTimeout(resolve, 1500))

    return {
      success: true,
      data: [
        {
          trackId: "track1",
          trackName: "Blinding Lights",
          artists: ["The Weeknd"],
          album: "After Hours",
          playCount: 45,
          rank: 1,
        },
        {
          trackId: "track2",
          trackName: "Shape of You",
          artists: ["Ed Sheeran"],
          album: "÷ (Divide)",
          playCount: 38,
          rank: 2,
        },
      ],
    }
  },

  async getTopArtists(timeRange: "4_weeks" | "6_months" | "all_time"): Promise<ApiResponse<TopArtist[]>> {
    await new Promise((resolve) => setTimeout(resolve, 1500))

    return {
      success: true,
      data: [
        {
          artistId: "artist1",
          artistName: "The Weeknd",
          genre: ["Pop", "R&B"],
          playCount: 120,
          rank: 1,
        },
        {
          artistId: "artist2",
          artistName: "Ed Sheeran",
          genre: ["Pop", "Folk"],
          playCount: 95,
          rank: 2,
        },
      ],
    }
  },
}

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

  constructor(baseUrl = "/api") {
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
  if (!url.trim()) {
    return { isValid: false, error: "Playlist URL is required" }
  }

  // Extract playlist ID from various Spotify URL formats
  const spotifyUrlRegex = /(?:https?:\/\/)?(?:open\.)?spotify\.com\/playlist\/([a-zA-Z0-9]+)/
  const match = url.match(spotifyUrlRegex)

  if (match) {
    return { isValid: true, playlistId: match[1] }
  }

  // Check if it's just a playlist ID
  const playlistIdRegex = /^[a-zA-Z0-9]{22}$/
  if (playlistIdRegex.test(url.trim())) {
    return { isValid: true, playlistId: url.trim() }
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

    try {
      // Simulate API delay for demo
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Mock response with more realistic data
      const mockData: DuplicateCheckResult = {
        totalTracks: Math.floor(Math.random() * 200) + 50,
        duplicateCount: Math.floor(Math.random() * 20),
        duplicateGroups: [
          {
            trackName: "Blinding Lights",
            artists: ["The Weeknd"],
            count: 3,
            trackIds: ["track1", "track2", "track3"],
          },
          {
            trackName: "Shape of You",
            artists: ["Ed Sheeran"],
            count: 2,
            trackIds: ["track4", "track5"],
          },
          {
            trackName: "Watermelon Sugar",
            artists: ["Harry Styles"],
            count: 2,
            trackIds: ["track6", "track7"],
          },
        ],
      }

      return {
        success: true,
        data: mockData,
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
      await new Promise((resolve) => setTimeout(resolve, 3000))

      const originalCount = Math.floor(Math.random() * 200) + 50
      const removedCount = Math.floor(Math.random() * 20) + 5
      const mockData: DuplicateDeletionResult = {
        originalCount,
        keptCount: originalCount - removedCount,
        removedCount,
        playlistId: validation.playlistId || "mock_playlist_id",
      }

      return {
        success: true,
        data: mockData,
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
      await new Promise((resolve) => setTimeout(resolve, 2500))

      const totalTracks = Math.floor(Math.random() * 150) + 50
      const explicitCount = Math.floor(Math.random() * 10) + 1

      const mockExplicitTracks: ExplicitTrack[] = [
        {
          trackId: "track1",
          trackName: "Example Explicit Song",
          artists: ["Artist Name"],
          reason:
            mode === "metadata" ? "Marked as explicit in metadata" : "Contains explicit language in lyrics analysis",
          confidence: 0.95,
        },
        {
          trackId: "track2",
          trackName: "Another Explicit Track",
          artists: ["Another Artist"],
          reason: mode === "metadata" ? "Explicit content flag detected" : "Profanity detected in lyrics analysis",
          confidence: 0.87,
        },
      ].slice(0, explicitCount)

      const mockData: ExplicitFilterResult = {
        totalTracks,
        mode,
        explicitTracks: mockExplicitTracks,
      }

      return {
        success: true,
        data: mockData,
        message: "Explicit content scan completed",
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
  ): Promise<ApiResponse<TopTrack[]>> {
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500))

      const mockTracks: TopTrack[] = [
        {
          trackId: "track1",
          trackName: "Blinding Lights",
          artists: ["The Weeknd"],
          album: "After Hours",
          playCount: Math.floor(Math.random() * 100) + 20,
          rank: 1,
        },
        {
          trackId: "track2",
          trackName: "Shape of You",
          artists: ["Ed Sheeran"],
          album: "÷ (Divide)",
          playCount: Math.floor(Math.random() * 90) + 15,
          rank: 2,
        },
        {
          trackId: "track3",
          trackName: "Watermelon Sugar",
          artists: ["Harry Styles"],
          album: "Fine Line",
          playCount: Math.floor(Math.random() * 80) + 10,
          rank: 3,
        },
        {
          trackId: "track4",
          trackName: "Levitating",
          artists: ["Dua Lipa"],
          album: "Future Nostalgia",
          playCount: Math.floor(Math.random() * 70) + 8,
          rank: 4,
        },
        {
          trackId: "track5",
          trackName: "Good 4 U",
          artists: ["Olivia Rodrigo"],
          album: "SOUR",
          playCount: Math.floor(Math.random() * 60) + 5,
          rank: 5,
        },
      ]

      return {
        success: true,
        data: mockTracks,
        message: "Top tracks retrieved successfully",
      }
    } catch (error) {
      return {
        success: false,
        error: formatError(error),
      }
    }
  },

  async getTopArtists(
    timeRange: "4_weeks" | "6_months" | "all_time",
    options?: ApiRequestOptions,
  ): Promise<ApiResponse<TopArtist[]>> {
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500))

      const mockArtists: TopArtist[] = [
        {
          artistId: "artist1",
          artistName: "The Weeknd",
          genre: ["Pop", "R&B", "Alternative"],
          playCount: Math.floor(Math.random() * 200) + 50,
          rank: 1,
        },
        {
          artistId: "artist2",
          artistName: "Ed Sheeran",
          genre: ["Pop", "Folk", "Acoustic"],
          playCount: Math.floor(Math.random() * 180) + 40,
          rank: 2,
        },
        {
          artistId: "artist3",
          artistName: "Harry Styles",
          genre: ["Pop", "Rock", "Alternative"],
          playCount: Math.floor(Math.random() * 160) + 35,
          rank: 3,
        },
        {
          artistId: "artist4",
          artistName: "Dua Lipa",
          genre: ["Pop", "Dance", "Electronic"],
          playCount: Math.floor(Math.random() * 140) + 30,
          rank: 4,
        },
        {
          artistId: "artist5",
          artistName: "Olivia Rodrigo",
          genre: ["Pop", "Alternative", "Indie"],
          playCount: Math.floor(Math.random() * 120) + 25,
          rank: 5,
        },
      ]

      return {
        success: true,
        data: mockArtists,
        message: "Top artists retrieved successfully",
      }
    } catch (error) {
      return {
        success: false,
        error: formatError(error),
      }
    }
  },
}

// Export utilities for testing and development
export const apiUtils = {
  validatePlaylistUrl,
  formatError,
  ApiError,
  apiClient,
}
