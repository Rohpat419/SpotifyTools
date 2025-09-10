"use client"

import { useState, useCallback } from "react"
import { formatError } from "@/lib/api"

interface UseApiState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

interface UseApiReturn<T> extends UseApiState<T> {
  execute: (...args: any[]) => Promise<void>
  reset: () => void
}

export function useApi<T>(
  apiFunction: (...args: any[]) => Promise<{ success: boolean; data?: T; error?: string }>,
): UseApiReturn<T> {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  })

  const execute = useCallback(
    async (...args: any[]) => {
      setState((prev) => ({ ...prev, loading: true, error: null }))

      try {
        const response = await apiFunction(...args)

        if (response.success && response.data) {
          setState({
            data: response.data,
            loading: false,
            error: null,
          })
        } else {
          setState({
            data: null,
            loading: false,
            error: response.error || "An unexpected error occurred",
          })
        }
      } catch (error) {
        setState({
          data: null,
          loading: false,
          error: formatError(error),
        })
      }
    },
    [apiFunction],
  )

  const reset = useCallback(() => {
    setState({
      data: null,
      loading: false,
      error: null,
    })
  }, [])

  return {
    ...state,
    execute,
    reset,
  }
}

// Specialized hooks for common operations
export function usePlaylistValidation() {
  const [validation, setValidation] = useState<{
    isValid: boolean
    playlistId?: string
    error?: string
  } | null>(null)

  const validate = useCallback((url: string) => {
    const { validatePlaylistUrl } = require("@/lib/api")
    const result = validatePlaylistUrl(url)
    setValidation(result)
    return result
  }, [])

  const reset = useCallback(() => {
    setValidation(null)
  }, [])

  return {
    validation,
    validate,
    reset,
  }
}
