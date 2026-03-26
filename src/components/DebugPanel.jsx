import { useControls, Leva, button } from "leva";
import { useEffect, useRef } from "react";

const isDebug = () => window.location.hash.includes("debug");

function DebugControls({ level, onJumpToLevel, onSpawnItem }) {
  const externalUpdate = useRef(false);

  const { Level } = useControls(
    {
      Level: { value: level + 1, min: 1, max: 100, step: 1 },
      Ghost: button(() => onSpawnItem?.("ghost")),
      Fly: button(() => onSpawnItem?.("fly")),
      Trail: button(() => onSpawnItem?.("trail")),
      "Steps Refill": button(() => onSpawnItem?.("steps")),
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

export default function DebugPanel({ level, onJumpToLevel, onSpawnItem }) {
  if (!isDebug()) return null;
  return (
    <DebugControls
      level={level}
      onJumpToLevel={onJumpToLevel}
      onSpawnItem={onSpawnItem}
    />
  );
}
