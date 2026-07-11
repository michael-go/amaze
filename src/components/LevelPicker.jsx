import { useEffect, useMemo, useRef } from "react";
import {
  generateMaze,
  generateShapeMask,
  addLoops,
  chooseStartExit,
  setRng,
} from "../lib/maze";
import { getLevelConfig, defaultMazeSeed } from "../lib/levelConfig";
import { createRng } from "../lib/rng";
import { levelTheme } from "../lib/wallTexture";
import { useI18n } from "../lib/i18n";

const P = 116; // preview size on screen (drawn at 2x for crisp lines)

// Rebuild a level's maze exactly like newGame does — same default seed, so
// the preview matches what the player will actually get.
function buildLevel(level) {
  const rng = createRng(defaultMazeSeed(level));
  setRng(rng);
  const config = getLevelConfig(level, rng);
  const mask = generateShapeMask(config.width, config.height, config.shape);
  const cells = generateMaze(config.width, config.height, {
    algorithm: config.algorithm,
    mask,
  });
  addLoops(cells, config.loopFactor, mask);
  const { start, exit } = chooseStartExit(
    cells,
    mask,
    config.width,
    config.height,
  );
  setRng(Math.random); // restore the runtime RNG
  return {
    cells,
    mask,
    width: config.width,
    height: config.height,
    start,
    exit,
  };
}

function LevelPreview({ level }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const S = P * 2;
    const g = buildLevel(level);
    const theme = levelTheme(level);
    const ctx = canvas.getContext("2d");
    const scale = (S - 14) / Math.max(g.width, g.height);
    const ox = (S - g.width * scale) / 2;
    const oy = (S - g.height * scale) / 2;
    ctx.clearRect(0, 0, S, S);
    // corridor floor (shows the maze shape)
    ctx.fillStyle = "rgba(255,255,255,0.07)";
    for (let y = 0; y < g.height; y++) {
      for (let x = 0; x < g.width; x++) {
        if (g.mask && !g.mask[y][x]) continue;
        ctx.fillRect(ox + x * scale, oy + y * scale, scale + 0.5, scale + 0.5);
      }
    }
    // walls in the level theme's color — each preview hints at its world
    ctx.strokeStyle = theme.wall;
    ctx.lineWidth = Math.max(1.5, scale * 0.2);
    ctx.lineCap = "round";
    ctx.beginPath();
    for (let y = 0; y < g.height; y++) {
      for (let x = 0; x < g.width; x++) {
        if (g.mask && !g.mask[y][x]) continue;
        const w = g.cells[y][x].walls;
        const px = ox + x * scale,
          py = oy + y * scale;
        if (w.top) {
          ctx.moveTo(px, py);
          ctx.lineTo(px + scale, py);
        }
        if (w.left) {
          ctx.moveTo(px, py);
          ctx.lineTo(px, py + scale);
        }
        if (w.right) {
          ctx.moveTo(px + scale, py);
          ctx.lineTo(px + scale, py + scale);
        }
        if (w.bottom) {
          ctx.moveTo(px, py + scale);
          ctx.lineTo(px + scale, py + scale);
        }
      }
    }
    ctx.stroke();
    // start (orange) and treasure (gold)
    const dot = (cx, cy, color) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(
        ox + (cx + 0.5) * scale,
        oy + (cy + 0.5) * scale,
        Math.max(3, scale * 0.32),
        0,
        Math.PI * 2,
      );
      ctx.fill();
    };
    dot(g.start.x, g.start.y, "#ff6b35");
    dot(g.exit.x, g.exit.y, "#ffd700");
  }, [level]);
  return (
    <canvas
      ref={ref}
      width={P * 2}
      height={P * 2}
      style={{ width: P, height: P, display: "block" }}
    />
  );
}

export default function LevelPicker({ maxLevel, lastPlayed, onPick, onClose }) {
  const { t } = useI18n();

  useEffect(() => {
    const onKey = (e) => {
      if (e.code === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const levels = useMemo(
    () => Array.from({ length: maxLevel + 1 }, (_, i) => i),
    [maxLevel],
  );

  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div
        className="glass"
        style={{ ...styles.box, fontFamily: t.font, direction: t.dir }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={styles.title}>{t.pickLevel}</h2>
        <div style={styles.grid}>
          {levels.map((lvl) => {
            const isNext = lvl === maxLevel && maxLevel > 0;
            const isLast = lvl === lastPlayed && !isNext;
            return (
              <button
                key={lvl}
                className="level-card"
                style={isNext ? styles.cardNext : undefined}
                onClick={() => onPick(lvl)}
              >
                <LevelPreview level={lvl} />
                {/* Badges float over the preview so every card stays the
                    same size and the grid keeps its rhythm */}
                {isNext && (
                  <span style={{ ...styles.badge, ...styles.badgeNew }}>
                    {t.badgeNew}
                  </span>
                )}
                {isLast && (
                  <span style={{ ...styles.badge, ...styles.badgeLast }}>
                    {t.badgeLast}
                  </span>
                )}
                <div style={styles.cardLabel}>
                  {t.level} {lvl + 1}
                </div>
              </button>
            );
          })}
        </div>
        <button
          className="btn btn-ghost"
          style={styles.closeBtn}
          onClick={onClose}
        >
          {t.cancel}
        </button>
      </div>
    </div>
  );
}

const styles = {
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(4, 6, 14, 0.6)",
    backdropFilter: "blur(7px)",
    WebkitBackdropFilter: "blur(7px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 300,
  },
  box: {
    padding: "26px 30px",
    textAlign: "center",
    maxWidth: 640,
    maxHeight: "88vh",
    display: "flex",
    flexDirection: "column",
    animation: "fade-up 0.3s ease both",
  },
  title: {
    color: "var(--text)",
    fontSize: 24,
    fontWeight: 800,
    letterSpacing: 2,
    marginBottom: 18,
    marginTop: 0,
  },
  grid: {
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "center",
    overflowY: "auto",
    padding: "4px 2px",
    marginBottom: 18,
  },
  cardNext: {
    borderColor: "var(--accent)",
    boxShadow: "0 0 16px rgba(255,107,53,0.35)",
  },
  cardLabel: {
    color: "var(--text)",
    fontSize: 14,
    fontWeight: 800,
    marginTop: 6,
    letterSpacing: 0.5,
  },
  badge: {
    position: "absolute",
    top: 12,
    left: "50%",
    transform: "translateX(-50%)",
    whiteSpace: "nowrap",
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: 0.5,
    padding: "3px 10px",
    borderRadius: 999,
    background: "rgba(8, 10, 18, 0.82)",
  },
  badgeNew: {
    color: "var(--accent-soft)",
    border: "1px solid rgba(255, 138, 80, 0.5)",
  },
  badgeLast: {
    color: "var(--text-dim)",
    border: "1px solid rgba(255, 255, 255, 0.18)",
  },
  closeBtn: {
    alignSelf: "center",
    padding: "9px 26px",
    fontSize: 15,
  },
};
