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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  CheckCircle,
  Loader2,
  AlertCircle,
  Music,
  Trash2,
  AlertTriangle,
  RotateCcw,
} from "lucide-react"
import { api, type DuplicateCheckResult, type DuplicateDeletionResult } from "@/lib/api"
import { SpotifyAuth } from "@/components/spotify-auth"

type Stage = "input" | "results" | "deleted"

export default function DuplicatesPage() {
  const [selected, setSelected] = useState<number[]>([])
  const [playlistUrl, setPlaylistUrl] = useState("")

  // Scan state
  const [isScanning, setIsScanning] = useState(false)
  const [scanResult, setScanResult] = useState<DuplicateCheckResult | null>(null)

  // Delete state
  const [isDeleting, setIsDeleting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [deleteResult, setDeleteResult] = useState<DuplicateDeletionResult | null>(null)

  const [error, setError] = useState<string | null>(null)
  const [stage, setStage] = useState<Stage>("input")

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!playlistUrl.trim()) return

    setIsScanning(true)
    setError(null)
    setScanResult(null)
    setDeleteResult(null)

    try {
      const response = await api.checkDuplicates(playlistUrl)
      if (response.success && response.data) {
        setScanResult(response.data)
        setSelected(response.data.groups.flatMap(g => g.tracks.slice(1).map(t => t.playlist_idx)).slice(0, 100))
        setStage("results")
      } else {
        setError(response.error || "Failed to check duplicates")
      }
    } catch {
      setError("An unexpected error occurred")
    } finally {
      setIsScanning(false)
    }
  }

  const handleDelete = async () => {
    setShowConfirm(false)
    setIsDeleting(true)
    setError(null)

    try {
      const response = await api.deleteDuplicates(playlistUrl, selected, scanResult!.snapshot_id)
      if (response.success && response.data) {
        setDeleteResult(response.data)
        setStage("deleted")
      } else {
        setError(response.error || "Failed to delete duplicates")
        setStage("input")
        setScanResult(null)
      }
    } catch {
      setError("An unexpected error occurred")
    } finally {
      setIsDeleting(false)
    }
  }

  const startOver = () => {
    setPlaylistUrl("")
    setScanResult(null)
    setDeleteResult(null)
    setError(null)
    setStage("input")
  }

  const hasDuplicates = scanResult && scanResult.count > 0

  return (
    <PageLayout
      title="Duplicate Manager"
      description="Scan your Spotify playlists for duplicates and choose which copies to remove."
    >
      <div className="max-w-4xl mx-auto space-y-8">
        <SpotifyAuth
          requiredFor={[
            "Accessing private playlists",
            "Scanning for duplicate tracks",
            "Removing duplicate tracks",
          ]}
        />

        {/* Input Form — always visible so the user can re-scan or change URL */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              Scan for Duplicates
            </CardTitle>
            <CardDescription>
              Enter a Spotify playlist URL or ID to find and optionally remove duplicate tracks.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleScan} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="playlist-url">Playlist URL or ID</Label>
                <Input
                  id="playlist-url"
                  type="text"
                  placeholder="https://open.spotify.com/playlist/... or playlist ID"
                  value={playlistUrl}
                  onChange={(e) => { setPlaylistUrl(e.target.value); setScanResult(null); setStage("input"); setSelected([]) }}
                  disabled={isScanning || isDeleting}
                  className="w-full"
                  aria-describedby="playlist-url-help"
                />
                <p id="playlist-url-help" className="text-sm text-muted-foreground">
                  Paste the full Spotify playlist URL or just the playlist ID
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={!playlistUrl.trim() || isScanning || isDeleting}
                  className="w-full sm:w-auto"
                >
                  {isScanning ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Scanning...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      {stage === "input" ? "Scan for Duplicates" : "Re-Scan"}
                    </>
                  )}
                </Button>
                {stage !== "input" && (
                  <Button type="button" variant="outline" onClick={startOver} disabled={isScanning || isDeleting}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Start Over
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Error */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* ── STAGE: Results ────────────────────────────────────────────── */}
        {stage === "results" && scanResult && (
          <div className="space-y-6">
            {/* Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Scan Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center p-4 bg-muted/50 rounded-lg max-w-xs mx-auto">
                  <div className="text-3xl font-bold text-destructive">{scanResult.count}</div>
                  <div className="text-sm text-muted-foreground">
                    Duplicate Group{scanResult.count !== 1 ? "s" : ""} Found
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Duplicate Groups */}
            {hasDuplicates ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Duplicate Groups</CardTitle>
                    <CardDescription>
                      These tracks appear more than once in your playlist.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {scanResult.groups.map((group, index) => (
                        <fieldset key={index} className="border border-border rounded-lg p-4 space-y-3">
                          <legend className="px-2 font-semibold">{group.key[0]} · {group.key[1].join(", ")}</legend>
                          {group.tracks.map(track => (
                            <label key={track.playlist_idx} className="flex gap-3 items-center p-2 rounded hover:bg-muted/50">
                              <input type="checkbox" aria-label={`Remove ${track.name}, position ${track.playlist_idx + 1}`}
                                checked={selected.includes(track.playlist_idx)}
                                disabled={isDeleting || (!selected.includes(track.playlist_idx) &&
                                  (selected.length >= 100 || group.tracks.filter(t => !selected.includes(t.playlist_idx)).length <= 1))}
                                onChange={e => setSelected(current => e.target.checked ? [...current, track.playlist_idx] : current.filter(p => p !== track.playlist_idx))} />
                              <span className="flex-1"><strong>{track.name}</strong><span className="block text-sm text-muted-foreground">{track.album} · Position {track.playlist_idx + 1} · Added {track.added_at?.slice(0, 10) || "unknown"}</span></span>
                              <Badge variant="secondary">{Math.floor(track.duration_ms / 60000)}:{String(Math.floor(track.duration_ms / 1000) % 60).padStart(2, "0")}</Badge>
                            </label>
                          ))}
                        </fieldset>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Delete Action */}
                <Card className="border-destructive/20">
                  <CardContent className="pt-6">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div>
                        <p className="font-medium text-foreground">Ready to clean up?</p>
                        <p className="text-sm text-muted-foreground">
                          Select up to 100 copies to remove. Leave at least one copy in each group.
                        </p>
                      </div>
                      <Button
                        variant="destructive"
                        onClick={() => setShowConfirm(true)}
                        disabled={isDeleting || selected.length === 0}
                      >
                        {isDeleting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Removing...
                          </>
                        ) : (
                          <>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remove Selected ({selected.length})
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No Duplicates Found!</h3>
                  <p className="text-muted-foreground">
                    Your playlist is clean - no duplicate tracks were detected.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ── STAGE: Deleted ────────────────────────────────────────────── */}
        {stage === "deleted" && deleteResult && (
          <div className="space-y-6">
            <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                Duplicate tracks have been removed from your playlist.
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Music className="h-5 w-5 text-primary" />
                  Cleanup Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="text-center p-6 bg-muted/50 rounded-lg">
                    <div className="text-3xl font-bold text-muted-foreground mb-1">
                      {deleteResult.original}
                    </div>
                    <div className="text-sm text-muted-foreground">Original Tracks</div>
                  </div>
                  <div className="text-center p-6 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
                    <div className="text-3xl font-bold text-red-600 dark:text-red-400 mb-1">
                      {deleteResult.removed}
                    </div>
                    <div className="text-sm text-red-700 dark:text-red-300">Tracks Removed</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Your playlist has been cleaned</p>
                    <p className="text-sm text-muted-foreground">
                      Duplicates were removed while preserving the original track order.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Music className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">Check your playlist</p>
                    <p className="text-sm text-muted-foreground">
                      Open Spotify to verify the changes.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Confirmation Dialog */}
        <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Confirm Duplicate Removal
              </AlertDialogTitle>
              <AlertDialogDescription>
                Remove {selected.length} selected copies? Unselected copies are kept in order.
                Spotify removes all copies of identical track IDs, so retained copies of those IDs
                must be reinserted and receive new added dates. If a request fails midway, changes
                may be partial; inspect Spotify and scan again. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive hover:bg-destructive/90"
              >
                Yes, Remove Duplicates
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </PageLayout>
  )
}
