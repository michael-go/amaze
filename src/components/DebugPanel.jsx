import { useControls, Leva } from "leva";
import { useEffect, useRef } from "react";

const isDebug = () => window.location.hash.includes("debug");

function DebugControls({ level, onJumpToLevel }) {
  const externalUpdate = useRef(false);

  const { Level } = useControls(
    {
      Level: { value: level + 1, min: 1, max: 20, step: 1 },
    },
    [level],
  );

  useEffect(() => {
    externalUpdate.current = true;
  }, [level]);

  useEffect(() => {
    if (externalUpdate.current) {
      externalUpdate.current = false;
      return;
    }
    if (Level !== level + 1) {
      onJumpToLevel(Level - 1);
    }
  }, [Level, level, onJumpToLevel]);

  return <Leva collapsed={false} />;
}

export default function DebugPanel({ level, onJumpToLevel }) {
  if (!isDebug()) return null;
  return <DebugControls level={level} onJumpToLevel={onJumpToLevel} />;
}
