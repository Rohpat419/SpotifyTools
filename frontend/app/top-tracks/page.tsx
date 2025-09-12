"use client"

import { useState, useEffect } from "react"
import { PageLayout } from "@/components/page-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { BarChart3, Loader2, AlertCircle, Music, Users, Calendar, Trophy, Play } from "lucide-react"
import { api, type TopTrackResponse, type TopArtistResponse } from "@/lib/api"
import { SpotifyAuth } from "@/components/spotify-auth"

type TimeRange = "4_weeks" | "6_months" | "all_time"
type ContentType = "tracks" | "artists"

export default function TopTracksPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>("4_weeks")
  const [contentType, setContentType] = useState<ContentType>("tracks")
  const [isLoading, setIsLoading] = useState(false)
  const [tracks, setTracks] = useState<TopTrackResponse | null>(null)
  const [artists, setArtists] = useState<TopArtistResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const timeRangeLabels = {
    "4_weeks": "Last 4 Weeks",
    "6_months": "Last 6 Months",
    all_time: "All Time",
  }

  const loadData = async () => {
    setIsLoading(true)
    setError(null)

    try {
      if (contentType === "tracks") {
        const response = await api.getTopTracks(timeRange)
        if (response.success && response.data) {
          setTracks(response.data)
          setArtists(null)
        } else {
          setError(response.error || "Failed to load top tracks")
        }
      } else {
        const response = await api.getTopArtists(timeRange)
        if (response.success && response.data) {
          setArtists(response.data)
          setTracks(null)
        } else {
          setError(response.error || "Failed to load top artists")
        }
      }
    } catch (err) {
      setError("An unexpected error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [timeRange, contentType])

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "text-yellow-600 dark:text-yellow-400"
      case 2:
        return "text-gray-500 dark:text-gray-400"
      case 3:
        return "text-amber-600 dark:text-amber-400"
      default:
        return "text-muted-foreground"
    }
  }

  const getRankIcon = (rank: number) => {
    if (rank <= 3) {
      return <Trophy className={`h-5 w-5 ${getRankColor(rank)}`} />
    }
    return (
      <div className="h-5 w-5 flex items-center justify-center text-sm font-bold text-muted-foreground">{rank}</div>
    )
  }

  return (
    <PageLayout
      title="Top Tracks & Artists"
      description="Discover your listening patterns with detailed analytics across different time periods."
    >
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Spotify Authentication Component */}
        <SpotifyAuth
          requiredFor={[
            "Accessing your personal listening history",
            "Retrieving top tracks and artists data",
            "Analyzing your music preferences across time periods",
          ]}
        />

        {/* Controls */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Listening Analytics
            </CardTitle>
            <CardDescription>View your top tracks and artists across different time periods</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Content Type Selection */}
              <div className="space-y-3">
                <Label>Content Type</Label>
                <RadioGroup
                  value={contentType}
                  onValueChange={(value) => setContentType(value as ContentType)}
                  disabled={isLoading}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="tracks" id="tracks" />
                    <Label htmlFor="tracks" className="flex items-center gap-2 cursor-pointer">
                      <Music className="h-4 w-4 text-primary" />
                      Top Tracks
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="artists" id="artists" />
                    <Label htmlFor="artists" className="flex items-center gap-2 cursor-pointer">
                      <Users className="h-4 w-4 text-primary" />
                      Top Artists
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Time Range Selection */}
              <div className="space-y-3">
                <Label>Time Period</Label>
                <RadioGroup
                  value={timeRange}
                  onValueChange={(value) => setTimeRange(value as TimeRange)}
                  disabled={isLoading}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="4_weeks" id="4_weeks" />
                    <Label htmlFor="4_weeks" className="flex items-center gap-2 cursor-pointer">
                      <Calendar className="h-4 w-4 text-primary" />
                      Last 4 Weeks
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="6_months" id="6_months" />
                    <Label htmlFor="6_months" className="flex items-center gap-2 cursor-pointer">
                      <Calendar className="h-4 w-4 text-primary" />
                      Last 6 Months
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="all_time" id="all_time" />
                    <Label htmlFor="all_time" className="flex items-center gap-2 cursor-pointer">
                      <Calendar className="h-4 w-4 text-primary" />
                      All Time
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing top {contentType} for {timeRangeLabels[timeRange].toLowerCase()}
              </div>
              <Button onClick={loadData} disabled={isLoading} variant="outline" size="sm">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <BarChart3 className="mr-2 h-4 w-4" />
                    Refresh
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {isLoading && (
          <Card>
            <CardContent className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">Loading your {contentType}...</p>
            </CardContent>
          </Card>
        )}

        {/* Top Tracks Results */}
        {tracks && !isLoading && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Music className="h-5 w-5 text-primary" />
                Your Top Tracks
              </CardTitle>
              <CardDescription>{timeRangeLabels[timeRange]} • Top tracks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tracks.items.map((track, index) => (
                  <div key={track.uri || index} className="flex items-center gap-4 p-4 rounded-lg border border-border">
                    <div className="flex-shrink-0">{getRankIcon(index + 1)}</div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-foreground truncate">{track.name}</h3>
                        {index < 3 && (
                          <Badge variant="secondary" className="text-xs">
                            #{index + 1}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <Users className="h-3 w-3" />
                        <span className="truncate">
                          {track.artists
                            ?.map((artist) => (typeof artist === "string" ? artist : artist.name))
                            .join(", ") || "Unknown Artist"}
                        </span>
                      </div>
                    </div>

                    <div className="flex-shrink-0 text-right">
                      <div className="flex items-center gap-1 text-sm font-medium text-primary mb-1">
                        <Play className="h-3 w-3" />
                        {track.playCount}
                      </div>
                      <div className="text-xs text-muted-foreground">plays</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top Artists Results */}
        {artists && !isLoading && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Your Top Artists
              </CardTitle>
              <CardDescription>{timeRangeLabels[timeRange]} • Top artists</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {artists.items.map((artist, index) => (
                  <div
                    key={artist.uri || index}
                    className="flex items-center gap-4 p-4 rounded-lg border border-border"
                  >
                    <div className="flex-shrink-0">{getRankIcon(index + 1)}</div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-foreground truncate">{artist.name}</h3>
                        {index < 3 && (
                          <Badge variant="secondary" className="text-xs">
                            #{index + 1}
                          </Badge>
                        )}
                      </div>
                      {artist.genres && artist.genres.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {artist.genres.slice(0, 3).map((genre, genreIndex) => (
                            <Badge key={genreIndex} variant="outline" className="text-xs">
                              {genre}
                            </Badge>
                          ))}
                          {artist.genres.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{artist.genres.length - 3} more
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {((tracks && tracks.items.length === 0) || (artists && artists.items.length === 0)) && !isLoading && (
          <Card>
            <CardContent className="text-center py-12">
              <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Data Available</h3>
              <p className="text-muted-foreground">
                No {contentType} found for the selected time period. Try a different time range.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </PageLayout>
  )
}
