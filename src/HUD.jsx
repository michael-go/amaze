export default function HUD({ level, topView, onToggleView, won }) {
  return (
    <div style={styles.hud}>
      <div style={styles.left}>
        <span style={styles.levelBadge}>LEVEL {level}</span>
      </div>
      <div style={styles.right}>
        <button style={styles.viewBtn} onClick={onToggleView}>
          {topView ? '👁 FIRST PERSON' : '🗺 TOP VIEW'}
        </button>
      </div>
<div style={styles.controls}>
        WASD · MOVE &nbsp;|&nbsp; ←→ · TURN &nbsp;|&nbsp; MOUSE · LOOK &nbsp;|&nbsp; T · TOGGLE VIEW
      </div>
    </div>
  )
}

const styles = {
  hud: {
    position: 'fixed',
    inset: 0,
    pointerEvents: 'none',
    zIndex: 10,
  },
  left: {
    position: 'absolute',
    top: 16,
    left: 20,
  },
  right: {
    position: 'absolute',
    top: 16,
    right: 20,
    pointerEvents: 'all',
  },
  levelBadge: {
    color: '#ff6b35',
    fontFamily: 'Courier New, monospace',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 3,
    textShadow: '0 0 10px #ff6b35',
  },
  viewBtn: {
    background: 'rgba(0,0,0,0.6)',
    color: '#fff',
    border: '1px solid #444',
    padding: '8px 16px',
    fontFamily: 'Courier New, monospace',
    fontSize: 13,
    cursor: 'pointer',
    borderRadius: 4,
    letterSpacing: 1,
  },
  crosshair: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    color: 'rgba(255,255,255,0.6)',
    fontSize: 24,
    fontWeight: 'bold',
    lineHeight: 1,
  },
  controls: {
    position: 'absolute',
    bottom: 16,
    left: '50%',
    transform: 'translateX(-50%)',
    color: 'rgba(255,255,255,0.35)',
    fontFamily: 'Courier New, monospace',
    fontSize: 11,
    letterSpacing: 1,
    whiteSpace: 'nowrap',
  },
}
