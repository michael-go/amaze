import { useCallback, useEffect, useRef, useState } from "react";
import { TOUCH_CONTROL_EVENT } from "../lib/useKeyboardControls";

const isTouchDevice = () =>
  typeof window !== "undefined" &&
  ("ontouchstart" in window || navigator.maxTouchPoints > 0);

const HIT_SIZE = 156;
const BASE_SIZE = 120;
const KNOB_SIZE = 48;
const MAX_TRAVEL = (BASE_SIZE - KNOB_SIZE) / 2;
const MOVE_DEADZONE = 0.16;
const TURN_DEADZONE = 0.28;

function applyDeadzone(value, deadzone) {
  const magnitude = Math.abs(value);
  if (magnitude <= deadzone) return 0;
  const scaled = (magnitude - deadzone) / (1 - deadzone);
  return Math.sign(value) * Math.min(1, scaled);
}

function boostMovement(value) {
  if (value === 0) return 0;
  return Math.sign(value) * (0.75 + Math.abs(value) * 0.25);
}

function sendControl(move, turn) {
  window.dispatchEvent(
    new CustomEvent(TOUCH_CONTROL_EVENT, {
      detail: { move, turn },
    }),
  );
}

export default function TouchControls({ enabled = true }) {
  // Hooks live in TouchJoystick so this device check can safely return early.
  if (!isTouchDevice() || !enabled) return null;
  return <TouchJoystick />;
}

function TouchJoystick() {
  const pointerRef = useRef(null);
  const lastControlRef = useRef({ move: 0, turn: 0 });
  const [knobOffset, setKnobOffset] = useState({ x: 0, y: 0 });
  const [control, setControl] = useState({ move: 0, turn: 0 });
  const [active, setActive] = useState(false);

  const publishControl = useCallback((move, turn) => {
    const last = lastControlRef.current;
    if (
      Math.abs(last.move - move) < 0.01 &&
      Math.abs(last.turn - turn) < 0.01
    ) {
      return;
    }
    const next = { move, turn };
    lastControlRef.current = next;
    setControl(next);
    sendControl(move, turn);
  }, []);

  const reset = useCallback(() => {
    pointerRef.current = null;
    setActive(false);
    setKnobOffset({ x: 0, y: 0 });
    publishControl(0, 0);
  }, [publishControl]);

  // Never leave the character moving if this control disappears under a modal,
  // a view change, or navigation.
  useEffect(() => {
    const stop = () => reset();
    window.addEventListener("blur", stop);
    window.addEventListener("pagehide", stop);
    return () => {
      window.removeEventListener("blur", stop);
      window.removeEventListener("pagehide", stop);
      sendControl(0, 0);
    };
  }, [reset]);

  const updateFromPointer = useCallback(
    (clientX, clientY) => {
      const origin = pointerRef.current;
      if (!origin) return;

      let dx = clientX - origin.x;
      let dy = clientY - origin.y;
      const distance = Math.hypot(dx, dy);
      if (distance > MAX_TRAVEL) {
        dx = (dx / distance) * MAX_TRAVEL;
        dy = (dy / distance) * MAX_TRAVEL;
      }
      setKnobOffset({ x: dx, y: dy });

      // Movement is proportional instead of instantly jumping to full speed.
      // A wider horizontal dead zone prevents small thumb drift from steering.
      // Walking should feel immediate, like the original button control:
      // once engaged it starts at a brisk pace, then reaches full speed.
      const move = boostMovement(
        -applyDeadzone(dy / MAX_TRAVEL, MOVE_DEADZONE),
      );
      const turn = -applyDeadzone(dx / MAX_TRAVEL, TURN_DEADZONE);
      publishControl(move, turn);
    },
    [publishControl],
  );

  const onPointerDown = useCallback(
    (event) => {
      if (pointerRef.current) return;
      event.preventDefault();
      const rect = event.currentTarget.getBoundingClientRect();
      pointerRef.current = {
        id: event.pointerId,
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      };
      event.currentTarget.setPointerCapture?.(event.pointerId);
      setActive(true);
      updateFromPointer(event.clientX, event.clientY);
    },
    [updateFromPointer],
  );

  const onPointerMove = useCallback(
    (event) => {
      if (pointerRef.current?.id !== event.pointerId) return;
      event.preventDefault();
      updateFromPointer(event.clientX, event.clientY);
    },
    [updateFromPointer],
  );

  const onPointerEnd = useCallback(
    (event) => {
      if (pointerRef.current?.id !== event.pointerId) return;
      event.preventDefault();
      reset();
    },
    [reset],
  );

  const upStrength = Math.max(0, control.move);
  const downStrength = Math.max(0, -control.move);
  const leftStrength = Math.max(0, control.turn);
  const rightStrength = Math.max(0, -control.turn);

  const arrowStyle = (strength) => ({
    ...styles.arrow,
    opacity: strength > 0 ? 0.65 + strength * 0.35 : 0.3,
    color: strength > 0 ? "#fff4df" : "rgba(255,255,255,0.72)",
    textShadow: strength > 0 ? "0 0 12px rgba(255,126,60,0.95)" : "none",
    transform: `scale(${strength > 0 ? 1.08 : 1})`,
  });

  return (
    <div
      aria-label="Movement joystick"
      data-testid="touch-joystick"
      role="application"
      style={styles.positioner}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onContextMenu={(event) => event.preventDefault()}
    >
      <div
        style={{
          ...styles.base,
          borderColor: active
            ? "rgba(255,167,112,0.58)"
            : "rgba(255,255,255,0.24)",
          background: active ? "rgba(19,20,31,0.66)" : "rgba(15,16,27,0.52)",
        }}
      >
        <span style={{ ...arrowStyle(upStrength), ...styles.up }}>▲</span>
        <span style={{ ...arrowStyle(downStrength), ...styles.down }}>▼</span>
        <span style={{ ...arrowStyle(leftStrength), ...styles.left }}>◀</span>
        <span style={{ ...arrowStyle(rightStrength), ...styles.right }}>▶</span>
        <div
          style={{
            ...styles.knob,
            background: active
              ? "linear-gradient(145deg, #ffad72, #f35d2c)"
              : "linear-gradient(145deg, #f5f6fa, #aeb4c3)",
            boxShadow: active
              ? "0 5px 18px rgba(255,91,39,0.5), inset 0 1px 1px rgba(255,255,255,0.5)"
              : "0 5px 16px rgba(0,0,0,0.45), inset 0 1px 1px rgba(255,255,255,0.65)",
            transform: `translate(calc(-50% + ${knobOffset.x}px), calc(-50% + ${knobOffset.y}px))`,
            transition: active ? "none" : "transform 140ms ease-out",
          }}
        >
          <div style={styles.knobGrip} />
        </div>
      </div>
    </div>
  );
}

const styles = {
  positioner: {
    position: "fixed",
    right: "max(0px, env(safe-area-inset-right))",
    bottom: "max(0px, env(safe-area-inset-bottom))",
    zIndex: 210,
    width: HIT_SIZE,
    height: HIT_SIZE,
    touchAction: "none",
    userSelect: "none",
    WebkitUserSelect: "none",
    WebkitTouchCallout: "none",
  },
  base: {
    width: BASE_SIZE,
    height: BASE_SIZE,
    borderRadius: "50%",
    border: "2px solid",
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    touchAction: "none",
    boxShadow:
      "0 9px 28px rgba(0,0,0,0.35), inset 0 0 30px rgba(255,255,255,0.035)",
    transition: "background 120ms ease, border-color 120ms ease",
    overflow: "hidden",
  },
  knob: {
    width: KNOB_SIZE,
    height: KNOB_SIZE,
    borderRadius: "50%",
    border: "2px solid rgba(255,255,255,0.58)",
    position: "absolute",
    top: "50%",
    left: "50%",
    pointerEvents: "none",
    display: "grid",
    placeItems: "center",
  },
  knobGrip: {
    width: 17,
    height: 17,
    borderRadius: "50%",
    border: "2px solid rgba(30,31,42,0.28)",
  },
  arrow: {
    position: "absolute",
    fontSize: 13,
    lineHeight: 1,
    pointerEvents: "none",
    transition: "opacity 100ms ease, color 100ms ease, transform 100ms ease",
  },
  up: { top: 7, left: "50%", marginLeft: -6.5 },
  down: { bottom: 7, left: "50%", marginLeft: -6.5 },
  left: { left: 7, top: "50%", marginTop: -6.5 },
  right: { right: 7, top: "50%", marginTop: -6.5 },
};
