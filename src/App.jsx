import { useState, useEffect } from 'react'
import ArcadeGame from './components/ArcadeGame.jsx'
import ResultScreen from './components/ResultScreen.jsx'
import { preloadPitches, getPitches } from './services/statcast.js'

const AMBER = '#f9c774'
const BG    = '#080f1a'

export default function App() {
  const [screen,   setScreen]   = useState('home')   // home | loading | playing | result
  const [pitches,  setPitches]  = useState([])
  const [result,   setResult]   = useState(null)
  const [progress, setProgress] = useState(0)
  const [loadMsg,  setLoadMsg]  = useState('Fetching pitches...')

  // Preload on mount
  useEffect(() => {
    preloadPitches((p) => setProgress(p))
  }, [])

  const startArcade = async () => {
    setScreen('loading')
    setProgress(0.1)
    try {
      await preloadPitches((p) => setProgress(p))
    } catch {
      setProgress(1.0)
    }
    const p = getPitches(10)
    if (p.length === 0) {
      setScreen('home')
      return
    }
    setPitches(p)
    setScreen('playing')
  }

  const handleComplete = (res) => {
    setResult(res)
    setScreen('result')
  }

  useEffect(() => {
    const msgs = ['Fetching pitches...', 'Parsing Statcast data...', 'Selecting borderline calls...', 'Almost ready...']
    const idx = progress < 0.3 ? 0 : progress < 0.6 ? 1 : progress < 0.9 ? 2 : 3
    setLoadMsg(msgs[idx])
  }, [progress])

  if (screen === 'playing' && pitches.length > 0) {
    return (
      <div style={appStyle}>
        <ArcadeGame pitches={pitches} onComplete={handleComplete} />
      </div>
    )
  }

  if (screen === 'result' && result) {
    return (
      <div style={appStyle}>
        <ResultScreen
          {...result}
          onPlayAgain={() => { setResult(null); startArcade() }}
          onHome={() => { setResult(null); setScreen('home') }}
        />
      </div>
    )
  }

  if (screen === 'loading') {
    return (
      <div style={{...appStyle, ...centerStyle}}>
        <div style={loadingBox}>
          <span style={{fontSize:40}}>⚾️</span>
          <div style={{fontSize:16, fontWeight:600, color:'#fff', marginTop:16}}>Loading pitches</div>
          <div style={{fontSize:13, color:'rgba(255,255,255,0.4)', marginTop:4}}>{loadMsg}</div>
          <div style={progressTrack}>
            <div style={{...progressFill, width: `${progress * 100}%`}} />
          </div>
          <div style={{fontSize:11, color:'rgba(255,255,255,0.3)', fontVariantNumeric:'tabular-nums'}}>
            {Math.round(progress * 100)}%
          </div>
        </div>
      </div>
    )
  }

  // Home screen
  return (
    <div style={appStyle}>
      <div style={homeContainer}>
        {/* Header */}
        <div style={headerStyle}>
          <div style={logoStyle}>Border<span style={{color: AMBER}}>line</span></div>
          <div style={tagline}>Real MLB Pitch Calls</div>
        </div>

        {/* Hero zone preview */}
        <div style={zonePreview}>
          <ZoneSVG />
        </div>

        {/* Mode cards */}
        <div style={cards}>
          <ModeCard
            emoji="⚡️"
            title="Arcade"
            desc="10 random borderline pitches. How sharp is your eye?"
            free
            onClick={startArcade}
          />
          <ModeCard
            emoji="📅"
            title="Daily Challenge"
            desc="Coming soon — 10 blown calls from yesterday, same for everyone."
            onClick={null}
            soon
          />
          <ModeCard
            emoji="🏟️"
            title="Full Game"
            desc="Call every pitch from a real MLB game. Download the iOS app."
            onClick={() => window.open('https://apps.apple.com/app/id6772781356')}
            ios
          />
        </div>

        {/* Footer */}
        <div style={footer}>
          <a href="https://apps.apple.com/app/id6772781356" style={appStoreBadge}>
            📱 Download on the App Store
          </a>
          <div style={footerLinks}>
            <a href="https://azzopalj.github.io/borderline-app/privacy-policy.html" style={footerLink}>Privacy</a>
            <span style={{color:'rgba(255,255,255,0.15)'}}>·</span>
            <a href="mailto:azzopalj@gmail.com" style={footerLink}>Support</a>
          </div>
          <div style={{fontSize:11, color:'rgba(255,255,255,0.2)', marginTop:8}}>
            Not affiliated with MLB. Data from Baseball Savant &amp; MLB Stats API.
          </div>
        </div>
      </div>
    </div>
  )
}

function ModeCard({ emoji, title, desc, free, soon, ios, onClick }) {
  return (
    <button
      onClick={onClick || undefined}
      disabled={!onClick}
      style={{
        ...cardStyle,
        opacity: !onClick ? 0.6 : 1,
        cursor: onClick ? 'pointer' : 'default',
        borderColor: free ? 'rgba(249,199,116,0.3)' : 'rgba(255,255,255,0.08)',
        background: free ? 'rgba(249,199,116,0.06)' : 'rgba(255,255,255,0.04)',
      }}
    >
      <div style={{display:'flex', alignItems:'center', gap:12}}>
        <span style={{fontSize:24}}>{emoji}</span>
        <div style={{flex:1, textAlign:'left'}}>
          <div style={{display:'flex', alignItems:'center', gap:8}}>
            <span style={{fontSize:16, fontWeight:600, color:'#fff'}}>{title}</span>
            {free && <span style={badgeFree}>FREE</span>}
            {soon && <span style={badgeSoon}>SOON</span>}
            {ios  && <span style={badgeIos}>iOS APP</span>}
          </div>
          <div style={{fontSize:13, color:'rgba(255,255,255,0.45)', marginTop:3}}>{desc}</div>
        </div>
        {onClick && <span style={{color:'rgba(255,255,255,0.25)', fontSize:14}}>›</span>}
      </div>
    </button>
  )
}

function ZoneSVG() {
  return (
    <svg viewBox="0 0 200 180" style={{width:'100%', maxWidth:220, display:'block', margin:'0 auto'}}>
      {/* Zone */}
      <rect x="50" y="20" width="100" height="120" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.35)" strokeWidth="2"/>
      {/* Grid */}
      {[83.3, 116.7].map(x => <line key={x} x1={x} y1="20" x2={x} y2="140" stroke="rgba(255,255,255,0.12)" strokeWidth="0.8"/>)}
      {[60, 100].map(y => <line key={y} x1="50" y1={y} x2="150" y2={y} stroke="rgba(255,255,255,0.12)" strokeWidth="0.8"/>)}
      {/* Ball on edge - green */}
      <circle cx="148" cy="137" r="13" fill="#38bf66"/>
      <path d="M141 130 Q145 137 141 144" fill="none" stroke="#0a1628" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M155 130 Q151 137 155 144" fill="none" stroke="#0a1628" strokeWidth="1.5" strokeLinecap="round"/>
      {/* Ball clearly out - red */}
      <circle cx="35" cy="50" r="11" fill="#e35252" opacity="0.8"/>
      {/* Plate */}
      <path d="M75 158 L100 152 L125 158 L125 165 L100 168 L75 165 Z" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5"/>
      {/* Labels */}
      <text x="100" y="12" textAnchor="middle" fill="rgba(255,255,255,0.22)" fontSize="8" fontFamily="Inter,sans-serif">rulebook strike zone</text>
    </svg>
  )
}

// Styles
const appStyle      = { minHeight:'100dvh', background: BG, fontFamily:'Inter,-apple-system,sans-serif', WebkitFontSmoothing:'antialiased' }
const centerStyle   = { display:'flex', alignItems:'center', justifyContent:'center' }
const loadingBox    = { display:'flex', flexDirection:'column', alignItems:'center', gap:8, padding:40 }
const progressTrack = { width:200, height:4, background:'rgba(255,255,255,0.1)', borderRadius:2, marginTop:8, overflow:'hidden' }
const progressFill  = { height:'100%', background: AMBER, borderRadius:2, transition:'width 0.4s ease' }
const homeContainer = { maxWidth:440, margin:'0 auto', padding:'0 20px', display:'flex', flexDirection:'column', gap:24, paddingBottom:48 }
const headerStyle   = { paddingTop:48, textAlign:'center' }
const logoStyle     = { fontSize:36, fontWeight:800, letterSpacing:-1, color:'#fff' }
const tagline       = { fontSize:14, color:'rgba(255,255,255,0.4)', marginTop:4 }
const zonePreview   = { padding:'8px 0' }
const cards         = { display:'flex', flexDirection:'column', gap:10 }
const cardStyle     = { width:'100%', border:'1px solid', borderRadius:16, padding:'16px 18px', textAlign:'left', transition:'all 0.15s' }
const footer        = { textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center', gap:10, paddingTop:8 }
const appStoreBadge = { display:'inline-block', background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)', color:'#fff', padding:'10px 20px', borderRadius:12, fontSize:14, fontWeight:500, textDecoration:'none' }
const footerLinks   = { display:'flex', gap:12, alignItems:'center' }
const footerLink    = { fontSize:13, color:'rgba(255,255,255,0.35)', textDecoration:'none' }
const badgeFree     = { fontSize:9, fontWeight:700, background:'rgba(56,191,102,0.2)', color:'#38bf66', padding:'2px 6px', borderRadius:4, letterSpacing:0.5 }
const badgeSoon     = { fontSize:9, fontWeight:700, background:'rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.5)', padding:'2px 6px', borderRadius:4 }
const badgeIos      = { fontSize:9, fontWeight:700, background:'rgba(249,199,116,0.15)', color:'#f9c774', padding:'2px 6px', borderRadius:4 }
