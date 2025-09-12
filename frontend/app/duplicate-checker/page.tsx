"use client"

import type React from "react"

import { useState } from "react"
import { PageLayout } from "@/components/page-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, Loader2, AlertCircle, Music, Users } from "lucide-react"
import { type DuplicateCheckResult, createApiWithUser } from "@/lib/api"
import { SpotifyAuth } from "@/components/spotify-auth"
import { useUserStore } from "@/lib/user-store"
import { ErrorNotification } from "@/components/error-notification" // Added error notification

export default function DuplicateCheckerPage() {
  const [playlistUrl, setPlaylistUrl] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<DuplicateCheckResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showErrorNotification, setShowErrorNotification] = useState(false) // Added error notification state
  const { userId } = useUserStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!playlistUrl.trim()) return

    if (!userId) {
      setError("Please authenticate with Spotify first")
      return
    }

    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const api = createApiWithUser(userId)
      const response = await api.checkDuplicates(playlistUrl)
      if (response.success && response.data) {
        setResult(response.data)
      } else {
        setError(response.error || "Failed to check duplicates")
        if (response.error?.includes("Do you have authorization?")) {
          setShowErrorNotification(true)
        }
      }
    } catch (err) {
      setError("An unexpected error occurred")
      setShowErrorNotification(true) // Show error notification for unexpected errors
    } finally {
      setIsLoading(false)
    }
  }

  const exportResults = (format: "csv" | "json") => {
    if (!result) return

    let content: string
    let filename: string
    let mimeType: string

    if (format === "csv") {
      const csvHeader = "Track Name,Artists,Duration (ms)\\n"
      const csvRows = result.groups.map((group) => `"${group[0]}","${group[1].join(", ")}",${group[2]}`).join("\\n")
      content = csvHeader + csvRows
      filename = "spotify-duplicates.csv"
      mimeType = "text/csv"
    } else {
      content = JSON.stringify(result, null, 2)
      filename = "spotify-duplicates.json"
      mimeType = "application/json"
    }

    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <PageLayout
      title="Duplicate Checker"
      description="Identify and analyze duplicate tracks in your Spotify playlists with detailed grouping and export options."
    >
      <div className="max-w-4xl mx-auto space-y-8">
        <SpotifyAuth requiredFor={["Accessing private playlists", "Reading playlist metadata and track information"]} />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              Check for Duplicates
            </CardTitle>
            <CardDescription>Enter a Spotify playlist URL or ID to scan for duplicate tracks</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="playlist-url">Playlist URL or ID</Label>
                <Input
                  id="playlist-url"
                  type="text"
                  placeholder="https://open.spotify.com/playlist/... or playlist ID"
                  value={playlistUrl}
                  onChange={(e) => setPlaylistUrl(e.target.value)}
                  disabled={isLoading}
                  className="w-full"
                  aria-describedby="playlist-url-help"
                />
                <p id="playlist-url-help" className="text-sm text-muted-foreground">
                  Paste the full Spotify playlist URL or just the playlist ID
                </p>
              </div>
              <Button type="submit" disabled={!playlistUrl.trim() || isLoading} className="w-full sm:w-auto">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking Duplicates...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Check Duplicates
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {result && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Duplicate Analysis Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-destructive">{result.count}</div>
                    <div className="text-sm text-muted-foreground">Duplicates Found</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {result.groups.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>Duplicate Tracks</CardTitle>
                  <CardDescription>Found {result.count} duplicate tracks in your playlist</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {result.groups.map((group, index) => (
                      <div key={index} className="border border-border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Music className="h-4 w-4 text-muted-foreground" />
                              <h3 className="font-semibold text-foreground">{group[0]}</h3>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Users className="h-3 w-3" />
                              <span>{group[1].join(", ")}</span>
                            </div>
                          </div>
                          <Badge variant="secondary" className="ml-4">
                            {Math.floor(group[2] / 1000 / 60)}:
                            {String(Math.floor((group[2] / 1000) % 60)).padStart(2, "0")}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No Duplicates Found!</h3>
                  <p className="text-muted-foreground">Your playlist is clean - no duplicate tracks were detected.</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        <ErrorNotification show={showErrorNotification} onClose={() => setShowErrorNotification(false)} />
      </div>
    </PageLayout>
  )
}
