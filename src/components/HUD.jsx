import { useState, useEffect, useRef, useMemo } from "react";
import { useI18n } from "../lib/i18n";
import { CELL_SIZE } from "../lib/maze";

export default function HUD({
  level,
  topView,
  onToggleView,
  won,
  stepsRemaining,
  maxSteps,
  activePower,
  powerSecs,
  trailActive,
  mapActive,
  game,
  playerInfoRef,
}) {
  const { t } = useI18n();
  const pct = maxSteps > 0 ? Math.max(0, stepsRemaining / maxSteps) : 1;

  // Brief flash when steps are refilled by magic item
  const [showStepsFlash, setShowStepsFlash] = useState(false);
  const prevSteps = useRef(stepsRemaining);
  const prevLevel = useRef(level);
  useEffect(() => {
    // Skip flash on level change — steps reset is not a refill
    if (prevLevel.current !== level) {
      prevLevel.current = level;
      prevSteps.current = stepsRemaining;
      return;
    }
    if (
      stepsRemaining === maxSteps &&
      prevSteps.current < maxSteps &&
      prevSteps.current > 0 &&
      maxSteps > 0
    ) {
      setShowStepsFlash(true);
      setTimeout(() => setShowStepsFlash(false), 2000);
    }
    prevSteps.current = stepsRemaining;
  }, [stepsRemaining, maxSteps, level]);

  // Brief flash when trail is activated
  const [showTrailFlash, setShowTrailFlash] = useState(false);
  useEffect(() => {
    if (trailActive) {
      setShowTrailFlash(true);
      const id = setTimeout(() => setShowTrailFlash(false), 2000);
      return () => clearTimeout(id);
    }
    setShowTrailFlash(false);
  }, [trailActive]);

  // Brief flash when the map is unlocked
  const [showMapFlash, setShowMapFlash] = useState(false);
  useEffect(() => {
    if (mapActive) {
      setShowMapFlash(true);
      const id = setTimeout(() => setShowMapFlash(false), 2000);
      return () => clearTimeout(id);
    }
    setShowMapFlash(false);
  }, [mapActive]);

  const barColor =
    pct > 0.6
      ? "#44bb44"
      : pct > 0.35
        ? "#ffaa00"
        : pct > 0.15
          ? "#ff6b35"
          : "#ff2222";

  return (
    <div style={{ ...styles.hud, direction: t.dir, fontFamily: t.font }}>
      <div style={styles.topRow}>
        {trailActive && (
          <div className="chip" style={styles.trailBox}>
            <span style={{ fontSize: 20 }}>🐾</span>
          </div>
        )}
        <div className="chip" style={styles.left}>
          <span style={{ ...styles.levelBadge, fontSize: 20 }}>
            {t.level} {level}
          </span>
          {!won && (
            <div style={styles.stepsBar}>
              <div style={{ ...styles.stepsLabel, fontSize: 14 }}>
                {t.steps}
              </div>
              <div style={styles.stepsTrack}>
                <div
                  style={{
                    ...styles.stepsFill,
                    width: `${pct * 100}%`,
                    background: barColor,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
      <div style={styles.right}>
        <button
          className="btn btn-ghost"
          style={styles.viewBtn}
          onClick={onToggleView}
        >
          {topView ? t.firstPerson : t.topView}
        </button>
        {/* Minimap lives under the view button; the top view IS the map */}
        {mapActive && !topView && !won && (
          <MiniMap game={game} playerInfoRef={playerInfoRef} />
        )}
      </div>
      <div style={styles.controls}>{t.controls}</div>
      {activePower && powerSecs > 0 && (
        <PowerBanner activePower={activePower} powerSecs={powerSecs} t={t} />
      )}
      {showTrailFlash && (
        <PowerBanner activePower="trail" powerSecs={null} t={t} />
      )}
      {showMapFlash && <PowerBanner activePower="map" powerSecs={null} t={t} />}
      {showStepsFlash && (
        <PowerBanner activePower="steps" powerSecs={null} t={t} />
      )}
    </div>
  );
}

// Always-on minimap unlocked by the "map" magic item: maze walls, the
// treasure, and a live player arrow. Walls are pre-rendered once per level;
// each frame only blits that image and draws the two markers.
const MAP_CSS = 148; // on-screen size
const MAP_PX = 296; // canvas resolution (2x for crisp lines)

function MiniMap({ game, playerInfoRef }) {
  const canvasRef = useRef(null);

  // px per world unit + centering offsets for non-square mazes
  const view = useMemo(() => {
    const worldW = game.width * CELL_SIZE;
    const worldH = game.height * CELL_SIZE;
    const scale = (MAP_PX - 12) / Math.max(worldW, worldH);
    return {
      scale,
      ox: (MAP_PX - worldW * scale) / 2,
      oy: (MAP_PX - worldH * scale) / 2,
    };
  }, [game]);

  const wallsImage = useMemo(() => {
    const { scale, ox, oy } = view;
    const c = document.createElement("canvas");
    c.width = c.height = MAP_PX;
    const ctx = c.getContext("2d");
    const cp = CELL_SIZE * scale; // cell size in px
    // corridor floor (also outlines the maze shape)
    ctx.fillStyle = "rgba(255,255,255,0.14)";
    for (let y = 0; y < game.height; y++) {
      for (let x = 0; x < game.width; x++) {
        if (game.mask && !game.mask[y][x]) continue;
        ctx.fillRect(ox + x * cp, oy + y * cp, cp + 0.5, cp + 0.5);
      }
    }
    // walls — draw all four sides per cell (shared walls just overdraw)
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.beginPath();
    for (let y = 0; y < game.height; y++) {
      for (let x = 0; x < game.width; x++) {
        if (game.mask && !game.mask[y][x]) continue;
        const w = game.cells[y][x].walls;
        const px = ox + x * cp,
          py = oy + y * cp;
        if (w.top) {
          ctx.moveTo(px, py);
          ctx.lineTo(px + cp, py);
        }
        if (w.left) {
          ctx.moveTo(px, py);
          ctx.lineTo(px, py + cp);
        }
        if (w.right) {
          ctx.moveTo(px + cp, py);
          ctx.lineTo(px + cp, py + cp);
        }
        if (w.bottom) {
          ctx.moveTo(px, py + cp);
          ctx.lineTo(px + cp, py + cp);
        }
      }
    }
    ctx.stroke();
    return c;
  }, [game, view]);

  useEffect(() => {
    const { scale, ox, oy } = view;
    let raf;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, MAP_PX, MAP_PX);
      ctx.drawImage(wallsImage, 0, 0);
      // treasure
      const ex = ox + game.exitPos[0] * scale;
      const ey = oy + game.exitPos[2] * scale;
      ctx.fillStyle = "#ffd700";
      ctx.beginPath();
      ctx.arc(ex, ey, 5, 0, Math.PI * 2);
      ctx.fill();
      // player arrow
      const info = playerInfoRef?.current;
      if (info) {
        const px = ox + info.pos.x * scale;
        const py = oy + info.pos.z * scale;
        // world forward = (-sin yaw, -cos yaw) in (x, z) = canvas (x, y)
        const a = Math.atan2(-Math.cos(info.yaw), -Math.sin(info.yaw));
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(a);
        ctx.fillStyle = "#ff6b35";
        ctx.strokeStyle = "rgba(0,0,0,0.6)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(8, 0);
        ctx.lineTo(-5, 5.5);
        ctx.lineTo(-5, -5.5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [game, view, wallsImage, playerInfoRef]);

  return (
    <div className="chip" style={styles.miniMap}>
      <canvas
        ref={canvasRef}
        width={MAP_PX}
        height={MAP_PX}
        style={{ width: MAP_CSS, height: MAP_CSS, display: "block" }}
      />
    </div>
  );
}

function PowerBanner({ activePower, powerSecs, t }) {
  const colors = {
    ghost: { color: "#44aaff", glow: "rgba(68,170,255,0.4)" },
    fly: { color: "#ffcc00", glow: "rgba(255,204,0,0.4)" },
    trail: { color: "#44ee88", glow: "rgba(68,238,136,0.4)" },
    steps: { color: "#ff44aa", glow: "rgba(255,68,170,0.4)" },
    map: { color: "#c98cff", glow: "rgba(201,140,255,0.4)" },
  };
  const { color, glow } = colors[activePower] || colors.ghost;
  const labels = {
    ghost: t.powerGhost,
    fly: t.powerFly,
    trail: t.powerTrail,
    steps: t.powerSteps,
    map: t.powerMap,
  };
  const label = labels[activePower] || "";

  return (
    <div
      className="chip"
      style={{
        position: "absolute",
        top: "12%",
        left: "50%",
        transform: "translateX(-50%)",
        textAlign: "center",
        animation: "power-pulse 1s ease-in-out infinite",
        padding: "14px 30px",
        borderRadius: 18,
      }}
    >
      <div
        style={{
          fontSize: "clamp(22px, 4vw, 36px)",
          fontFamily: "inherit",
          fontWeight: "bold",
          color,
          textShadow: `0 0 20px ${glow}, 0 0 40px ${glow}`,
          letterSpacing: 3,
        }}
      >
        {label}
      </div>
      {powerSecs != null && (
        <div
          style={{
            fontSize: "clamp(36px, 7vw, 56px)",
            fontWeight: 900,
            color,
            textShadow: `0 0 30px ${glow}`,
            marginTop: 4,
          }}
        >
          {powerSecs}
        </div>
      )}
      <style>{`
        @keyframes power-pulse {
          0%, 100% { opacity: 0.85; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}

const styles = {
  hud: {
    position: "fixed",
    inset: 0,
    pointerEvents: "none",
    zIndex: 10,
  },
  topRow: {
    position: "absolute",
    top: 16,
    left: 20,
    display: "flex",
    alignItems: "flex-start",
    gap: 8,
  },
  trailBox: {
    padding: "10px 12px",
    display: "flex",
    alignItems: "center",
  },
  left: {
    padding: "12px 18px",
  },
  right: {
    position: "absolute",
    top: 16,
    right: 20,
    pointerEvents: "all",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 10,
  },
  miniMap: {
    padding: 6,
    borderRadius: 16,
  },
  levelBadge: {
    color: "var(--accent-soft)",
    fontFamily: "inherit",
    fontSize: 18,
    fontWeight: 800,
    letterSpacing: 2,
    textShadow: "0 0 14px rgba(255,107,53,0.45)",
  },
  viewBtn: {
    background: "rgba(10, 12, 22, 0.66)",
    padding: "10px 18px",
    fontFamily: "inherit",
    fontSize: 14,
    borderRadius: 13,
    letterSpacing: 0.5,
    fontWeight: 800,
  },
  stepsBar: {
    marginTop: 10,
  },
  stepsLabel: {
    color: "var(--text-dim)",
    fontFamily: "inherit",
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: 1.5,
    marginBottom: 5,
  },
  stepsTrack: {
    width: 160,
    height: 10,
    background: "rgba(255,255,255,0.12)",
    borderRadius: 999,
    overflow: "hidden",
    boxShadow: "inset 0 1px 3px rgba(0,0,0,0.45)",
  },
  stepsFill: {
    height: "100%",
    borderRadius: 999,
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35)",
    transition: "width 0.3s ease, background 0.3s ease",
  },
  controls: {
    position: "absolute",
    bottom: 16,
    left: "50%",
    transform: "translateX(-50%)",
    color: "rgba(255,255,255,0.38)",
    fontFamily: "inherit",
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 1,
    whiteSpace: "nowrap",
  },
};
