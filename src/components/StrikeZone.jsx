import { useRef, useEffect } from 'react'
import { SZ_LEFT, SZ_RIGHT, BALL_RADIUS, isInTrueZone, isBorderline } from '../utils/pitchLogic.js'

export default function StrikeZone({ pitch, revealed, animating, onAnimEnd }) {
  const canvasRef = useRef(null)
  const animRef   = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !pitch) return
    const ctx = canvas.getContext('2d')
    const W = canvas.width, H = canvas.height

    // Layout
    const zoneW  = W * 0.42
    const ppf    = zoneW / (SZ_RIGHT - SZ_LEFT)          // pixels per foot
    const zoneH  = (pitch.szTop - pitch.szBot) * ppf
    const cx     = W / 2, cy = H * 0.42
    const zoneX  = cx - zoneW / 2
    const zoneY  = cy - zoneH / 2
    const ballR  = zoneW * (BALL_RADIUS / 1.66)

    // Ball destination
    const xNorm  = (pitch.plateX - SZ_LEFT)  / (SZ_RIGHT - SZ_LEFT)
    const yNorm  = (pitch.plateZ - pitch.szBot) / (pitch.szTop - pitch.szBot)
    const ballDX = zoneX + xNorm * zoneW
    const ballDY = zoneY + (1 - yNorm) * zoneH  // flip: canvas Y increases downward

    // Vanishing point (release point perspective)
    const vpX = cx, vpY = H * 0.10
    const releaseScale = 0.06

    const inZone   = isInTrueZone(pitch)
    const ballColor = inZone ? '#38bf66' : '#e35252'

    if (animating) {
      // Animate ball from vanishing point to plate
      const startTime = performance.now()
      const baseDuration = 750
      const speedFactor  = Math.min(Math.max(pitch.mph / 90, 0.7), 1.3)
      const duration     = baseDuration / speedFactor

      const breakOffX = pitch.breakX * 2.5

      function draw(t) {
        ctx.clearRect(0, 0, W, H)
        drawBackground(ctx, W, H, vpX, vpY, cx)
        drawPlate(ctx, cx, zoneY, zoneW, zoneH)
        drawMeasurementBar(ctx, W, H, zoneX, zoneY, zoneH, pitch, 1 - Math.min(t * 2.5, 1))

        // Ball along bezier
        const controlX = vpX + breakOffX * 0.3
        const controlY = (vpY + ballDY) / 2
        const bx = lerp2(vpX + breakOffX * 0.3, controlX, ballDX, t)
        const by = lerp2(vpY, controlY, ballDY, t)
        const scale = releaseScale + (1 - releaseScale) * t
        const r = Math.max(ballR * scale, 3)

        // Trail
        if (t > 0.1) {
          for (let i = 1; i <= 6; i++) {
            const tt = Math.max(0, t - i * 0.03)
            const tx = lerp2(vpX + breakOffX * 0.3, controlX, ballDX, tt)
            const ty = lerp2(vpY, controlY, ballDY, tt)
            const ts = releaseScale + (1 - releaseScale) * tt
            ctx.beginPath()
            ctx.arc(tx, ty, Math.max(ballR * ts * 0.7, 2), 0, Math.PI * 2)
            ctx.fillStyle = `rgba(255,255,255,${0.05 * (6 - i) / 6})`
            ctx.fill()
          }
        }

        // Ball
        ctx.beginPath()
        ctx.arc(bx, by, r, 0, Math.PI * 2)
        ctx.fillStyle = '#fff'
        ctx.fill()
        ctx.strokeStyle = 'rgba(0,0,0,0.2)'
        ctx.lineWidth = 0.5
        ctx.stroke()

        if (t < 1) {
          const elapsed = performance.now() - startTime
          animRef.current = requestAnimationFrame(() => draw(Math.min(elapsed / duration, 1)))
        } else {
          onAnimEnd?.()
        }
      }
      animRef.current = requestAnimationFrame(() => draw(0))

    } else if (revealed) {
      ctx.clearRect(0, 0, W, H)
      drawBackground(ctx, W, H, vpX, vpY, cx)
      drawZone(ctx, zoneX, zoneY, zoneW, zoneH, ballColor, 0.9)
      drawPlate(ctx, cx, zoneY, zoneW, zoneH)
      drawMeasurementBar(ctx, W, H, zoneX, zoneY, zoneH, pitch, 1)

      // Ball
      ctx.beginPath()
      ctx.arc(ballDX, ballDY, ballR, 0, Math.PI * 2)
      ctx.fillStyle = ballColor
      ctx.fill()
      ctx.strokeStyle = ballColor
      ctx.lineWidth = 2
      ctx.stroke()

      // Pulse ring
      ctx.beginPath()
      ctx.arc(ballDX, ballDY, ballR + 7, 0, Math.PI * 2)
      ctx.strokeStyle = ballColor + '55'
      ctx.lineWidth = 2
      ctx.stroke()

      // Badge
      const label = inZone ? 'IN — STRIKE' : 'OUT — BALL'
      const badgeY = ballDY - ballR - 18
      ctx.font = 'bold 11px Inter, sans-serif'
      const tw = ctx.measureText(label).width
      const bw = tw + 20, bh = 22
      ctx.fillStyle = ballColor + '40'
      roundRect(ctx, ballDX - bw/2, badgeY - bh/2, bw, bh, 5)
      ctx.fill()
      ctx.strokeStyle = ballColor + 'AA'
      ctx.lineWidth = 1
      roundRect(ctx, ballDX - bw/2, badgeY - bh/2, bw, bh, 5)
      ctx.stroke()
      ctx.fillStyle = '#fff'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(label, ballDX, badgeY)

      // Blown call label
      if (!pitch.umpWasRight) {
        ctx.font = '9px Inter, sans-serif'
        ctx.fillStyle = '#f9c774cc'
        ctx.fillText(`Ump called ${pitch.description} — blown call`, ballDX, badgeY + 18)
      }

      if (isBorderline(pitch)) {
        ctx.font = 'bold 9px Inter, sans-serif'
        ctx.fillStyle = '#f9c774'
        ctx.fillText('BORDERLINE', ballDX, badgeY + (pitch.umpWasRight ? 14 : 28))
      }
    } else {
      // Idle — show zone + plate
      ctx.clearRect(0, 0, W, H)
      drawBackground(ctx, W, H, vpX, vpY, cx)
      drawZone(ctx, zoneX, zoneY, zoneW, zoneH, 'rgba(255,255,255,0.5)', 0)
      drawPlate(ctx, cx, zoneY, zoneW, zoneH)
      drawMeasurementBar(ctx, W, H, zoneX, zoneY, zoneH, pitch, 1)
    }

    return () => { if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [pitch, revealed, animating])

  return (
    <canvas
      ref={canvasRef}
      width={340}
      height={460}
      style={{ width: '100%', maxWidth: 340, display: 'block', margin: '0 auto' }}
    />
  )
}

// Quadratic bezier interpolation
function lerp2(p0, p1, p2, t) {
  return (1-t)*(1-t)*p0 + 2*(1-t)*t*p1 + t*t*p2
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function drawBackground(ctx, W, H, vpX, vpY, cx) {
  // Subtle perspective lines
  const corners = [[0,0],[W,0],[0,H*0.3],[W,H*0.3]]
  corners.forEach(([x,y]) => {
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(vpX, vpY)
    ctx.strokeStyle = 'rgba(255,255,255,0.04)'
    ctx.lineWidth = 1
    ctx.stroke()
  })
}

function drawZone(ctx, zx, zy, zw, zh, borderColor, fillAlpha) {
  // Fill
  ctx.fillStyle = `rgba(255,255,255,${fillAlpha * 0.04})`
  ctx.fillRect(zx, zy, zw, zh)

  // Border
  ctx.strokeStyle = borderColor
  ctx.lineWidth = 2
  ctx.strokeRect(zx, zy, zw, zh)

  // 3x3 grid
  for (let i = 1; i < 3; i++) {
    ctx.beginPath()
    ctx.moveTo(zx + zw * i/3, zy)
    ctx.lineTo(zx + zw * i/3, zy + zh)
    ctx.strokeStyle = 'rgba(255,255,255,0.12)'
    ctx.lineWidth = 0.8
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(zx, zy + zh * i/3)
    ctx.lineTo(zx + zw, zy + zh * i/3)
    ctx.stroke()
  }

  // Label
  ctx.font = '9px Inter, sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.22)'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'bottom'
  ctx.fillText('rulebook strike zone', zx + 3, zy - 4)
}

function drawPlate(ctx, cx, zoneMinY, zoneW, zoneH) {
  const pw = zoneW, ph = 12
  const py = zoneMinY + zoneH + 24
  ctx.beginPath()
  ctx.moveTo(cx, py + ph)
  ctx.lineTo(cx + pw/2, py + ph/2)
  ctx.lineTo(cx + pw/2, py)
  ctx.lineTo(cx - pw/2, py)
  ctx.lineTo(cx - pw/2, py + ph/2)
  ctx.closePath()
  ctx.strokeStyle = 'rgba(255,255,255,0.4)'
  ctx.lineWidth = 1.5
  ctx.stroke()
  ctx.fillStyle = 'rgba(255,255,255,0.08)'
  ctx.fill()
}

function drawMeasurementBar(ctx, W, H, zoneX, zoneY, zoneH, pitch, alpha) {
  if (alpha <= 0) return
  const barX = W * 0.06
  const barBot = zoneY - 20
  const barTop = zoneY + zoneH + 20
  const tickColor = `rgba(249,199,116,${0.9 * alpha})`
  const barColor  = `rgba(255,255,255,${0.25 * alpha})`

  // Main bar
  ctx.beginPath()
  ctx.moveTo(barX, barBot)
  ctx.lineTo(barX, barTop)
  ctx.strokeStyle = barColor
  ctx.lineWidth = 1.5
  ctx.stroke()

  // Knee tick
  drawTick(ctx, barX, zoneY, tickColor)
  // Letters tick
  drawTick(ctx, barX, zoneY + zoneH, tickColor)

  // Zone height in inches
  const inches = Math.round((pitch.szTop - pitch.szBot) * 12)
  ctx.font = '9px Inter, sans-serif'
  ctx.fillStyle = `rgba(255,255,255,${0.3 * alpha})`
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  ctx.fillText(`${inches}"`, barX - 6, zoneY + zoneH / 2)
}

function drawTick(ctx, barX, y, color) {
  ctx.beginPath()
  ctx.moveTo(barX, y)
  ctx.lineTo(barX + 12, y)
  ctx.strokeStyle = color
  ctx.lineWidth = 1.5
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(barX, y, 2.5, 0, Math.PI * 2)
  ctx.fillStyle = color
  ctx.fill()
}
