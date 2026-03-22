import { useCallback, useRef } from "react";

const isTouchDevice = () =>
  typeof window !== "undefined" &&
  ("ontouchstart" in window || navigator.maxTouchPoints > 0);

function fireKey(code, type) {
  window.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true }));
}

function DPadButton({ code, label, style }) {
  const active = useRef(false);

  const onStart = useCallback(
    (e) => {
      e.preventDefault();
      if (!active.current) {
        active.current = true;
        fireKey(code, "keydown");
      }
    },
    [code],
  );

  const onEnd = useCallback(
    (e) => {
      e.preventDefault();
      if (active.current) {
        active.current = false;
        fireKey(code, "keyup");
      }
    },
    [code],
  );

  return (
    <button
      style={{ ...styles.btn, ...style }}
      onTouchStart={onStart}
      onTouchEnd={onEnd}
      onTouchCancel={onEnd}
      onMouseDown={onStart}
      onMouseUp={onEnd}
      onMouseLeave={onEnd}
    >
      {label}
    </button>
  );
}

export default function TouchControls() {
  if (!isTouchDevice()) return null;

  return (
    <div style={styles.container}>
      <div style={styles.dpad}>
        <div style={styles.row}>
          <DPadButton code="ArrowUp" label="↑" style={styles.up} />
        </div>
        <div style={styles.row}>
          <DPadButton code="ArrowLeft" label="←" style={styles.side} />
          <DPadButton code="ArrowDown" label="↓" style={styles.down} />
          <DPadButton code="ArrowRight" label="→" style={styles.side} />
        </div>
      </div>
    </div>
  );
}

const S = 56;

const styles = {
  container: {
    position: "fixed",
    bottom: 24,
    right: 24,
    zIndex: 60,
    pointerEvents: "all",
    touchAction: "none",
  },
  dpad: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: 4,
  },
  btn: {
    width: S,
    height: S,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(255,255,255,0.15)",
    border: "2px solid rgba(255,255,255,0.25)",
    borderRadius: 12,
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    cursor: "pointer",
    WebkitTapHighlightColor: "transparent",
    userSelect: "none",
  },
  up: {},
  down: {},
  side: {},
};
