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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import { Filter, Loader2, AlertCircle, CheckCircle, Music, Users, Shield, Plus, Trash2, Info } from "lucide-react"
import { api, type ExplicitFilterResult } from "@/lib/api"
import { SpotifyAuth } from "@/components/spotify-auth"

type FilterMode = "metadata" | "lyrics"
type ActionType = "none" | "create_clean" | "remove_explicit"

export default function ExplicitFilterPage() {
  const [playlistUrl, setPlaylistUrl] = useState("")
  const [mode, setMode] = useState<FilterMode>("metadata")
  const [isScanning, setIsScanning] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<ExplicitFilterResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedAction, setSelectedAction] = useState<ActionType>("none")
  const [actionResult, setActionResult] = useState<string | null>(null)

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!playlistUrl.trim()) return

    setIsScanning(true)
    setError(null)
    setResult(null)
    setActionResult(null)

    try {
      const response = await api.filterExplicitContent(playlistUrl, mode)
      if (response.success && response.data) {
        setResult(response.data)
      } else {
        setError(response.error || "Failed to scan for explicit content")
      }
    } catch (err) {
      setError("An unexpected error occurred")
    } finally {
      setIsScanning(false)
    }
  }

  const handleAction = async () => {
    if (!result || selectedAction === "none") return

    setIsProcessing(true)
    setActionResult(null)

    try {
      // Simulate API call for the selected action
      await new Promise((resolve) => setTimeout(resolve, 2000))

      switch (selectedAction) {
        case "create_clean":
          setActionResult("New clean playlist created successfully! Check your Spotify library for the new playlist.")
          break
        case "remove_explicit":
          setActionResult(`${result.rows.length} explicit tracks have been removed from your original playlist.`)
          break
      }
    } catch (err) {
      setError("Failed to perform the selected action")
    } finally {
      setIsProcessing(false)
    }
  }

  const resetForm = () => {
    setPlaylistUrl("")
    setMode("metadata")
    setResult(null)
    setError(null)
    setSelectedAction("none")
    setActionResult(null)
  }

  return (
    <PageLayout
      title="Explicit Content Filter"
      description="Scan and filter explicit content using metadata or lyrics analysis with flexible action options."
    >
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Spotify Authentication Component */}
        <SpotifyAuth
          requiredFor={[
            "Accessing private playlists",
            "Creating new playlists (for clean playlist option)",
            "Modifying playlist contents (for removal option)",
          ]}
        />

        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-primary" />
              Scan for Explicit Content
            </CardTitle>
            <CardDescription>
              Choose your scanning method and enter a playlist URL to identify explicit content
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleScan} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="playlist-url">Playlist URL or ID</Label>
                <Input
                  id="playlist-url"
                  type="text"
                  placeholder="https://open.spotify.com/playlist/... or playlist ID"
                  value={playlistUrl}
                  onChange={(e) => setPlaylistUrl(e.target.value)}
                  disabled={isScanning}
                  className="w-full"
                  aria-describedby="playlist-url-help"
                />
                <p id="playlist-url-help" className="text-sm text-muted-foreground">
                  Paste the full Spotify playlist URL or just the playlist ID
                </p>
              </div>

              <div className="space-y-3">
                <Label>Scanning Mode</Label>
                <RadioGroup value={mode} onValueChange={(value) => setMode(value as FilterMode)} disabled={isScanning}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="metadata" id="metadata" />
                    <Label htmlFor="metadata" className="flex-1 cursor-pointer">
                      <div className="flex items-start gap-3">
                        <Shield className="h-4 w-4 text-primary mt-1" />
                        <div>
                          <div className="font-medium">Metadata Scanning</div>
                          <div className="text-sm text-muted-foreground">
                            Uses Spotify's explicit content flags (faster, less accurate)
                          </div>
                        </div>
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="lyrics" id="lyrics" />
                    <Label htmlFor="lyrics" className="flex-1 cursor-pointer">
                      <div className="flex items-start gap-3">
                        <Music className="h-4 w-4 text-primary mt-1" />
                        <div>
                          <div className="font-medium">Lyrics Analysis</div>
                          <div className="text-sm text-muted-foreground">
                            Analyzes actual lyrics content (slower, more accurate)
                          </div>
                        </div>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button type="submit" disabled={!playlistUrl.trim() || isScanning}>
                  {isScanning ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Scanning Content...
                    </>
                  ) : (
                    <>
                      <Filter className="mr-2 h-4 w-4" />
                      Run Scan
                    </>
                  )}
                </Button>
                {(result || error) && (
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Start Over
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Results Display */}
        {result && (
          <div className="space-y-6">
            {/* Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Scan Results</CardTitle>
                <CardDescription>
                  Scanned using {mode === "metadata" ? "metadata analysis" : "lyrics analysis"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-foreground">-</div>
                    <div className="text-sm text-muted-foreground">Total Tracks</div>
                  </div>
                  <div className="text-center p-4 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">{result.rows.length}</div>
                    <div className="text-sm text-red-700 dark:text-red-300">Explicit Tracks</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">-</div>
                    <div className="text-sm text-green-700 dark:text-green-300">Clean Tracks</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Explicit Tracks List */}
            {result.rows.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>Flagged Tracks</CardTitle>
                  <CardDescription>Tracks identified as containing explicit content</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {result.rows.map((track, index) => (
                      <div key={index} className="border border-border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Music className="h-4 w-4 text-muted-foreground" />
                              <h3 className="font-semibold text-foreground">{track.name}</h3>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                              <Users className="h-3 w-3" />
                              <span>{track.artists.join(", ")}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Info className="h-3 w-3 text-orange-500" />
                              <span className="text-orange-700 dark:text-orange-300">{track.reason}</span>
                            </div>
                          </div>
                          <div className="ml-4 text-right">
                            <Badge variant="destructive" className="mb-2">
                              Explicit
                            </Badge>
                          </div>
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
                  <h3 className="text-lg font-semibold text-foreground mb-2">No Explicit Content Found!</h3>
                  <p className="text-muted-foreground">Your playlist is clean - no explicit tracks were detected.</p>
                </CardContent>
              </Card>
            )}

            {/* Action Options */}
            {result.rows.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Choose Action</CardTitle>
                  <CardDescription>Select what you'd like to do with the explicit content</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <RadioGroup
                    value={selectedAction}
                    onValueChange={(value) => setSelectedAction(value as ActionType)}
                    disabled={isProcessing}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="none" id="none" />
                      <Label htmlFor="none" className="flex-1 cursor-pointer">
                        <div className="flex items-start gap-3">
                          <Info className="h-4 w-4 text-muted-foreground mt-1" />
                          <div>
                            <div className="font-medium">Do Nothing</div>
                            <div className="text-sm text-muted-foreground">Keep the playlist as is</div>
                          </div>
                        </div>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="create_clean" id="create_clean" />
                      <Label htmlFor="create_clean" className="flex-1 cursor-pointer">
                        <div className="flex items-start gap-3">
                          <Plus className="h-4 w-4 text-green-600 mt-1" />
                          <div>
                            <div className="font-medium">Create New Clean Playlist</div>
                            <div className="text-sm text-muted-foreground">
                              Create a new playlist with only clean tracks
                            </div>
                          </div>
                        </div>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="remove_explicit" id="remove_explicit" />
                      <Label htmlFor="remove_explicit" className="flex-1 cursor-pointer">
                        <div className="flex items-start gap-3">
                          <Trash2 className="h-4 w-4 text-red-600 mt-1" />
                          <div>
                            <div className="font-medium">Remove Explicit Tracks</div>
                            <div className="text-sm text-muted-foreground">
                              Remove explicit tracks from the original playlist
                            </div>
                          </div>
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>

                  <Separator />

                  <Button
                    onClick={handleAction}
                    disabled={selectedAction === "none" || isProcessing}
                    className="w-full sm:w-auto"
                    variant={selectedAction === "remove_explicit" ? "destructive" : "default"}
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        {selectedAction === "create_clean" && <Plus className="mr-2 h-4 w-4" />}
                        {selectedAction === "remove_explicit" && <Trash2 className="mr-2 h-4 w-4" />}
                        {selectedAction === "create_clean" && "Create Clean Playlist"}
                        {selectedAction === "remove_explicit" && "Remove Explicit Tracks"}
                        {selectedAction === "none" && "Select an Action"}
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Action Result */}
            {actionResult && (
              <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  <strong>Success!</strong> {actionResult}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </div>
    </PageLayout>
  )
}
