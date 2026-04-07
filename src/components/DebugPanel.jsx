import { useControls, Leva, button } from "leva";
import { useEffect, useRef } from "react";

const isDebug = () => window.location.hash.includes("debug");

function DebugControls({
  level,
  onJumpToLevel,
  onSpawnItem,
  mazeSeed,
  itemsSeed,
  onSeedsChange,
}) {
  const externalUpdate = useRef(false);

  const values = useControls(
    {
      Level: { value: level + 1, min: 1, max: 100, step: 1 },
      "Maze Seed": { value: mazeSeed, min: 0, max: 99999, step: 1 },
      "Items Seed": { value: itemsSeed, min: 0, max: 99999, step: 1 },
      Ghost: button(() => onSpawnItem?.("ghost")),
      Fly: button(() => onSpawnItem?.("fly")),
      Trail: button(() => onSpawnItem?.("trail")),
      "Steps Refill": button(() => onSpawnItem?.("steps")),
    },
    [level, mazeSeed, itemsSeed],
  );

  useEffect(() => {
    externalUpdate.current = true;
  }, [level, mazeSeed, itemsSeed]);

  useEffect(() => {
    if (externalUpdate.current) {
      externalUpdate.current = false;
      return;
    }
    if (values.Level !== level + 1) {
      onJumpToLevel(values.Level - 1);
    } else if (
      values["Maze Seed"] !== mazeSeed ||
      values["Items Seed"] !== itemsSeed
    ) {
      onSeedsChange?.(values["Maze Seed"], values["Items Seed"]);
    }
  }, [
    values.Level,
    values["Maze Seed"],
    values["Items Seed"],
    level,
    mazeSeed,
    itemsSeed,
    onJumpToLevel,
    onSeedsChange,
  ]);

  return <Leva collapsed={false} />;
}

export default function DebugPanel({
  level,
  onJumpToLevel,
  onSpawnItem,
  mazeSeed,
  itemsSeed,
  onSeedsChange,
}) {
  if (!isDebug()) return null;
  return (
    <DebugControls
      level={level}
      onJumpToLevel={onJumpToLevel}
      onSpawnItem={onSpawnItem}
      mazeSeed={mazeSeed}
      itemsSeed={itemsSeed}
      onSeedsChange={onSeedsChange}
    />
  );
}
