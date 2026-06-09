import { useEffect, useRef } from "react";

export function useKeyboardControls() {
  const keys = useRef({
    forward: false,
    backward: false,
    turnLeft: false,
    turnRight: false,
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
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", reset);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", reset);
    };
  }, []);

  return keys.current;
}
