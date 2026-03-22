import * as THREE from 'three'

// Per-level wall themes
export const LEVEL_THEMES = [
  { wall: '#5a6a8e', rough: 0.8, metal: 0.0, emissive: '#000000', floor: '#3a3a4e', pattern: 'stone'   }, // 0: stone
  { wall: '#8a5a30', rough: 0.9, metal: 0.0, emissive: '#110500', floor: '#4a3020', pattern: 'brick'   }, // 1: sandstone brick
  { wall: '#2a6a4a', rough: 0.8, metal: 0.0, emissive: '#001a0a', floor: '#1a3a28', pattern: 'mossy'   }, // 2: mossy dungeon
  { wall: '#7a3020', rough: 0.6, metal: 0.1, emissive: '#200500', floor: '#3a1808', pattern: 'crack'   }, // 3: volcanic
  { wall: '#3a3a6a', rough: 0.3, metal: 0.7, emissive: '#000010', floor: '#202040', pattern: 'metal'   }, // 4: metal fortress
  { wall: '#5a3a7a', rough: 0.5, metal: 0.4, emissive: '#0a001a', floor: '#2a1a3a', pattern: 'crystal' }, // 5: arcane crystal
  { wall: '#3a6a7a', rough: 0.3, metal: 0.3, emissive: '#001418', floor: '#162a30', pattern: 'ice'     }, // 6: ice cave
  { wall: '#6a5a2a', rough: 0.9, metal: 0.0, emissive: '#100800', floor: '#3a3010', pattern: 'brick'   }, // 7: ancient ruins
]

export function levelTheme(level) {
  return LEVEL_THEMES[level % LEVEL_THEMES.length]
}

// Seeded pseudo-random so textures are stable across renders
function seededRand(seed) {
  let s = seed
  return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 0xffffffff }
}

export function createWallTexture(theme) {
  const S = 512
  const canvas = document.createElement('canvas')
  canvas.width = S; canvas.height = S
  const ctx = canvas.getContext('2d')
  const rand = seededRand(theme.wall.charCodeAt(1) * 997 + theme.wall.charCodeAt(3) * 31)

  const base = new THREE.Color(theme.wall)
  const css = (r, g, b) => `rgb(${~~r},${~~g},${~~b})`
  const tint = (f) => css(base.r * 255 * f, base.g * 255 * f, base.b * 255 * f)

  ctx.fillStyle = tint(1)
  ctx.fillRect(0, 0, S, S)

  if (theme.pattern === 'brick') {
    const bw = 64, bh = 26, m = 4
    for (let row = 0; row * bh < S + bh; row++) {
      const off = (row % 2) * (bw / 2)
      for (let col = -1; col * bw < S + bw; col++) {
        const x = col * bw + off, y = row * bh
        const v = 0.78 + rand() * 0.30
        ctx.fillStyle = tint(v)
        ctx.fillRect(x + m / 2, y + m / 2, bw - m, bh - m)
      }
    }
    // mortar shadow
    ctx.fillStyle = tint(0.55)
    for (let row = 0; row * bh < S + bh; row++) {
      const off = (row % 2) * (bw / 2)
      for (let col = -1; col * bw < S + bw; col++) {
        const x = col * bw + off, y = row * bh
        ctx.fillRect(x + m / 2, y + bh - m, bw - m, m)       // bottom line
        ctx.fillRect(x + bw - m, y + m / 2, m, bh - m)       // right line
      }
    }
  }

  else if (theme.pattern === 'stone' || theme.pattern === 'mossy') {
    let y = 0
    while (y < S) {
      const bh = 28 + ~~(rand() * 22)
      let x = 0
      while (x < S) {
        const bw = 38 + ~~(rand() * 44)
        const v = 0.78 + rand() * 0.32
        ctx.fillStyle = tint(v)
        ctx.fillRect(x + 2, y + 2, bw - 4, bh - 4)
        if (theme.pattern === 'mossy' && rand() < 0.25) {
          ctx.fillStyle = `rgba(40,${~~(80 + rand()*80)},40,0.45)`
          ctx.fillRect(x + 4, y + 4, ~~(bw * 0.6), ~~(bh * 0.5))
        }
        x += bw
      }
      y += bh
    }
    // grout lines
    ctx.strokeStyle = tint(0.45)
    ctx.lineWidth = 2
    let gy = 0
    while (gy < S) {
      const bh = 28 + ~~(rand() * 22)
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(S, gy); ctx.stroke()
      gy += bh
    }
  }

  else if (theme.pattern === 'metal') {
    const ps = 72
    for (let py = 0; py * ps < S; py++) {
      for (let px = 0; px * ps < S; px++) {
        const x = px * ps, y = py * ps
        const v = 0.85 + (px + py) % 2 * 0.18
        ctx.fillStyle = tint(v)
        ctx.fillRect(x + 3, y + 3, ps - 6, ps - 6)
        // beveled edge highlight
        ctx.fillStyle = tint(1.4)
        ctx.fillRect(x + 3, y + 3, ps - 6, 2)
        ctx.fillRect(x + 3, y + 3, 2, ps - 6)
        ctx.fillStyle = tint(0.5)
        ctx.fillRect(x + 3, y + ps - 5, ps - 6, 2)
        ctx.fillRect(x + ps - 5, y + 3, 2, ps - 6)
        // rivets
        ctx.fillStyle = tint(1.6)
        for (const [rx, ry] of [[x+10,y+10],[x+ps-10,y+10],[x+10,y+ps-10],[x+ps-10,y+ps-10]]) {
          ctx.beginPath(); ctx.arc(rx, ry, 4, 0, Math.PI * 2); ctx.fill()
          ctx.fillStyle = tint(0.6); ctx.beginPath(); ctx.arc(rx+1, ry+1, 2, 0, Math.PI * 2); ctx.fill()
          ctx.fillStyle = tint(1.6)
        }
      }
    }
  }

  else if (theme.pattern === 'crystal') {
    const step = 52
    for (let i = -S; i < S * 2; i += step) {
      const v = 0.65 + (~~(i / step) % 2) * 0.45
      ctx.fillStyle = tint(v)
      ctx.beginPath()
      ctx.moveTo(i, 0); ctx.lineTo(i + S * 0.6, S)
      ctx.lineTo(i + S * 0.6 + step, S); ctx.lineTo(i + step, 0)
      ctx.closePath(); ctx.fill()
    }
    // sparkle lines
    ctx.strokeStyle = tint(2.0); ctx.lineWidth = 1; ctx.globalAlpha = 0.5
    for (let i = -S; i < S * 2; i += step) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + S * 0.6, S); ctx.stroke()
    }
    ctx.globalAlpha = 1
  }

  else if (theme.pattern === 'crack') {
    // Cracked volcanic rock — dark blocks with glowing fissures
    let y = 0
    while (y < S) {
      const bh = 24 + ~~(rand() * 18)
      let x = 0
      while (x < S) {
        const bw = 30 + ~~(rand() * 36)
        ctx.fillStyle = tint(0.7 + rand() * 0.25)
        ctx.fillRect(x + 2, y + 2, bw - 4, bh - 4)
        x += bw
      }
      y += bh
    }
    // glowing cracks
    ctx.strokeStyle = `rgba(255,${~~(80 + rand()*80)},0,0.85)`
    ctx.lineWidth = 1.5
    for (let n = 0; n < 14; n++) {
      let cx = rand() * S, cy = rand() * S, a = rand() * Math.PI * 2
      ctx.beginPath(); ctx.moveTo(cx, cy)
      for (let s = 0; s < 4; s++) {
        cx += Math.cos(a) * (14 + rand() * 16)
        cy += Math.sin(a) * (14 + rand() * 16)
        a += (rand() - 0.5) * 1.4
        ctx.lineTo(cx, cy)
      }
      ctx.stroke()
    }
  }

  else if (theme.pattern === 'ice') {
    // Pale icy sheen
    ctx.fillStyle = tint(1.25); ctx.globalAlpha = 0.35; ctx.fillRect(0, 0, S, S); ctx.globalAlpha = 1
    ctx.strokeStyle = tint(1.7); ctx.lineWidth = 1; ctx.globalAlpha = 0.6
    for (let n = 0; n < 18; n++) {
      let cx = rand() * S, cy = rand() * S, a = rand() * Math.PI * 2
      ctx.beginPath(); ctx.moveTo(cx, cy)
      for (let s = 0; s < 5; s++) {
        cx += Math.cos(a) * (12 + rand() * 20)
        cy += Math.sin(a) * (12 + rand() * 20)
        a += (rand() - 0.5) * 1.6
        ctx.lineTo(cx, cy)
      }
      ctx.stroke()
    }
    ctx.globalAlpha = 1
    // faint horizontal banding
    for (let row = 0; row < 6; row++) {
      ctx.fillStyle = tint(row % 2 === 0 ? 1.1 : 0.88)
      ctx.globalAlpha = 0.15
      ctx.fillRect(0, row * (S / 6), S, S / 6)
    }
    ctx.globalAlpha = 1
  }

  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(1.5, 1)
  tex.generateMipmaps = true
  tex.minFilter = THREE.LinearMipmapLinearFilter
  tex.magFilter = THREE.LinearFilter
  tex.anisotropy = 16
  return tex
}
