"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, Music, AlertCircle, ExternalLink } from "lucide-react"

interface SpotifyAuthProps {
  requiredFor: string[]
  onAuthSuccess?: () => void
}

export function SpotifyAuth({ requiredFor, onAuthSuccess }: SpotifyAuthProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isChecking, setIsChecking] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    try {
      console.log("[v0] Checking auth status...")
      // For now, assume user needs to authenticate since we can't check status
      setIsAuthenticated(false)
      console.log("[v0] User needs to authenticate")
    } catch (err) {
      console.error("[v0] Auth status check failed:", err)
      setIsAuthenticated(false)
    } finally {
      setIsChecking(false)
    }
  }

  const handleLogin = () => {
    window.location.href = "https://spotify-tools-eozl.onrender.com/api/auth/login"
  }

  if (isChecking) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
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
          <span>Connected to Spotify - you can access all features!</span>
          <Button variant="outline" size="sm" onClick={checkAuthStatus}>
            Refresh Status
          </Button>
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

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

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
          You'll be redirected to Spotify to authorize this application
        </p>
      </CardContent>
    </Card>
  )
}
