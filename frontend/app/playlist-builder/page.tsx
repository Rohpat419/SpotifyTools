"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { PageLayout } from "@/components/page-layout"
import { SpotifyAuth } from "@/components/spotify-auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  ListMusic,
  Loader2,
  AlertCircle,
  CheckCircle,
  Search,
  X,
  Plus,
  Music,
  ExternalLink,
} from "lucide-react"
import {
  api,
  type LikedSong,
  type PlaylistSummary,
  getSessionToken,
} from "@/lib/api"

type ModalMode = null | "pick-playlist" | "create-playlist" | "confirm"

export default function PlaylistBuilderPage() {
  const [isAuthed, setIsAuthed] = useState(false)

  // Song data
  const [songs, setSongs] = useState<LikedSong[]>([])
  const [total, setTotal] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)
  const [initialLoading, setInitialLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set())

  // Filters
  const [search, setSearch] = useState("")
  const [yearPublished, setYearPublished] = useState("all")
  const [yearLiked, setYearLiked] = useState("all")

  // Modal state
  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [playlists, setPlaylists] = useState<PlaylistSummary[]>([])
  const [loadingPlaylists, setLoadingPlaylists] = useState(false)
  const [chosenPlaylist, setChosenPlaylist] = useState<PlaylistSummary | null>(null)
  const [newPlaylistName, setNewPlaylistName] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [resultMessage, setResultMessage] = useState<string | null>(null)
  const [resultError, setResultError] = useState<string | null>(null)

  // ── Load liked songs ────────────────────────────────────────────────────
  const loadSongs = useCallback(async (offset: number) => {
    if (offset === 0) setInitialLoading(true)
    else setLoadingMore(true)
    setLoadError(null)

    const res = await api.getLikedSongs(offset, 50)
    if (res.success && res.data) {
      setSongs((prev) => (offset === 0 ? res.data!.items : [...prev, ...res.data!.items]))
      setTotal(res.data.total)
    } else {
      setLoadError(res.error || "Failed to load liked songs")
    }
    setInitialLoading(false)
    setLoadingMore(false)
  }, [])

  useEffect(() => {
    if (isAuthed && getSessionToken()) {
      loadSongs(0)
    }
  }, [isAuthed, loadSongs])

  // ── Derived filter data ─────────────────────────────────────────────────
  const publishYears = useMemo(() => {
    const years = new Set<string>()
    songs.forEach((s) => {
      const y = s.release_date?.slice(0, 4)
      if (y) years.add(y)
    })
    return Array.from(years).sort().reverse()
  }, [songs])

  const likedYears = useMemo(() => {
    const years = new Set<string>()
    songs.forEach((s) => {
      const y = s.added_at?.slice(0, 4)
      if (y) years.add(y)
    })
    return Array.from(years).sort().reverse()
  }, [songs])

  const filteredSongs = useMemo(() => {
    return songs.filter((s) => {
      if (search) {
        const q = search.toLowerCase()
        const matchesName = s.name.toLowerCase().includes(q)
        const matchesArtist = s.artists.some((a) => a.toLowerCase().includes(q))
        const matchesAlbum = s.album.toLowerCase().includes(q)
        if (!matchesName && !matchesArtist && !matchesAlbum) return false
      }
      if (yearPublished !== "all" && !s.release_date?.startsWith(yearPublished)) return false
      if (yearLiked !== "all" && !s.added_at?.startsWith(yearLiked)) return false
      return true
    })
  }, [songs, search, yearPublished, yearLiked])

  // ── Selection helpers ───────────────────────────────────────────────────
  const toggleSelect = (uri: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(uri)) next.delete(uri)
      else next.add(uri)
      return next
    })
  }

  const selectAllFiltered = () => {
    setSelected((prev) => {
      const next = new Set(prev)
      filteredSongs.forEach((s) => next.add(s.uri))
      return next
    })
  }

  const deselectAll = () => setSelected(new Set())

  // ── Playlist fetch ──────────────────────────────────────────────────────
  const openAddToPlaylist = async () => {
    setModalMode("pick-playlist")
    setLoadingPlaylists(true)
    const res = await api.getMyPlaylists()
    if (res.success && res.data) {
      setPlaylists(res.data.playlists)
    }
    setLoadingPlaylists(false)
  }

  // ── Submit ──────────────────────────────────────────────────────────────
  const handleConfirm = async () => {
    setIsSubmitting(true)
    setResultError(null)
    setResultMessage(null)

    const uris = Array.from(selected)

    let res
    if (chosenPlaylist) {
      res = await api.buildPlaylist("add", uris, { playlist_id: chosenPlaylist.id })
    } else {
      res = await api.buildPlaylist("create", uris, { playlist_name: newPlaylistName || "My Liked Songs Playlist" })
    }

    if (res.success && res.data) {
      const action = res.data.action === "created" ? "Created playlist" : `Added to ${chosenPlaylist?.name || "playlist"}`
      setResultMessage(`${action} with ${res.data.added_count} songs!`)
      setSelected(new Set())
    } else {
      setResultError(res.error || "Failed to build playlist")
    }
    setIsSubmitting(false)
    setModalMode(null)
  }

  const clearFilters = () => {
    setSearch("")
    setYearPublished("all")
    setYearLiked("all")
  }

  const hasFilters = search || yearPublished !== "all" || yearLiked !== "all"

  return (
    <PageLayout
      title="Playlist Builder"
      description="Build playlists from your Liked Songs with filters and search."
    >
      <div className="max-w-6xl mx-auto space-y-6">
        <SpotifyAuth
          requiredFor={["Reading your Liked Songs", "Creating playlists", "Adding songs to playlists"]}
          onAuthChange={setIsAuthed}
        />

        {/* Result banners */}
        {resultMessage && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{resultMessage}</AlertDescription>
          </Alert>
        )}
        {resultError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{resultError}</AlertDescription>
          </Alert>
        )}

        {isAuthed && (
          <>
            {/* Filter Bar */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-4 items-end">
                  <div className="flex-1 min-w-0">
                    <Label htmlFor="search" className="sr-only">Search</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="search"
                        placeholder="Search by name, artist, or album..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <div className="w-full md:w-40">
                    <Label className="text-xs text-muted-foreground mb-1 block">Year Released</Label>
                    <Select value={yearPublished} onValueChange={setYearPublished}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Years</SelectItem>
                        {publishYears.map((y) => (
                          <SelectItem key={y} value={y}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-full md:w-40">
                    <Label className="text-xs text-muted-foreground mb-1 block">Year Liked</Label>
                    <Select value={yearLiked} onValueChange={setYearLiked}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Years</SelectItem>
                        {likedYears.map((y) => (
                          <SelectItem key={y} value={y}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {hasFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="shrink-0">
                      <X className="h-4 w-4 mr-1" /> Clear
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Selection toolbar */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex gap-3 items-center">
                <span className="text-muted-foreground">
                  {filteredSongs.length} of {total} songs shown
                </span>
                <Button variant="outline" size="sm" onClick={selectAllFiltered}>
                  Select all shown
                </Button>
                {selected.size > 0 && (
                  <Button variant="ghost" size="sm" onClick={deselectAll}>
                    Deselect all
                  </Button>
                )}
              </div>
              {selected.size > 0 && (
                <Badge variant="secondary" className="text-sm px-3 py-1">
                  {selected.size} selected
                </Badge>
              )}
            </div>

            {/* Song Grid */}
            {initialLoading ? (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mr-3" />
                  <span className="text-muted-foreground">Loading your Liked Songs...</span>
                </CardContent>
              </Card>
            ) : loadError ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{loadError}</AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-1">
                {filteredSongs.map((song) => (
                  <div
                    key={song.uri}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                      selected.has(song.uri)
                        ? "border-primary/40 bg-primary/5"
                        : "border-border hover:bg-muted/50"
                    }`}
                    onClick={() => toggleSelect(song.uri)}
                  >
                    <Checkbox
                      checked={selected.has(song.uri)}
                      onCheckedChange={() => toggleSelect(song.uri)}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`Select ${song.name}`}
                    />
                    {song.album_image ? (
                      <img
                        src={song.album_image}
                        alt=""
                        className="w-10 h-10 rounded object-cover shrink-0"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded bg-muted flex items-center justify-center shrink-0">
                        <Music className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{song.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{song.artists.join(", ")}</p>
                    </div>
                    <div className="hidden sm:block text-xs text-muted-foreground truncate max-w-[140px]">
                      {song.album}
                    </div>
                    <div className="hidden md:block text-xs text-muted-foreground w-16 text-right">
                      {song.release_date?.slice(0, 4) || "—"}
                    </div>
                    <div className="hidden lg:block text-xs text-muted-foreground w-24 text-right">
                      {song.added_at ? new Date(song.added_at).toLocaleDateString() : "—"}
                    </div>
                  </div>
                ))}

                {/* Load More */}
                {songs.length < total && (
                  <div className="text-center pt-4">
                    <Button
                      variant="outline"
                      onClick={() => loadSongs(songs.length)}
                      disabled={loadingMore}
                    >
                      {loadingMore ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Loading...
                        </>
                      ) : (
                        `Load More (${songs.length} of ${total})`
                      )}
                    </Button>
                  </div>
                )}

                {filteredSongs.length === 0 && songs.length > 0 && (
                  <Card>
                    <CardContent className="text-center py-8">
                      <p className="text-muted-foreground">No songs match your filters.</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Sticky Action Bar */}
            {selected.size > 0 && (
              <div className="sticky bottom-4 z-40">
                <Card className="shadow-lg border-primary/20">
                  <CardContent className="py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <span className="font-medium text-sm">
                      {selected.size} song{selected.size !== 1 ? "s" : ""} selected
                    </span>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={openAddToPlaylist}>
                        <Plus className="h-4 w-4 mr-1" />
                        Add to Existing Playlist
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          setChosenPlaylist(null)
                          setNewPlaylistName("")
                          setModalMode("create-playlist")
                        }}
                      >
                        <ListMusic className="h-4 w-4 mr-1" />
                        Create New Playlist
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </>
        )}

        {/* ── Modals ────────────────────────────────────────────────────────── */}

        {/* Pick existing playlist */}
        <Dialog open={modalMode === "pick-playlist"} onOpenChange={(o) => !o && setModalMode(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Choose a Playlist</DialogTitle>
              <DialogDescription>Select an existing playlist to add your songs to.</DialogDescription>
            </DialogHeader>
            {loadingPlaylists ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <ScrollArea className="max-h-[300px]">
                <div className="space-y-1">
                  {playlists.map((p) => (
                    <button
                      key={p.id}
                      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 text-left transition-colors"
                      onClick={() => {
                        setChosenPlaylist(p)
                        setModalMode("confirm")
                      }}
                    >
                      {p.image ? (
                        <img src={p.image} alt="" className="w-10 h-10 rounded object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                          <Music className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.track_count} tracks</p>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}
          </DialogContent>
        </Dialog>

        {/* Create new playlist name */}
        <Dialog open={modalMode === "create-playlist"} onOpenChange={(o) => !o && setModalMode(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Playlist</DialogTitle>
              <DialogDescription>
                Name your new playlist with {selected.size} song{selected.size !== 1 ? "s" : ""}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="playlist-name">Playlist Name</Label>
              <Input
                id="playlist-name"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                placeholder="My Liked Songs Playlist"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setModalMode(null)}>Cancel</Button>
              <Button onClick={() => setModalMode("confirm")}>
                Continue
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Confirmation */}
        <Dialog open={modalMode === "confirm"} onOpenChange={(o) => !o && setModalMode(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Confirm</DialogTitle>
              <DialogDescription>
                {chosenPlaylist
                  ? `Adding ${selected.size} songs to "${chosenPlaylist.name}"`
                  : `Creating "${newPlaylistName || "My Liked Songs Playlist"}" with ${selected.size} songs`}
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[200px] border rounded-lg p-2">
              {songs
                .filter((s) => selected.has(s.uri))
                .map((s) => (
                  <div key={s.uri} className="flex items-center gap-2 py-1 px-1 text-sm">
                    <Music className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="truncate">{s.name}</span>
                    <span className="text-muted-foreground truncate">— {s.artists.join(", ")}</span>
                  </div>
                ))}
            </ScrollArea>
            <DialogFooter>
              <Button variant="outline" onClick={() => setModalMode(null)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button onClick={handleConfirm} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Working...
                  </>
                ) : (
                  "Confirm"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageLayout>
  )
}
