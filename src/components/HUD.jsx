import { useI18n } from "../lib/i18n";

export default function HUD({
  level,
  topView,
  onToggleView,
  won,
  stepsRemaining,
  maxSteps,
}) {
  const { t } = useI18n();
  const pct = maxSteps > 0 ? Math.max(0, stepsRemaining / maxSteps) : 1;
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
      </div>
      <div style={styles.right}>
        <button style={styles.viewBtn} onClick={onToggleView}>
          {topView ? t.firstPerson : t.topView}
        </button>
      </div>
      <div style={styles.controls}>{t.controls}</div>
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
