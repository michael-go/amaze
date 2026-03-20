import { useState, useCallback, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import MazeScene from './MazeScene'
import HUD from './HUD'
import { generateMaze, CELL_SIZE } from './maze'

const MAZE_SIZES = [
  { w: 6, h: 6 },
  { w: 8, h: 8 },
  { w: 10, h: 10 },
  { w: 12, h: 12 },
  { w: 15, h: 15 },
]

function newGame(level) {
  const size = MAZE_SIZES[Math.min(level, MAZE_SIZES.length - 1)]
  const cells = generateMaze(size.w, size.h)
  return {
    cells,
    width: size.w,
    height: size.h,
    startPos: [CELL_SIZE / 2, 0, CELL_SIZE / 2],
    exitPos: [(size.w - 1) * CELL_SIZE + CELL_SIZE / 2, 0, (size.h - 1) * CELL_SIZE + CELL_SIZE / 2],
  }
}

export default function App() {
  const [level, setLevel] = useState(0)
  const [game, setGame] = useState(() => newGame(0))
  const [topView, setTopView] = useState(false)
  const [won, setWon] = useState(false)
  const [screen, setScreen] = useState('title') // 'title' | 'countdown' | 'playing' | 'won'
  const [countdown, setCountdown] = useState(0)

  const beginLevel = useCallback((lvl, g) => {
    setLevel(lvl)
    setGame(g)
    setWon(false)
    setTopView(true)
    setCountdown(10)
    setScreen('countdown')
  }, [])

  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'KeyT' && screen === 'playing') {
        setTopView(v => !v)
      }
      if (e.code === 'Space' && screen === 'title') {
        beginLevel(0, newGame(0))
      }
      if (e.code === 'Space' && screen === 'countdown') {
        setTopView(false)
        setScreen('playing')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [screen, beginLevel])

  // Countdown timer
  useEffect(() => {
    if (screen !== 'countdown') return
    if (countdown <= 0) {
      setTopView(false)
      setScreen('playing')
      return
    }
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [screen, countdown])

  const startGame = useCallback(() => {
    beginLevel(0, newGame(0))
  }, [beginLevel])

  const nextLevel = useCallback(() => {
    const next = level + 1
    beginLevel(next, newGame(next))
  }, [level, beginLevel])

  const handleWin = useCallback(() => {
    setWon(true)
    setScreen('won')
    setTopView(true)
  }, [])

  if (screen === 'title') {
    return (
      <div style={styles.overlay}>
        <div style={styles.titleBox}>
          <h1 style={styles.title}>AMAZE</h1>
          <p style={styles.subtitle}>A 3D Maze Adventure</p>
          <div style={styles.instructions}>
            <p>WASD — Move &amp; strafe</p>
            <p>Arrow Left/Right — Turn</p>
            <p>Arrow Up/Down — Move</p>
            <p>Mouse — Look around (click to lock)</p>
            <p>T — Toggle top view</p>
            <p>Find the <span style={{ color: '#00ff88' }}>green exit</span> to advance!</p>
          </div>
          <button style={styles.btn} onClick={startGame}>START GAME</button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <Canvas
        shadows
        style={{ background: '#0a0a0a' }}
        camera={topView
          ? undefined
          : { fov: 75, near: 0.1, far: 500 }
        }
      >
        <MazeScene
          game={game}
          topView={topView}
          onWin={handleWin}
          won={won}
          frozen={screen === 'countdown'}
        />
      </Canvas>

      <HUD
        level={level + 1}
        topView={topView}
        onToggleView={() => setTopView(v => !v)}
        won={won}
      />

      {screen === 'countdown' && (
        <div style={styles.countdownOverlay}>
          <div style={styles.countdownText}>MEMORIZE THE MAZE!</div>
          <div style={styles.countdownNumber}>{countdown}</div>
          <div style={styles.skipHint}>SPACE to skip</div>
        </div>
      )}

      {screen === 'won' && (
        <div style={styles.overlay}>
          <div style={styles.titleBox}>
            <h1 style={{ ...styles.title, color: '#00ff88', fontSize: 'clamp(28px, 6vw, 64px)' }}>LEVEL {level + 1} COMPLETE!</h1>
            <p style={styles.subtitle}>You found the exit!</p>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 24 }}>
              <button style={styles.btn} onClick={nextLevel}>NEXT LEVEL</button>
              <button style={{ ...styles.btn, background: '#333' }} onClick={startGame}>RESTART</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  titleBox: {
    textAlign: 'center',
    color: '#fff',
    maxWidth: 520,
    padding: '40px 32px',
    border: '1px solid #333',
    borderRadius: 8,
    background: '#111',
  },
  title: {
    fontSize: 64,
    fontFamily: 'Courier New, monospace',
    letterSpacing: 12,
    color: '#ff6b35',
    marginBottom: 8,
  },
  subtitle: {
    color: '#888',
    fontSize: 16,
    marginBottom: 24,
  },
  instructions: {
    color: '#aaa',
    fontSize: 14,
    lineHeight: 2,
    marginBottom: 32,
    background: '#0a0a0a',
    padding: '16px 24px',
    borderRadius: 4,
  },
  countdownOverlay: {
    position: 'fixed',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
    zIndex: 50,
  },
  countdownText: {
    color: '#fff',
    fontFamily: 'Courier New, monospace',
    fontSize: 28,
    letterSpacing: 4,
    textShadow: '0 0 20px rgba(255,107,53,0.8)',
    marginBottom: 16,
  },
  countdownNumber: {
    color: '#ff6b35',
    fontFamily: 'Courier New, monospace',
    fontSize: 96,
    fontWeight: 'bold',
    textShadow: '0 0 40px rgba(255,107,53,0.6)',
  },
  skipHint: {
    color: 'rgba(255,255,255,0.4)',
    fontFamily: 'Courier New, monospace',
    fontSize: 14,
    marginTop: 20,
    letterSpacing: 2,
  },
  btn: {
    background: '#ff6b35',
    color: '#fff',
    border: 'none',
    padding: '12px 32px',
    fontSize: 18,
    fontFamily: 'Courier New, monospace',
    letterSpacing: 2,
    cursor: 'pointer',
    borderRadius: 4,
  },
}
