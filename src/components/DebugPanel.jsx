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
  // Track which values we know about to distinguish external updates from user edits
  const knownRef = useRef({
    level: level + 1,
    mazeSeed: mazeSeed ?? 0,
    itemsSeed: itemsSeed ?? 0,
  });
  const suppressUntil = useRef(0);

  const [values, set] = useControls(
    () => ({
      Level: { value: level + 1, min: 1, max: 100, step: 1 },
      "Maze Seed": { value: mazeSeed ?? 0, min: 0, max: 99999, step: 1 },
      "Items Seed": { value: itemsSeed ?? 0, min: 0, max: 99999, step: 1 },
      Ghost: button(() => onSpawnItem?.("ghost")),
      Fly: button(() => onSpawnItem?.("fly")),
      Trail: button(() => onSpawnItem?.("trail")),
      "Steps Refill": button(() => onSpawnItem?.("steps")),
    }),
    [onSpawnItem],
  );

  // Sync external state changes INTO leva (without triggering callbacks)
  useEffect(() => {
    suppressUntil.current = Date.now() + 100;
    knownRef.current = {
      level: level + 1,
      mazeSeed: mazeSeed ?? 0,
      itemsSeed: itemsSeed ?? 0,
    };
    set({
      Level: level + 1,
      "Maze Seed": mazeSeed ?? 0,
      "Items Seed": itemsSeed ?? 0,
    });
  }, [level, mazeSeed, itemsSeed, set]);

  // React to user edits in leva → call external callbacks
  useEffect(() => {
    if (Date.now() < suppressUntil.current) return;
    const known = knownRef.current;

    if (values.Level !== known.level) {
      knownRef.current.level = values.Level;
      onJumpToLevel(values.Level - 1);
    } else if (
      values["Maze Seed"] !== known.mazeSeed ||
      values["Items Seed"] !== known.itemsSeed
    ) {
      knownRef.current.mazeSeed = values["Maze Seed"];
      knownRef.current.itemsSeed = values["Items Seed"];
      onSeedsChange?.(values["Maze Seed"], values["Items Seed"]);
    }
  }, [values.Level, values["Maze Seed"], values["Items Seed"]]);

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
