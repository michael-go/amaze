import { useControls, Leva } from "leva";

const isDebug = () => window.location.hash.includes("debug");

export default function DebugPanel({ level, onJumpToLevel }) {
  const show = isDebug();

  const { Level } = useControls(
    {
      Level: { value: level + 1, min: 1, max: 20, step: 1 },
    },
    [level],
  );

  if (Level !== level + 1) {
    onJumpToLevel(Level - 1);
  }

  return <Leva hidden={!show} collapsed={false} />;
}
