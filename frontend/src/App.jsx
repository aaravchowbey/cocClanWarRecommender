/*
  File: src/App.jsx
  Purpose: Main React application component. Renders the MUI layout, input form
           for clanTag, handles fetch/parsing, sorting, loading, error, and summary.
*/
import React from 'react'
import {
  AppBar, Toolbar, Typography, Container, Box, Stack,
  TextField, Button, Alert, CircularProgress, Paper
} from '@mui/material'
import ResultsTable from './components/ResultsTable'
import { API_BASE_URL, buildApiUrl, parseApiPayload, toNumber } from './utils'

function sortRows(rows, key, dir) {
  const isAsc = dir === 'asc'
  const sorted = [...rows].sort((a, b) => {
    const va = a[key]
    const vb = b[key]
    const aNum = toNumber(va)
    const bNum = toNumber(vb)
    const bothNumeric = Number.isFinite(aNum) && Number.isFinite(bNum)
    if (bothNumeric) return isAsc ? aNum - bNum : bNum - aNum
    const sa = String(va ?? '').toLowerCase()
    const sb = String(vb ?? '').toLowerCase()
    if (sa < sb) return isAsc ? -1 : 1
    if (sa > sb) return isAsc ? 1 : -1
    return 0
  })
  return sorted
}

export default function App() {
  // Input state
  const [clanTag, setClanTag] = React.useState('')

  // Data and UI state
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState('')
  const [info, setInfo] = React.useState('')
  const [rows, setRows] = React.useState([])
  const [normalizedTag, setNormalizedTag] = React.useState('')
  const [updating, setUpdating] = React.useState(false)

  // Sorting state
  // Default to recommendations sorting
  const [orderBy, setOrderBy] = React.useState('recommendationScore')
  const [order, setOrder] = React.useState('desc') // 'asc' | 'desc'

  // Derived summary values
  const summary = React.useMemo(() => {
    const total = rows.length
    const totalAttacks = rows.reduce((acc, x) => acc + (Number.isFinite(x.cumAttacksUsed) ? x.cumAttacksUsed : 0), 0)
    const totalPossible = rows.reduce((acc, x) => acc + (Number.isFinite(x.cumAttacksPossible) ? x.cumAttacksPossible : 0), 0)
    // Average destruction per attack (0..100): sum of players' cumulative destruction / total attacks used
    const totalDestruction = rows.reduce((acc, x) => acc + (Number.isFinite(x.cumDestructionPct) ? x.cumDestructionPct : 0), 0)
    const avgDestruction = totalAttacks > 0 ? (totalDestruction / totalAttacks) : 0
    return { total, totalAttacks, totalPossible, avgDestruction: Math.round(avgDestruction) }
  }, [rows])

  // Sync query param on change
  React.useEffect(() => {
    if (!normalizedTag) return
    try {
      const params = new URLSearchParams(window.location.search)
      params.set('clanTag', normalizedTag)
      const newUrl = `${window.location.pathname}?${params.toString()}`
      window.history.replaceState({}, '', newUrl)
    } catch {}
  }, [normalizedTag])

  // Initialize from URL on first render
  React.useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const tag = params.get('clanTag')
      if (tag) {
        const decoded = decodeURIComponent(tag)
        setClanTag(decoded)
        void fetchData(decoded)
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function fetchData(inputTag) {
    const built = buildApiUrl(inputTag)
    if (!built) {
      setError('Please enter a clan tag.')
      return
    }

    setLoading(true)
    setError('')
    setRows([])

    try {
      const resp = await fetch(built.url, { method: 'GET', mode: 'cors' })
      if (!resp.ok) throw new Error(`Request failed with status ${resp.status}`)
      const json = await resp.json()
      const data = parseApiPayload(json)

      // Compute recommendation score and rank for each row
      const withScores = data.map((m) => {
        const completion = Number.isFinite(m.completionPct) ? m.completionPct : 0
        const avg = Number.isFinite(m.avgDestruction) ? m.avgDestruction : 0
        const th = Number.isFinite(m.townHall) ? m.townHall : 0
        // Weighted score to prioritize completion %, then avg destruction, then TH
        const score = completion * 1_000_000 + avg * 1_000 + th
        return { ...m, recommendationScore: score }
      })
      const ranked = [...withScores].sort((a, b) => b.recommendationScore - a.recommendationScore)
      ranked.forEach((row, idx) => { row.recommendationRank = idx + 1 })

      // Default sort by current state
      const sorted = sortRows(withScores, orderBy, order)
      setRows(sorted)
      setNormalizedTag(built.normalizedTag)
    } catch (err) {
      const hint = 'If this is a CORS error, ensure the API allows browser requests (Access-Control-Allow-Origin).'
      setError(`${err.message || String(err)}. ${hint}`)
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    void fetchData(clanTag)
  }

  async function handleUpdateLatest() {
    // Validate and normalize the tag for POST body
    const built = buildApiUrl(clanTag)
    if (!built) {
      setError('Please enter a clan tag before updating.')
      return
    }
    setError('')
    setInfo('')
    setUpdating(true)
    try {
      const resp = await fetch(API_BASE_URL, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clanTag: built.normalizedTag })
      })
      if (!resp.ok) throw new Error(`Update request failed with status ${resp.status}`)
      // Best-effort parse; some endpoints may return empty or plain text
      try { await resp.json() } catch {}
      setInfo('Update requested. Fetching latest data…')
      // After a successful update, re-fetch recommendations
      await fetchData(built.normalizedTag)
    } catch (err) {
      const hint = 'If this is a CORS error, ensure the API allows POST from the browser.'
      setError(`${err.message || String(err)}. ${hint}`)
      console.error(err)
    } finally {
      setUpdating(false)
    }
  }

  function handleRequestSort(key) {
    const isSame = orderBy === key
    const nextOrder = isSame && order === 'desc' ? 'asc' : 'desc'
    setOrderBy(key)
    setOrder(nextOrder)
    setRows((prev) => sortRows(prev, key, nextOrder))
  }

  return (
    <Box sx={{ minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* AppBar with title */}
      <AppBar position="static" color="transparent" elevation={0}
        sx={{ borderBottom: '1px solid', borderColor: 'divider', backgroundColor: 'background.paper' }}
      >
        <Toolbar>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <span role="img" aria-label="crossed-swords">⚔️</span> War Recommender
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Content */}
      <Container maxWidth="lg" sx={{ py: 3, flexGrow: 1 }}>
        {/* Tagline and form */}
        <Paper elevation={0} sx={{ p: 2, mb: 2, background: 'transparent' }}>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
            Track clan war performance and participation from clan members. Enter your clan tag to get started. Update your clan before starting a new war to develop a history.
          </Typography>

          <Box component="form" onSubmit={handleSubmit} noValidate>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }}>
              <TextField
                label="Clan Tag"
                placeholder="#2R999VL92"
                value={clanTag}
                onChange={(e) => setClanTag(e.target.value)}
                sx={{ width: { xs: '100%', sm: 260, md: 300 } }}
              />
              <Button type="submit" variant="contained" size="large" disabled={loading || updating}
                sx={{ minWidth: { xs: '100%', sm: 260 }, px: 3 }}
              >
                {loading ? 'Loading…' : 'Get Recommendations'}
              </Button>
              <Button type="button" variant="outlined" size="large" onClick={handleUpdateLatest} disabled={updating || loading}
                sx={{ minWidth: { xs: '100%', sm: 280 }, px: 3 }}
              >
                {updating ? 'Updating…' : 'Update to include latest war'}
              </Button>
            </Stack>
          </Box>
        </Paper>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        )}

        {info && (
          <Alert severity="info" sx={{ mb: 2 }}>{info}</Alert>
        )}

        {loading && (
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
            <CircularProgress size={22} />
            <Typography variant="body2">Fetching recommendations…</Typography>
          </Stack>
        )}

        {!!rows.length && (
          <Box sx={{ mb: 1.5, color: 'text.secondary' }}>
            <Typography variant="body2">
              Showing <b>{rows.length}</b> members for <b>{normalizedTag}</b> • Attacks used: <b>{summary.totalAttacks}</b> / {summary.totalPossible} • Avg destruction per attack: <b>{summary.avgDestruction}</b>%
            </Typography>
          </Box>
        )}

        {/* Results table */}
        <ResultsTable
          rows={rows}
          orderBy={orderBy}
          order={order}
          onRequestSort={handleRequestSort}
        />
      </Container>

      {/* Footer */}
      <Box component="footer" sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
      </Box>
    </Box>
  )
}
