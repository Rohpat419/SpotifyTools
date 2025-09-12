"use client"

import type React from "react"

import { useState } from "react"
import { PageLayout } from "@/components/page-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Trash2, Loader2, AlertCircle, CheckCircle, Music, AlertTriangle } from "lucide-react"
import { api, type DuplicateDeletionResult } from "@/lib/api"
import { SpotifyAuth } from "@/components/spotify-auth"

export default function DuplicateDeletionPage() {
  const [playlistUrl, setPlaylistUrl] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [result, setResult] = useState<DuplicateDeletionResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!playlistUrl.trim()) return

    setShowConfirmDialog(true)
  }

  const handleConfirmDeletion = async () => {
    setShowConfirmDialog(false)
    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await api.deleteDuplicates(playlistUrl)
      if (response.success && response.data) {
        setResult(response.data)
      } else {
        setError(response.error || "Failed to delete duplicates")
      }
    } catch (err) {
      setError("An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setPlaylistUrl("")
    setResult(null)
    setError(null)
  }

  return (
    <PageLayout
      title="Duplicate Deletion"
      description="Remove duplicate tracks from your Spotify playlists."
    >
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Spotify Authentication Component */}
        <SpotifyAuth
          requiredFor={[
            "Accessing private playlists",
            "Modifying playlist contents",
            "PERMANENTLY deleting duplicate tracks",
          ]}
        />

        {/* Warning Notice */}
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Important:</strong> This action will permanently remove duplicate tracks from your playlist. Make
            sure you have a backup if needed.
          </AlertDescription>
        </Alert>

        {/* Input Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Delete Duplicates
            </CardTitle>
            <CardDescription>Enter a Spotify playlist URL or ID to remove duplicate tracks</CardDescription>
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
              <div className="flex flex-col sm:flex-row gap-3">
                <Button type="submit" disabled={!playlistUrl.trim() || isLoading} variant="destructive">
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting Duplicates...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Duplicates
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

        {/* Confirmation Dialog */}
        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Confirm Duplicate Deletion
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-2">
                <p>Are you sure you want to delete duplicate tracks from this playlist?</p>
                <p className="text-sm text-muted-foreground">
                  <strong>This action cannot be undone.</strong> Duplicate tracks will be permanently removed from your
                  playlist.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDeletion} className="bg-destructive hover:bg-destructive/90">
                Yes, Delete Duplicates
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Success Results */}
        {result && (
          <div className="space-y-6">
            {/* Success Message */}
            <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                <strong>Success!</strong> Duplicate tracks have been removed from your playlist.
              </AlertDescription>
            </Alert>

            {/* Deletion Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Music className="h-5 w-5 text-primary" />
                  Deletion Summary
                </CardTitle>
                <CardDescription>Overview of the duplicate removal process</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="text-center p-6 bg-muted/50 rounded-lg">
                    <div className="text-3xl font-bold text-muted-foreground mb-2">{result.original}</div>
                    <div className="text-sm text-muted-foreground">Original Tracks</div>
                  </div>
                  {/* Tracks kept is a confusing metric */}
                  {/* <div className="text-center p-6 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">{result.kept}</div>
                    <div className="text-sm text-green-700 dark:text-green-300">Tracks Kept</div>
                  </div> */}
                  <div className="text-center p-6 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
                    <div className="text-3xl font-bold text-red-600 dark:text-red-400 mb-2">{result.removed}</div>
                    <div className="text-sm text-red-700 dark:text-red-300">Tracks Removed</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Next Steps */}
            <Card>
              <CardHeader>
                <CardTitle>What's Next?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-foreground">Your playlist has been cleaned</p>
                    <p className="text-sm text-muted-foreground">
                      All duplicate tracks have been removed while preserving the original track order.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Music className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-foreground">Check your playlist</p>
                    <p className="text-sm text-muted-foreground">
                      Open Spotify to verify the changes and enjoy your clean, duplicate-free playlist.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </PageLayout>
  )
}
