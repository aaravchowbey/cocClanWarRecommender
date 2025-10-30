/*
  File: src/utils.js
  Purpose: Utility helpers for API URL construction, response parsing,
           numeric coercion, date formatting, and HTML escaping (if needed).
*/

export const API_BASE_URL = 'https://13hfp225yh.execute-api.us-east-1.amazonaws.com/prod/war-recommender'

export function toNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : NaN
}

export function buildApiUrl(rawTag) {
  let tag = (rawTag || '').trim()
  if (!tag) return null
  if (!tag.startsWith('#')) tag = '#' + tag
  const encoded = encodeURIComponent(tag)
  return { url: `${API_BASE_URL}?clanTag=${encoded}`, normalizedTag: tag }
}

export function parseApiPayload(data) {
  let body = data
  if (data && typeof data === 'object' && 'body' in data) body = data.body
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { throw new Error('Failed to parse response body JSON') }
  }
  if (body && typeof body === 'object' && 'body' in body) {
    body = body.body
    if (typeof body === 'string') {
      try { body = JSON.parse(body) } catch {}
    }
  }
  if (!Array.isArray(body)) throw new Error('Unexpected response shape; expected an array')
  return body.map((o) => {
    const m = { ...o }
    m.townHall = toNumber(m.townHall)
    m.cumAttacksUsed = toNumber(m.cumAttacksUsed)
    m.cumAttacksPossible = toNumber(m.cumAttacksPossible)
    m.cumDestructionPct = toNumber(m.cumDestructionPct)
    m.attacksLeft = Number.isFinite(m.cumAttacksPossible) && Number.isFinite(m.cumAttacksUsed)
      ? Math.max(0, m.cumAttacksPossible - m.cumAttacksUsed)
      : NaN
    // Compute average destruction per attack (bounded 0..100 when data is valid)
    m.avgDestruction = Number.isFinite(m.cumAttacksUsed) && m.cumAttacksUsed > 0 && Number.isFinite(m.cumDestructionPct)
      ? m.cumDestructionPct / m.cumAttacksUsed
      : NaN
    // Compute attack completion percentage (used / possible * 100)
    m.completionPct = Number.isFinite(m.cumAttacksPossible) && m.cumAttacksPossible > 0 && Number.isFinite(m.cumAttacksUsed)
      ? (m.cumAttacksUsed / m.cumAttacksPossible) * 100
      : NaN
    return m
  })
}

export function formatDateTime(iso) {
  if (!iso) return '-'
  try {
    const dt = new Date(iso)
    if (isNaN(dt.getTime())) return iso
    return dt.toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    })
  } catch {
    return iso
  }
}

// Format date only (no time) for display in the Last Updated column.
export function formatDate(iso) {
  if (!iso) return '-'
  try {
    const dt = new Date(iso)
    if (isNaN(dt.getTime())) return iso
    return dt.toLocaleDateString(undefined, {
      year: 'numeric', month: 'short', day: '2-digit',
    })
  } catch {
    return iso
  }
}

/*
  getTownHallImgSrc
  Purpose: Return the public path for a given town hall level image if available.
  Notes:   Files are served from /public/townhall. Mapping is explicit to handle
           the provided filenames.
*/
export function getTownHallImgSrc(level) {
  const map = {
    5: '/townhall/Building_HV_Town_Hall_level_5.png',
    6: '/townhall/Building_HV_Town_Hall_level_6.png',
    7: '/townhall/Building_HV_Town_Hall_level_7.png',
    8: '/townhall/Building_HV_Town_Hall_level_8.png',
    9: '/townhall/Building_HV_Town_Hall_level_9.png',
    10: '/townhall/Building_HV_Town_Hall_level_10.png',
    11: '/townhall/Building_HV_Town_Hall_level_11.png',
    12: '/townhall/Building_HV_Town_Hall_level_12_1.png',
    13: '/townhall/Building_HV_Town_Hall_level_13_3.png',
    14: '/townhall/Building_HV_Town_Hall_level_14_1.png',
    15: '/townhall/Building_HV_Town_Hall_level_15_3.png',
    16: '/townhall/Building_HV_Town_Hall_level_16_1.png',
    17: '/townhall/TH17_HV_03.png',
  }
  const lv = Number(level)
  return Number.isFinite(lv) ? map[lv] || null : null
}
