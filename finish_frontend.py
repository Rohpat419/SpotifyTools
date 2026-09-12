from pathlib import Path
import json, re

def edit(path, fn):
    p = Path(path)
    p.write_text(fn(p.read_text(encoding='utf-8')), encoding='utf-8')

def api(s):
    start = s.index('export interface DuplicateCheckResult')
    end = s.index('export interface ExplicitTrack', start)
    s = s[:start]+'''export interface DuplicateTrack {
  name: string
  artists: string[]
  album: string
  uri: string
  duration_ms: number
  added_at: string
  playlist_idx: number
}
export interface DuplicateCheckResult {
  groups: { key: [string, string[], number]; tracks: DuplicateTrack[] }[]
  count: number
  snapshot_id: string
}
export interface DuplicateDeletionResult {
  original: number
  removed: number
  kept: number
}

''' + s[end:]
    s = s.replace('  track_name: string', '  name: string')
    start = s.index('const getApiBaseUrl =')
    end = s.index('export { API_BASE_URL }', start)
    s = s[:start]+'const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000"\n\n'+s[end:]
    s = s.replace('        `HTTP ${response.status}: ${response.statusText}`,', '        (await response.json().catch(() => ({}))).detail || `Request failed (${response.status})`,')
    s = s.replace('        `HTTP_${response.status}`,', '        undefined,')
    s = s.replace('async deleteDuplicates(playlistUrl: string)', 'async deleteDuplicates(playlistUrl: string, positions: number[], snapshotId: string)')
    s = s.replace('body: JSON.stringify({ playlist_id: v.playlistId }),', 'body: JSON.stringify({ playlist_id: v.playlistId, positions, snapshot_id: snapshotId, strict: false, tol_secs: 5 }),')
    s = s.replace('    mode: "metadata" | "lyrics",\n', '    mode: "metadata" | "lyrics",\n    extraBannedWords: string[] = [],\n')
    s = s.replace('JSON.stringify({ playlist_id: v.playlistId, mode })', 'JSON.stringify({ playlist_id: v.playlistId, mode, extra_banned_words: extraBannedWords })')
    s = s.replace('  async checkAuthStatus()', '''  async exchangeLoginCode(code: string): Promise<ApiResponse<{ session_token: string }>> {
    return apiFetch("/api/auth/exchange", { method: "POST", body: JSON.stringify({ code }) })
  },
  async checkAuthStatus()''')
    s = s.replace('    if (!response.ok) {', '    if (!response.ok) {\n      if (response.status === 401) clearSessionToken()')
    s = s.replace('  if (error instanceof Error) return error.message', '  if (error instanceof Error && error.name === "AbortError") return "The request timed out. Check your playlist before retrying a change."\n  if (error instanceof TypeError) return "Could not reach the server. Please check your connection."\n  if (error instanceof Error) return error.message')
    return s
edit('frontend/lib/api.ts', api)

def duplicates(s):
    s = s.replace('  const [playlistUrl,', '  const [selected, setSelected] = useState<number[]>([])\n  const [playlistUrl,', 1)
    s = s.replace('        setScanResult(response.data)', '        setScanResult(response.data)\n        setSelected(response.data.groups.flatMap(g => g.tracks.slice(1).map(t => t.playlist_idx)).slice(0, 100))')
    s = s.replace('api.deleteDuplicates(playlistUrl)', 'api.deleteDuplicates(playlistUrl, selected, scanResult!.snapshot_id)')
    s = s.replace('setError(response.error || "Failed to delete duplicates")', 'setError(response.error || "Failed to delete duplicates")\n        setStage("input")\n        setScanResult(null)')
    s = s.replace('onChange={(e) => setPlaylistUrl(e.target.value)}', 'onChange={(e) => { setPlaylistUrl(e.target.value); setScanResult(null); setStage("input"); setSelected([]) }}')
    s = s.replace('onClick={startOver}', 'onClick={startOver} disabled={isScanning || isDeleting}')
    s = s.replace('remove them in one step.', 'choose which copies to remove.')
    start = s.index('                      {scanResult.groups.map')
    end = s.index('\n                    </div>', start)
    s = s[:start]+'''                      {scanResult.groups.map((group, index) => (
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
                      ))}''' + s[end:]
    s = s.replace('Remove all duplicates while keeping the first occurrence of each track.', 'Select up to 100 copies to remove. Leave at least one copy in each group.')
    s = s.replace('disabled={isDeleting}', 'disabled={isDeleting || selected.length === 0}')
    s = s.replace('                            Remove Duplicates', '                            Remove Selected ({selected.length})')
    start = s.index('              <AlertDialogDescription className="space-y-2">')
    end = s.index('              </AlertDialogDescription>', start)
    s = s[:start]+'''              <AlertDialogDescription>
                Remove {selected.length} selected copies? Unselected copies are kept in order.
                Spotify removes all copies of identical track IDs, so retained copies of those IDs
                must be reinserted and receive new added dates. If a request fails midway, changes
                may be partial; inspect Spotify and scan again. This action cannot be undone.
''' + s[end:]
    s = s.replace('  Users,\n', '')
    return s
edit('frontend/app/duplicates/page.tsx', duplicates)

def explicit(s):
    s = s.replace('  const [mode,', '  const [extraWords, setExtraWords] = useState("")\n  const [mode,', 1)
    s = s.replace('api.filterExplicitContent(playlistUrl, mode)', 'api.filterExplicitContent(playlistUrl, mode, mode === "lyrics" ? [...new Set(extraWords.split(",").map(w => w.trim().toLowerCase()).filter(Boolean))] : [])')
    s = s.replace('onChange={(e) => setPlaylistUrl(e.target.value)}', 'onChange={(e) => { setPlaylistUrl(e.target.value); setResult(null); setActionResult(null) }}')
    s = s.replace('disabled={isScanning}', 'disabled={isScanning || isProcessing}')
    s = s.replace('onValueChange={(value) => setMode(value as FilterMode)}', 'onValueChange={(value) => { setMode(value as FilterMode); setResult(null); setActionResult(null) }}')
    marker = '              <div className="flex flex-col sm:flex-row gap-3">'
    s = s.replace(marker, '''              {mode === "lyrics" && <div className="space-y-2">
                <Label htmlFor="banned-words">Custom banned words (optional)</Label>
                <Input id="banned-words" value={extraWords} placeholder="word, another"
                  disabled={isScanning || isProcessing}
                  onChange={e => { setExtraWords(e.target.value); setResult(null); setActionResult(null) }}
                  aria-describedby="banned-words-help" />
                <p id="banned-words-help" className="text-sm text-muted-foreground">Comma-separated English words, up to 100. Case-insensitive whole-word matching; adds to the default list.</p>
              </div>}

''' + marker, 1)
    s = s.replace('track.track_name', 'track.name')
    s = s.replace('Your playlist is clean - no explicit tracks were detected.', 'No tracks were flagged. Missing lyrics fall back to Spotify metadata; this is not a guarantee of clean content.')
    s = s.replace('Uses Spotify\'s explicit content flags (faster, less accurate)', 'Uses Spotify metadata flags (fast)')
    s = s.replace('Analyzes actual lyrics content (slower, more accurate)', 'Checks available lyrics and Spotify metadata (slower; lyrics may be missing)')
    s = s.replace('    setMode("metadata")', '    setMode("metadata")\n    setExtraWords("")')
    s = s.replace('onClick={resetForm}', 'onClick={resetForm} disabled={isScanning || isProcessing}')
    s = s.replace('disabled={selectedAction === "none" || isProcessing}', 'disabled={selectedAction === "none" || isProcessing || Boolean(actionResult)}')
    s = re.sub(r'\s*\{/\* Don.t give a Do Nothing.*?\*/\}', '', s, flags=re.S)
    s = s.replace(', Info }', ' }')
    return s
edit('frontend/app/explicit-filter/page.tsx', explicit)

def auth(s):
    s = s.replace('useEffect, useState', 'useEffect, useState, useRef')
    s = s.replace('import { setSessionToken }', 'import { api, setSessionToken }')
    s = s.replace('  const searchParams =', '  const exchanged = useRef(false)\n  const searchParams =', 1)
    start = s.index('    const session =')
    end = s.index('\n  }, [searchParams])', start)
    s = s[:start]+'''    if (exchanged.current) return
    exchanged.current = true
    const code = new URLSearchParams(window.location.hash.slice(1)).get("code")
    const error = searchParams.get("error")
    window.history.replaceState({}, "", window.location.pathname)
    if (error || !code) {
      setAuthStatus(error === "not_approved" ? "not_approved" : "error")
      return
    }
    api.exchangeLoginCode(code).then(response => {
      if (response.success && response.data) {
        setSessionToken(response.data.session_token)
        setAuthStatus("success")
      } else setAuthStatus("error")
    })''' + s[end:]
    return s
edit('frontend/app/auth/success/page.tsx', auth)
edit('frontend/next.config.mjs', lambda s: re.sub(r'  (eslint|typescript): \{.*?\},\n', '', s, flags=re.S))
edit('frontend/app/layout.tsx', lambda s: s.replace('  generator: "v0.app",\n', ''))

# Trace relative/alias imports from Next entry points before pruning unused UI.
base = Path('frontend')
reachable = set()
def visit(p):
    if p in reachable or not p.exists(): return
    reachable.add(p)
    for imp in re.findall(r'(?:from\s+|import\s*)["\']([^"\']+)["\']', p.read_text(encoding='utf-8')):
        stem = base/imp[2:] if imp.startswith('@/') else p.parent/imp if imp.startswith('.') else None
        if stem is not None:
            for candidate in [stem, Path(str(stem)+'.tsx'), Path(str(stem)+'.ts'), stem/'index.tsx']:
                if candidate.is_file(): visit(candidate.resolve())
for folder in ['app', 'pages']:
    for p in (base/folder).rglob('*.tsx'): visit(p.resolve())
    for p in (base/folder).rglob('*.ts'): visit(p.resolve())
for folder in ['components', 'hooks', 'lib', 'styles']:
    for p in (base/folder).rglob('*'):
        if p.is_file() and p.resolve() not in reachable: p.unlink()
packages = set()
packages.update({'react', 'react-dom', 'next'})
for p in reachable:
    for imp in re.findall(r'(?:from\s+|import\s*)["\']([^"\']+)["\']', p.read_text(encoding='utf-8')):
        if imp.startswith(('.', '@/')): continue
        packages.add('/'.join(imp.split('/')[:2]) if imp.startswith('@') else imp.split('/')[0])
p = base/'package.json'
data = json.loads(p.read_text())
data['name'] = 'spotify-tools'
data['scripts']['lint'] = 'eslint . --max-warnings=0'
data['scripts']['typecheck'] = 'tsc --noEmit'
data['dependencies'] = {k:v for k,v in data['dependencies'].items() if k in packages}
versions = {'next':'15.5.24', '@vercel/analytics':'^1.5.0', 'geist':'^1.4.2', '@radix-ui/react-alert-dialog':'^1.1.15', '@radix-ui/react-radio-group':'^1.3.8', '@radix-ui/react-separator':'^1.1.7'}
data['dependencies'].update({k:v for k,v in versions.items() if k in data['dependencies']})
data['devDependencies'].update({'eslint':'^8.57.1', 'eslint-config-next':'15.5.24', '@playwright/test':'^1.55.0'})
p.write_text(json.dumps(data, indent=2)+'\n')
