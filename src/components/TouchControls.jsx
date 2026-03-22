import { useCallback, useRef, useState } from "react";

const isTouchDevice = () =>
  typeof window !== "undefined" &&
  ("ontouchstart" in window || navigator.maxTouchPoints > 0);

function fireKey(code, type) {
  window.dispatchEvent(new KeyboardEvent(type, { code, bubbles: true }));
}

const RADIUS = 60;
const KNOB = 40;
const DEADZONE = 0.15;
const TURN_DEADZONE = 0.4;

export default function TouchControls() {
  if (!isTouchDevice()) return null;

  const originRef = useRef(null);
  const activeKeys = useRef({
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
  });
  const [knobOffset, setKnobOffset] = useState({ x: 0, y: 0 });
  const [active, setActive] = useState(false);

  const setKey = useCallback((code, pressed) => {
    if (activeKeys.current[code] !== pressed) {
      activeKeys.current[code] = pressed;
      fireKey(code, pressed ? "keydown" : "keyup");
    }
  }, []);

  const releaseAll = useCallback(() => {
    for (const code of Object.keys(activeKeys.current)) {
      setKey(code, false);
    }
  }, [setKey]);

  const updateFromDelta = useCallback(
    (dx, dy) => {
      const dist = Math.sqrt(dx * dx + dy * dy);
      const maxDist = RADIUS - KNOB / 2;
      // Clamp to circle
      if (dist > maxDist) {
        dx = (dx / dist) * maxDist;
        dy = (dy / dist) * maxDist;
      }
      setKnobOffset({ x: dx, y: dy });

      const nx = dx / maxDist;
      const ny = dy / maxDist;

      setKey("ArrowUp", ny < -DEADZONE);
      setKey("ArrowDown", ny > DEADZONE);
      setKey("ArrowLeft", nx < -TURN_DEADZONE);
      setKey("ArrowRight", nx > TURN_DEADZONE);
    },
    [setKey],
  );

  const onTouchStart = useCallback(
    (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const rect = e.currentTarget.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      originRef.current = { cx, cy, id: touch.identifier };
      setActive(true);
      updateFromDelta(touch.clientX - cx, touch.clientY - cy);
    },
    [updateFromDelta],
  );

  const onTouchMove = useCallback(
    (e) => {
      e.preventDefault();
      if (!originRef.current) return;
      for (const touch of e.changedTouches) {
        if (touch.identifier === originRef.current.id) {
          const { cx, cy } = originRef.current;
          updateFromDelta(touch.clientX - cx, touch.clientY - cy);
        }
      }
    },
    [updateFromDelta],
  );

  const onTouchEnd = useCallback(
    (e) => {
      e.preventDefault();
      if (!originRef.current) return;
      for (const touch of e.changedTouches) {
        if (touch.identifier === originRef.current.id) {
          originRef.current = null;
          setActive(false);
          setKnobOffset({ x: 0, y: 0 });
          releaseAll();
        }
      }
    },
    [releaseAll],
  );

  const size = RADIUS * 2;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 60,
        touchAction: "none",
      }}
    >
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.1)",
          border: "2px solid rgba(255,255,255,0.2)",
          position: "relative",
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
      >
        <div
          style={{
            width: KNOB,
            height: KNOB,
            borderRadius: "50%",
            background: active
              ? "rgba(255,255,255,0.45)"
              : "rgba(255,255,255,0.25)",
            border: "2px solid rgba(255,255,255,0.4)",
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: `translate(calc(-50% + ${knobOffset.x}px), calc(-50% + ${knobOffset.y}px))`,
            transition: active ? "none" : "transform 0.15s ease-out",
            pointerEvents: "none",
          }}
        />
      </div>
    </div>
  );
}
