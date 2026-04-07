"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, Music, AlertCircle, ExternalLink, LogOut } from "lucide-react"
import { api, getSessionToken, clearSessionToken, API_BASE_URL } from "@/lib/api"

interface SpotifyAuthProps {
  requiredFor: string[]
  onAuthChange?: (authenticated: boolean) => void
}

export function SpotifyAuth({ requiredFor, onAuthChange }: SpotifyAuthProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [displayName, setDisplayName] = useState("")
  const [isChecking, setIsChecking] = useState(true)

  const checkAuthStatus = async () => {
    setIsChecking(true)
    const token = getSessionToken()
    if (!token) {
      setIsAuthenticated(false)
      onAuthChange?.(false)
      setIsChecking(false)
      return
    }

    const result = await api.checkAuthStatus()
    if (result.success && result.data?.authenticated) {
      setIsAuthenticated(true)
      setDisplayName(result.data.display_name || "")
      onAuthChange?.(true)
    } else {
      clearSessionToken()
      setIsAuthenticated(false)
      onAuthChange?.(false)
    }
    setIsChecking(false)
  }

  useEffect(() => {
    checkAuthStatus()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogin = () => {
    window.location.href = `${API_BASE_URL}/api/auth/login`
  }

  const handleLogout = async () => {
    await api.logout()
    clearSessionToken()
    setIsAuthenticated(false)
    setDisplayName("")
    onAuthChange?.(false)
  }

  if (isChecking) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Checking authentication status...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isAuthenticated) {
    return (
      <Alert>
        <CheckCircle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>
            Connected to Spotify{displayName ? ` as ${displayName}` : ""} — all features available.
          </span>
          <div className="flex gap-2 ml-4">
            <Button variant="outline" size="sm" onClick={checkAuthStatus}>
              Refresh
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-3 w-3 mr-1" />
              Logout
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Card className="border-[#1DB954]/20 bg-gradient-to-r from-[#1DB954]/5 to-transparent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Music className="h-5 w-5 text-[#1DB954]" />
          Spotify Authorization Required
        </CardTitle>
        <CardDescription>
          Connect your Spotify account to access this feature. Authorization is needed for:
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="text-sm text-muted-foreground space-y-1">
          {requiredFor.map((item, index) => (
            <li key={index} className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-[#1DB954] rounded-full flex-shrink-0" />
              {item}
            </li>
          ))}
        </ul>

        <Button
          onClick={handleLogin}
          className="w-full bg-[#1DB954] hover:bg-[#1ed760] text-white font-semibold"
          size="lg"
        >
          <Music className="mr-2 h-4 w-4" />
          Connect with Spotify
          <ExternalLink className="ml-2 h-4 w-4" />
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          You&apos;ll be redirected to Spotify to authorize this application
        </p>
      </CardContent>
    </Card>
  )
}
