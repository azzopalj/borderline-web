import { trueCall, isBorderline } from '../utils/pitchLogic.js'

export default function ResultScreen({ results, score, best, onPlayAgain, onHome }) {
  const correct = results.filter(r => r.correct).length
  const total   = results.length
  const pct     = total > 0 ? Math.round(correct / total * 100) : 0

  const color = pct >= 75 ? '#38bf66' : pct >= 55 ? '#f9c774' : '#e35252'

  const shareText = () => {
    const grid = results.map(r => r.correct ? '✅' : '❌').join('')
    return `⚾ Borderline — ${pct}% accuracy\n${grid}\n${correct}/${total} correct · ${score} pts\nhttps://azzopalj.github.io/borderline-web/`
  }

  const share = async () => {
    const text = shareText()
    if (navigator.share) {
      try { await navigator.share({ text }) } catch {}
    } else {
      await navigator.clipboard.writeText(text)
      alert('Result copied to clipboard!')
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.inner}>
        <div style={styles.emoji}>⚾️</div>
        <div style={styles.pct}>
          <span style={{color}}>{pct}%</span>
        </div>
        <div style={styles.sub}>{correct} of {total} correct</div>

        {/* Grid */}
        <div style={styles.grid}>
          {results.map((r, i) => (
            <div key={i} style={{
              ...styles.cell,
              background: r.correct ? '#38bf66cc' : '#e35252cc',
            }}>
              {r.correct ? '✓' : '✗'}
            </div>
          ))}
        </div>

        {/* Stats */}
        <div style={styles.statsRow}>
          <StatBox label="Points" value={score} />
          <StatBox label="Best streak" value={best} />
          <StatBox label="Borderline correct" value={results.filter(r => r.correct && isBorderline(r.pitch)).length} />
        </div>

        {/* Pitch breakdown */}
        <div style={styles.breakdown}>
          {results.map((r, i) => (
            <div key={i} style={{...styles.row, borderBottom: i < results.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none'}}>
              <span style={{color: r.correct ? '#38bf66' : '#e35252', fontSize:13}}>
                {r.correct ? '✓' : '✗'}
              </span>
              <span style={styles.rowName}>{r.pitch.pitcher}</span>
              <span style={styles.rowCall}>You: {r.userCall}</span>
              <span style={{...styles.rowCall, color: r.pitch.description === trueCall(r.pitch) ? '#38bf66' : '#e35252'}}>
                Ump: {r.pitch.description}
              </span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div style={styles.actions}>
          <button style={styles.shareBtn} onClick={share}>
            Share result ↗
          </button>
          <button style={styles.againBtn} onClick={onPlayAgain}>
            Play again
          </button>
          <button style={styles.homeBtn} onClick={onHome}>
            Home
          </button>
        </div>
      </div>
    </div>
  )
}

function StatBox({ label, value }) {
  return (
    <div style={{ textAlign:'center', flex:1 }}>
      <div style={{ fontSize:24, fontWeight:700, color:'#fff' }}>{value}</div>
      <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)' }}>{label}</div>
    </div>
  )
}

const styles = {
  container: { minHeight:'100dvh', display:'flex', flexDirection:'column', padding:'24px 20px' },
  inner:     { maxWidth:420, margin:'0 auto', width:'100%', display:'flex', flexDirection:'column', gap:16 },
  emoji:     { fontSize:40, textAlign:'center', marginTop:16 },
  pct:       { fontSize:64, fontWeight:800, textAlign:'center', letterSpacing:-2 },
  sub:       { fontSize:16, color:'rgba(255,255,255,0.45)', textAlign:'center' },
  grid:      { display:'flex', gap:6, justifyContent:'center', flexWrap:'wrap' },
  cell:      { width:26, height:26, borderRadius:5, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:'#fff' },
  statsRow:  { display:'flex', background:'rgba(255,255,255,0.05)', borderRadius:12, padding:'14px 0', border:'1px solid rgba(255,255,255,0.08)' },
  breakdown: { background:'rgba(255,255,255,0.04)', borderRadius:12, overflow:'hidden' },
  row:       { display:'flex', alignItems:'center', gap:8, padding:'10px 12px' },
  rowName:   { flex:1, fontSize:12, color:'rgba(255,255,255,0.7)' },
  rowCall:   { fontSize:11, color:'rgba(255,255,255,0.4)', textTransform:'capitalize' },
  actions:   { display:'flex', flexDirection:'column', gap:8, paddingBottom:32 },
  shareBtn:  { padding:'14px 0', borderRadius:14, border:'none', background:'#f9c774', color:'#1a0f02', fontSize:15, fontWeight:700, cursor:'pointer' },
  againBtn:  { padding:'14px 0', borderRadius:14, border:'none', background:'rgba(255,255,255,0.1)', color:'#fff', fontSize:15, fontWeight:600, cursor:'pointer', borderWidth:1, borderStyle:'solid', borderColor:'rgba(255,255,255,0.15)' },
  homeBtn:   { padding:'12px 0', borderRadius:14, border:'none', background:'transparent', color:'rgba(255,255,255,0.4)', fontSize:14, cursor:'pointer' },
}
