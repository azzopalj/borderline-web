import { useState, useEffect, useCallback } from 'react'
import StrikeZone from './StrikeZone.jsx'
import { trueCall, scoreGuess, isBorderline, pitchTypeName, umpWasRight } from '../utils/pitchLogic.js'

const TOTAL = 10

export default function ArcadeGame({ pitches, onComplete }) {
  const [idx,      setIdx]      = useState(0)
  const [phase,    setPhase]    = useState('animating') // animating | waiting | revealed
  const [results,  setResults]  = useState([])
  const [score,    setScore]    = useState(0)
  const [streak,   setStreak]   = useState(0)
  const [best,     setBest]     = useState(0)
  const [feedback, setFeedback] = useState(null)

  const pitch = pitches[idx]

  const handleAnimEnd = useCallback(() => setPhase('waiting'), [])

  const guess = useCallback((call) => {
    if (phase !== 'waiting') return
    const { correct, points } = scoreGuess(pitch, call)
    const newStreak = correct ? streak + 1 : 0
    const newBest   = Math.max(best, newStreak)
    setStreak(newStreak)
    setBest(newBest)
    setScore(s => s + points)
    const result = { pitch, userCall: call, correct, points }
    setResults(r => [...r, result])
    setFeedback(result)
    setPhase('revealed')
  }, [phase, pitch, streak, best])

  const advance = useCallback(() => {
    if (idx + 1 >= TOTAL) {
      onComplete({ results: [...results, results[results.length - 1]], score, best })
      return
    }
    setIdx(i => i + 1)
    setPhase('animating')
    setFeedback(null)
  }, [idx, results, score, best, onComplete])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'b' || e.key === 'B') guess('ball')
      if (e.key === 's' || e.key === 'S') guess('strike')
      if (e.key === ' ' || e.key === 'Enter') { if (phase === 'revealed') advance() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [guess, advance, phase])

  if (!pitch) return null

  const umpRight = umpWasRight(pitch)

  return (
    <div style={styles.container}>
      {/* HUD */}
      <div style={styles.hud}>
        <div>
          <div style={styles.score}>{score} pts</div>
          <div style={styles.sub}>Pitch {idx + 1} of {TOTAL}</div>
        </div>
        {streak >= 2 && (
          <div style={styles.streak}>{streak} 🔥</div>
        )}
      </div>

      {/* Pitch info */}
      <div style={styles.pitchInfo}>
        <div>
          <div style={styles.pitcherName}>{pitch.pitcher}</div>
          <div style={styles.pitchType}>{pitchTypeName(pitch.pitchType)}</div>
        </div>
        <div style={{textAlign:'right'}}>
          <span style={styles.mph}>{Math.round(pitch.mph)}</span>
          <span style={styles.mphLabel}> mph</span>
          {pitch.spinRate && <div style={styles.spin}>{pitch.spinRate.toLocaleString()} rpm</div>}
        </div>
      </div>

      {/* Canvas */}
      <div style={styles.canvas}>
        <StrikeZone
          pitch={pitch}
          revealed={phase === 'revealed'}
          animating={phase === 'animating'}
          onAnimEnd={handleAnimEnd}
        />
      </div>

      {/* Feedback */}
      {feedback && phase === 'revealed' && (
        <div style={{...styles.feedback, background: feedback.correct ? '#e8f5e9' : '#ffeaea', border: `1px solid ${feedback.correct ? '#81c784' : '#ef9a9a'}`}}>
          <div>
            <div style={{...styles.feedbackTitle, color: feedback.correct ? '#1b5e20' : '#b71c1c'}}>
              {feedback.correct
                ? (isBorderline(pitch) ? 'Nailed it — borderline! 🎉' : 'Correct!')
                : `Wrong — that's a ${trueCall(pitch)}`}
            </div>
            <div style={{...styles.feedbackSub, color: feedback.correct ? '#2e7d32' : '#c62828'}}>
              {feedback.correct
                ? (isBorderline(pitch) ? `+${feedback.points} pts (borderline bonus)` : '+1 pt')
                : (umpRight ? 'Ump agreed' : 'Ump also missed it — blown call')}
            </div>
          </div>
          <span style={{fontSize:20}}>{feedback.correct ? '✓' : '✗'}</span>
        </div>
      )}

      {/* Buttons */}
      <div style={styles.btnRow}>
        {phase === 'waiting' && <>
          <button style={{...styles.btn, ...styles.btnBall}} onClick={() => guess('ball')}>
            Ball
            <span style={styles.hint}>B</span>
          </button>
          <button style={{...styles.btn, ...styles.btnStrike}} onClick={() => guess('strike')}>
            Strike
            <span style={styles.hint}>S</span>
          </button>
        </>}
        {phase === 'revealed' && (
          <button style={{...styles.btn, ...styles.btnNext}} onClick={advance}>
            {idx + 1 >= TOTAL ? 'See results →' : 'Next pitch →'}
            <span style={styles.hint}>Space</span>
          </button>
        )}
        {phase === 'animating' && (
          <div style={styles.waiting}>Watch the pitch...</div>
        )}
      </div>
    </div>
  )
}

const styles = {
  container: { display:'flex', flexDirection:'column', gap:12, maxWidth:400, margin:'0 auto', padding:'16px 20px', minHeight:'100dvh' },
  hud:       { display:'flex', justifyContent:'space-between', alignItems:'flex-start', paddingTop:8 },
  score:     { fontSize:26, fontWeight:700, color:'#fff' },
  sub:       { fontSize:12, color:'rgba(255,255,255,0.4)' },
  streak:    { background:'rgba(249,199,116,0.2)', border:'1px solid rgba(249,199,116,0.4)', color:'#f9c774', padding:'4px 12px', borderRadius:20, fontSize:14, fontWeight:600 },
  pitchInfo: { display:'flex', justifyContent:'space-between', alignItems:'center', background:'rgba(255,255,255,0.06)', borderRadius:12, padding:'10px 14px', border:'1px solid rgba(255,255,255,0.08)' },
  pitcherName:{ fontSize:15, fontWeight:600, color:'#fff' },
  pitchType: { fontSize:12, color:'rgba(255,255,255,0.45)' },
  mph:       { fontSize:22, fontWeight:700, color:'#fff' },
  mphLabel:  { fontSize:11, color:'rgba(255,255,255,0.4)' },
  spin:      { fontSize:11, color:'rgba(255,255,255,0.3)' },
  canvas:    { flex:1, minHeight:200 },
  feedback:  { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 14px', borderRadius:12 },
  feedbackTitle:{ fontSize:14, fontWeight:600 },
  feedbackSub:{ fontSize:12, marginTop:2 },
  btnRow:    { display:'flex', gap:10, paddingBottom:24 },
  btn:       { flex:1, padding:'16px 0', borderRadius:14, border:'none', fontSize:17, fontWeight:700, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, position:'relative' },
  btnBall:   { background:'#e3f2fd', color:'#01579b' },
  btnStrike: { background:'#ffebee', color:'#b71c1c' },
  btnNext:   { background:'rgba(255,255,255,0.1)', color:'#fff', border:'1px solid rgba(255,255,255,0.15)' },
  hint:      { fontSize:10, opacity:0.5, position:'absolute', bottom:5, right:8 },
  waiting:   { flex:1, textAlign:'center', color:'rgba(255,255,255,0.35)', fontSize:14, padding:16 },
}
