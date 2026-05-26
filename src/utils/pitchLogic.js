export const SZ_LEFT  = -0.83
export const SZ_RIGHT =  0.83
export const BALL_RADIUS = 0.12

export function isInTrueZone(pitch) {
  const { plateX, plateZ, szTop, szBot } = pitch
  return (
    plateX >= SZ_LEFT  - BALL_RADIUS &&
    plateX <= SZ_RIGHT + BALL_RADIUS &&
    plateZ >= szBot    - BALL_RADIUS &&
    plateZ <= szTop    + BALL_RADIUS
  )
}

export function trueCall(pitch) {
  return isInTrueZone(pitch) ? 'strike' : 'ball'
}

export function umpWasRight(pitch) {
  return pitch.description === trueCall(pitch)
}

export function isBorderline(pitch) {
  const { plateX, plateZ, szTop, szBot } = pitch
  const margin = BALL_RADIUS * 1.25
  const nearX   = Math.abs(Math.abs(plateX) - SZ_RIGHT) < margin
  const nearBot = Math.abs(plateZ - szBot) < margin
  const nearTop = Math.abs(plateZ - szTop) < margin
  return nearX || nearBot || nearTop
}

export function scoreGuess(pitch, userCall) {
  const correct = userCall === trueCall(pitch)
  if (!correct) return { correct: false, points: 0 }
  return { correct: true, points: isBorderline(pitch) ? 3 : 1 }
}

export function formatPitcherName(name) {
  if (!name) return 'Unknown'
  const parts = name.split(',')
  if (parts.length !== 2) return name
  return `${parts[1].trim()} ${parts[0].trim()}`
}

const PITCH_NAMES = {
  FF: '4-Seam FB', SI: 'Sinker', FC: 'Cutter',
  SL: 'Slider', ST: 'Sweeper', CU: 'Curveball',
  CH: 'Changeup', FS: 'Splitter', KC: 'Knuckle-Curve',
  KN: 'Knuckleball', FA: 'Fastball',
}
export function pitchTypeName(code) {
  return PITCH_NAMES[code] || code || 'Pitch'
}
