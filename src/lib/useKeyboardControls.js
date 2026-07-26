import { useEffect, useRef } from "react";

export const TOUCH_CONTROL_EVENT = "amaze:touch-control";

export function useKeyboardControls() {
  const keys = useRef({
    forward: false,
    backward: false,
    turnLeft: false,
    turnRight: false,
    touchMove: 0,
    touchTurn: 0,
  });

  useEffect(() => {
    const down = (e) => {
      switch (e.code) {
        case "ArrowUp":
          keys.current.forward = true;
          break;
        case "ArrowDown":
          keys.current.backward = true;
          break;
        case "ArrowLeft":
          keys.current.turnLeft = true;
          break;
        case "ArrowRight":
          keys.current.turnRight = true;
          break;
      }
    };
    const up = (e) => {
      switch (e.code) {
        case "ArrowUp":
          keys.current.forward = false;
          break;
        case "ArrowDown":
          keys.current.backward = false;
          break;
        case "ArrowLeft":
          keys.current.turnLeft = false;
          break;
        case "ArrowRight":
          keys.current.turnRight = false;
          break;
      }
    };
    // If the window loses focus mid-keypress, the keyup never fires
    const reset = () => {
      keys.current.forward = false;
      keys.current.backward = false;
      keys.current.turnLeft = false;
      keys.current.turnRight = false;
      keys.current.touchMove = 0;
      keys.current.touchTurn = 0;
    };
    const touchControl = (e) => {
      keys.current.touchMove = Number.isFinite(e.detail?.move)
        ? Math.max(-1, Math.min(1, e.detail.move))
        : 0;
      keys.current.touchTurn = Number.isFinite(e.detail?.turn)
        ? Math.max(-1, Math.min(1, e.detail.turn))
        : 0;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener(TOUCH_CONTROL_EVENT, touchControl);
    window.addEventListener("blur", reset);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener(TOUCH_CONTROL_EVENT, touchControl);
      window.removeEventListener("blur", reset);
    };
  }, []);

  return keys.current;
}
