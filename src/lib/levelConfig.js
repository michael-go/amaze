// Per-level maze configuration for progressive difficulty

const SHAPES_MID = ["square", "L", "T"];
const SHAPES_HIGH = ["square", "L", "T", "U"];
const SHAPES_ALL = ["L", "T", "U", "diamond", "donut"];

export function getLevelConfig(level, rng) {
  const rand = rng || Math.random;

  // Size: grows from 6 to 25 (caps) — matches original 6,8,10,12,15 ramp then continues
  const size = Math.min(25, 6 + Math.floor(level * 2));

  // Algorithm: backtracking for early levels, mix later
  const algorithm =
    level < 4 ? "backtrack" : rand() < 0.5 ? "backtrack" : "prims";

  // Shape: square early, introduce shapes gradually
  let shape = "square";
  if (level >= 8) {
    shape = SHAPES_ALL[Math.floor(rand() * SHAPES_ALL.length)];
  } else if (level >= 6) {
    shape = SHAPES_HIGH[Math.floor(rand() * SHAPES_HIGH.length)];
  } else if (level >= 5) {
    shape = SHAPES_MID[Math.floor(rand() * SHAPES_MID.length)];
  }

  // Loops: peak mid-game then decrease (fewer loops = harder, more dead ends)
  let loopFactor;
  if (level < 2) loopFactor = 0;
  else if (level < 6) loopFactor = 0.03 + level * 0.01;
  else if (level < 10) loopFactor = 0.08 - (level - 6) * 0.01;
  else loopFactor = Math.max(0.01, 0.04 - (level - 10) * 0.005);

  // Step budget ratio: constant, ~45% of cells
  const stepBudgetRatio = 0.45;

  // Magic items: scale with level
  const magicItemCount = Math.min(2 + Math.floor(level / 2), 6);

  return {
    width: size,
    height: size,
    algorithm,
    shape,
    loopFactor,
    stepBudgetRatio,
    magicItemCount,
  };
}
