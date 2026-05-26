import { formatPitcherName } from '../utils/pitchLogic.js'

const CURRENT_YEAR = new Date().getFullYear()

function buildURL() {
  const params = new URLSearchParams({
    hfPR:       'called_strike||ball||',
    hfGT:       'R||',
    hfSea:      `${CURRENT_YEAR}||`,
    hfFlag:     'is||',
    min_pitches:'0',
    min_results:'0',
    group_by:   'name',
    sort_col:   'pitches',
    sort_order: 'desc',
    min_pas:    '0',
    type:       'details',
  })
  return `https://baseballsavant.mlb.com/statcast_search/csv?${params}`
}

function parseCSV(text) {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return []
  const headers = lines[0].split(',')
  const idx = {
    pitchType:    headers.indexOf('pitch_type'),
    playerName:   headers.indexOf('player_name'),
    description:  headers.indexOf('description'),
    plateX:       headers.indexOf('plate_x'),
    plateZ:       headers.indexOf('plate_z'),
    szTop:        headers.indexOf('sz_top'),
    szBot:        headers.indexOf('sz_bot'),
    releaseSpeed: headers.indexOf('release_speed'),
    spinRate:     headers.indexOf('release_spin_rate'),
    releasePosX:  headers.indexOf('release_pos_x'),
    releasePosZ:  headers.indexOf('release_pos_z'),
    pfxX:         headers.indexOf('pfx_x'),
    pfxZ:         headers.indexOf('pfx_z'),
    stand:        headers.indexOf('stand'),
  }

  const pitches = []
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',')
    const get  = (k) => cols[idx[k]] || ''
    const num  = (k) => parseFloat(get(k)) || 0

    const desc = get('description').toLowerCase().trim()
    if (desc !== 'called_strike' && desc !== 'ball') continue

    const plateX = num('plateX')
    const plateZ = num('plateZ')
    const szTop  = num('szTop') || 3.5
    const szBot  = num('szBot') || 1.5

    if (Math.abs(plateX) > 3 || plateZ < 0.5 || plateZ > 5.5) continue

    pitches.push({
      pitchType:   get('pitchType'),
      pitcher:     formatPitcherName(get('playerName')),
      description: desc === 'called_strike' ? 'strike' : 'ball',
      plateX, plateZ, szTop, szBot,
      mph:       num('releaseSpeed'),
      spinRate:  parseInt(get('spinRate')) || null,
      releaseX:  num('releasePosX'),
      releaseZ:  num('releasePosZ'),
      breakX:    num('pfxX'),
      breakZ:    num('pfxZ'),
      batterHand: get('stand').toUpperCase() === 'L' ? 'L' : 'R',
    })
  }
  return pitches
}

function isInteresting(pitch) {
  const { plateX, plateZ, szTop, szBot } = pitch
  const dX   = Math.max(0, Math.abs(plateX) - 0.83)
  const dBot = Math.max(0, szBot - plateZ)
  const dTop = Math.max(0, plateZ - szTop)
  return dX < 0.45 && dBot < 0.40 && dTop < 0.40
}

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

let _pool = null

// Try to fetch live data, but don't block on it
async function tryFetchLive(onProgress) {
  try {
    onProgress?.(0.2)
    const res = await fetch(buildURL(), { signal: AbortSignal.timeout(15000) })
    if (!res.ok) throw new Error('bad response')
    onProgress?.(0.6)
    const text = await res.text()
    onProgress?.(0.85)
    const all = parseCSV(text)
    if (all.length < 10) throw new Error('too few pitches')
    const interesting = all.filter(isInteresting)
    _pool = interesting.length >= 10 ? interesting : all
    onProgress?.(1.0)
    return true
  } catch {
    onProgress?.(1.0)
    return false
  }
}

export async function preloadPitches(onProgress) {
  // Always resolve quickly — use fallback if live fetch fails or is blocked
  if (_pool) { onProgress?.(1.0); return }
  onProgress?.(0.1)
  await tryFetchLive(onProgress)
  if (!_pool) _pool = FALLBACK_PITCHES
}

export function getPitches(count = 10) {
  const pool = _pool && _pool.length >= count ? _pool : FALLBACK_PITCHES
  return shuffle(pool).slice(0, count)
}

export const FALLBACK_PITCHES = [
  { pitchType:'FF', pitcher:'Gerrit Cole',     description:'strike', plateX:-0.15, plateZ:2.80, szTop:3.45, szBot:1.55, mph:97,  spinRate:2400, releaseX:-2.0, releaseZ:6.2, breakX:-8,  breakZ:12, batterHand:'R' },
  { pitchType:'ST', pitcher:'Shohei Ohtani',   description:'ball',   plateX: 1.05, plateZ:2.10, szTop:3.30, szBot:1.50, mph:83,  spinRate:2750, releaseX:-2.5, releaseZ:6.0, breakX: 17, breakZ: 2, batterHand:'L' },
  { pitchType:'CH', pitcher:'Chris Sale',       description:'strike', plateX: 0.55, plateZ:1.62, szTop:3.40, szBot:1.52, mph:84,  spinRate:1650, releaseX:-2.8, releaseZ:5.9, breakX: -7, breakZ: 6, batterHand:'R' },
  { pitchType:'SL', pitcher:'Zack Wheeler',     description:'ball',   plateX:-0.90, plateZ:3.55, szTop:3.38, szBot:1.48, mph:88,  spinRate:2600, releaseX:-2.2, releaseZ:6.1, breakX:  9, breakZ: 3, batterHand:'R' },
  { pitchType:'CU', pitcher:'Gerrit Cole',      description:'strike', plateX: 0.20, plateZ:2.05, szTop:3.45, szBot:1.55, mph:78,  spinRate:2850, releaseX:-2.0, releaseZ:6.2, breakX: -6, breakZ:12, batterHand:'L' },
  { pitchType:'FF', pitcher:'Shohei Ohtani',    description:'strike', plateX:-0.05, plateZ:3.42, szTop:3.44, szBot:1.54, mph:101, spinRate:2350, releaseX:-2.5, releaseZ:6.0, breakX: -9, breakZ:14, batterHand:'R' },
  { pitchType:'FC', pitcher:'Logan Webb',       description:'ball',   plateX: 0.78, plateZ:2.30, szTop:3.60, szBot:1.65, mph:91,  spinRate:2200, releaseX:-1.8, releaseZ:6.1, breakX: -4, breakZ: 8, batterHand:'L' },
  { pitchType:'SI', pitcher:'Sandy Alcantara',  description:'ball',   plateX:-0.85, plateZ:1.90, szTop:3.35, szBot:1.50, mph:89,  spinRate:2100, releaseX:-2.1, releaseZ:5.8, breakX: 12, breakZ: 4, batterHand:'R' },
  { pitchType:'SL', pitcher:'Dylan Cease',      description:'strike', plateX: 0.80, plateZ:2.45, szTop:3.42, szBot:1.52, mph:87,  spinRate:2680, releaseX:-2.3, releaseZ:6.0, breakX:  8, breakZ: 2, batterHand:'R' },
  { pitchType:'CH', pitcher:'Zack Wheeler',     description:'ball',   plateX:-0.10, plateZ:1.55, szTop:3.38, szBot:1.48, mph:86,  spinRate:1820, releaseX:-2.4, releaseZ:5.9, breakX: -5, breakZ: 7, batterHand:'R' },
  { pitchType:'FF', pitcher:'Paul Skenes',      description:'strike', plateX: 0.30, plateZ:3.38, szTop:3.42, szBot:1.52, mph:102, spinRate:2510, releaseX:-1.9, releaseZ:6.3, breakX:-10, breakZ:15, batterHand:'R' },
  { pitchType:'ST', pitcher:'Paul Skenes',      description:'ball',   plateX:-0.88, plateZ:2.20, szTop:3.42, szBot:1.52, mph:86,  spinRate:2890, releaseX:-1.9, releaseZ:6.3, breakX: 14, breakZ: 1, batterHand:'L' },
  { pitchType:'CU', pitcher:'Corbin Burnes',    description:'ball',   plateX: 0.15, plateZ:1.48, szTop:3.36, szBot:1.46, mph:80,  spinRate:2920, releaseX:-2.6, releaseZ:6.0, breakX: -4, breakZ:11, batterHand:'R' },
  { pitchType:'FC', pitcher:'Freddie Freeman',  description:'strike', plateX:-0.82, plateZ:2.65, szTop:3.58, szBot:1.64, mph:92,  spinRate:2310, releaseX:-1.7, releaseZ:6.2, breakX: -3, breakZ: 9, batterHand:'L' },
  { pitchType:'SI', pitcher:'Spencer Strider',  description:'strike', plateX: 0.10, plateZ:1.58, szTop:3.40, szBot:1.50, mph:99,  spinRate:2180, releaseX:-1.6, releaseZ:6.4, breakX: 11, breakZ: 5, batterHand:'R' },
]
