import { useState, useEffect } from "react";
import { useI18n } from "../lib/i18n";

export default function HUD({
  level,
  topView,
  onToggleView,
  won,
  stepsRemaining,
  maxSteps,
  activePower,
  powerEndTime,
  trailActive,
}) {
  const { t } = useI18n();
  const pct = maxSteps > 0 ? Math.max(0, stepsRemaining / maxSteps) : 1;

  // Power-up countdown
  const [powerSecs, setPowerSecs] = useState(0);
  useEffect(() => {
    if (!activePower || !powerEndTime) {
      setPowerSecs(0);
      return;
    }
    const tick = () => {
      const remaining = Math.max(
        0,
        Math.ceil((powerEndTime - Date.now()) / 1000),
      );
      setPowerSecs(remaining);
    };
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [activePower, powerEndTime]);

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

  const barColor =
    pct > 0.6
      ? "#44bb44"
      : pct > 0.35
        ? "#ff6b35"
        : pct > 0.15
          ? "#ffaa00"
          : "#ff2222";

  return (
    <div style={{ ...styles.hud, direction: t.dir, fontFamily: t.font }}>
      <div style={styles.left}>
        <span style={{ ...styles.levelBadge, fontSize: 20 }}>
          {t.level} {level}
        </span>
        {!won && (
          <div style={styles.stepsBar}>
            <div style={{ ...styles.stepsLabel, fontSize: 14 }}>{t.steps}</div>
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
        {trailActive && (
          <div
            style={{
              marginTop: 10,
              color: "#44ee88",
              fontFamily: "inherit",
              fontSize: 13,
              letterSpacing: 1,
            }}
          >
            {t.powerTrail}
          </div>
        )}
      </div>
      <div style={styles.right}>
        <button style={styles.viewBtn} onClick={onToggleView}>
          {topView ? t.firstPerson : t.topView}
        </button>
      </div>
      <div style={styles.controls}>{t.controls}</div>
      {activePower && powerSecs > 0 && (
        <PowerBanner activePower={activePower} powerSecs={powerSecs} t={t} />
      )}
      {showTrailFlash && (
        <PowerBanner activePower="trail" powerSecs={null} t={t} />
      )}
    </div>
  );
}

function PowerBanner({ activePower, powerSecs, t }) {
  const colors = {
    ghost: { color: "#44aaff", glow: "rgba(68,170,255,0.4)" },
    fly: { color: "#ffcc00", glow: "rgba(255,204,0,0.4)" },
    trail: { color: "#44ee88", glow: "rgba(68,238,136,0.4)" },
  };
  const { color, glow } = colors[activePower] || colors.ghost;
  const labels = { ghost: t.powerGhost, fly: t.powerFly, trail: t.powerTrail };
  const label = labels[activePower] || "";

  return (
    <div
      style={{
        position: "absolute",
        top: "12%",
        left: "50%",
        transform: "translateX(-50%)",
        textAlign: "center",
        animation: "power-pulse 1s ease-in-out infinite",
        background: "rgba(0,0,0,0.5)",
        padding: "12px 28px",
        borderRadius: 12,
        backdropFilter: "blur(4px)",
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
            fontFamily: "'Courier New', monospace",
            fontWeight: "bold",
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
  left: {
    position: "absolute",
    top: 16,
    left: 20,
    background: "rgba(0,0,0,0.45)",
    padding: "10px 16px",
    borderRadius: 8,
  },
  right: {
    position: "absolute",
    top: 16,
    right: 20,
    pointerEvents: "all",
  },
  levelBadge: {
    color: "#ff6b35",
    fontFamily: "inherit",
    fontSize: 18,
    fontWeight: "bold",
    letterSpacing: 3,
    textShadow: "0 0 10px #ff6b35",
  },
  viewBtn: {
    background: "rgba(0,0,0,0.45)",
    color: "#fff",
    border: "1px solid #444",
    padding: "8px 16px",
    fontFamily: "inherit",
    fontSize: 13,
    cursor: "pointer",
    borderRadius: 4,
    letterSpacing: 1,
  },
  stepsBar: {
    marginTop: 12,
  },
  stepsLabel: {
    color: "rgba(255,255,255,0.5)",
    fontFamily: "inherit",
    fontSize: 13,
    letterSpacing: 2,
    marginBottom: 4,
  },
  stepsTrack: {
    width: 160,
    height: 14,
    background: "rgba(255,255,255,0.1)",
    borderRadius: 5,
    overflow: "hidden",
  },
  stepsFill: {
    height: "100%",
    borderRadius: 5,
    transition: "width 0.3s ease, background 0.3s ease",
  },
  controls: {
    position: "absolute",
    bottom: 16,
    left: "50%",
    transform: "translateX(-50%)",
    color: "rgba(255,255,255,0.35)",
    fontFamily: "inherit",
    fontSize: 11,
    letterSpacing: 1,
    whiteSpace: "nowrap",
  },
};
