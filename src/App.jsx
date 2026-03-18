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
  const [screen, setScreen] = useState('title') // 'title' | 'playing' | 'won'

  useEffect(() => {
    const onKey = (e) => {
      if ((e.key === 't' || e.key === 'T') && screen === 'playing') {
        setTopView(v => !v)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [screen])

  const startGame = useCallback(() => {
    const g = newGame(0)
    setLevel(0)
    setGame(g)
    setWon(false)
    setTopView(false)
    setScreen('playing')
  }, [])

  const nextLevel = useCallback(() => {
    const next = level + 1
    setLevel(next)
    setGame(newGame(next))
    setWon(false)
    setTopView(false)
    setScreen('playing')
  }, [level])

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
        />
      </Canvas>

      <HUD
        level={level + 1}
        topView={topView}
        onToggleView={() => setTopView(v => !v)}
        won={won}
      />

      {screen === 'won' && (
        <div style={styles.overlay}>
          <div style={styles.titleBox}>
            <h1 style={{ ...styles.title, color: '#00ff88' }}>LEVEL {level + 1} COMPLETE!</h1>
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
    maxWidth: 420,
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
