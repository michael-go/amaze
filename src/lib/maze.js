// Maze generation with multiple algorithms, shape masks, and smart placement

// Magic item types
export const MAGIC_GHOST = "ghost"; // walk through walls
export const MAGIC_FLY = "fly"; // float above walls
export const MAGIC_TRAIL = "trail"; // show visited path on floor
export const MAGIC_STEPS = "steps"; // refill steps bar

export const CELL_SIZE = 4;
export const WALL_HEIGHT = 3;

// Module-level RNG — set before generation to control randomness
let _rng = Math.random;
export function setRng(fn) {
  _rng = fn;
}

// ---------------------------------------------------------------------------
// Shape mask generation
// ---------------------------------------------------------------------------

function rotateMask(mask, times) {
  let m = mask;
  for (let t = 0; t < times; t++) {
    const rows = m.length;
    const cols = m[0].length;
    const rotated = Array.from({ length: cols }, (_, x) =>
      Array.from({ length: rows }, (_, y) => m[rows - 1 - y][x]),
    );
    m = rotated;
  }
  return m;
}

function floodFillCount(mask) {
  const h = mask.length;
  const w = mask[0].length;
  // Find first valid cell
  let sx = -1,
    sy = -1;
  for (let y = 0; y < h && sy < 0; y++)
    for (let x = 0; x < w && sx < 0; x++)
      if (mask[y][x]) {
        sx = x;
        sy = y;
      }
  if (sy < 0) return 0;
  const visited = Array.from({ length: h }, () => new Uint8Array(w));
  const queue = [{ x: sx, y: sy }];
  visited[sy][sx] = 1;
  let count = 1;
  while (queue.length) {
    const { x, y } = queue.shift();
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = x + dx;
      const ny = y + dy;
      if (
        nx >= 0 &&
        nx < w &&
        ny >= 0 &&
        ny < h &&
        mask[ny][nx] &&
        !visited[ny][nx]
      ) {
        visited[ny][nx] = 1;
        count++;
        queue.push({ x: nx, y: ny });
      }
    }
  }
  return count;
}

export function generateShapeMask(width, height, shape) {
  if (shape === "square") return null; // null = all valid

  const make = (fn) => {
    const m = Array.from({ length: height }, (_, y) =>
      Array.from({ length: width }, (_, x) => fn(x, y)),
    );
    return m;
  };

  let mask;
  const rotation = Math.floor(_rng() * 4);

  switch (shape) {
    case "L": {
      // Remove one quadrant
      const cx = Math.floor(width * 0.45);
      const cy = Math.floor(height * 0.45);
      mask = make((x, y) => x < cx || y >= cy);
      break;
    }
    case "T": {
      const bandH = Math.max(3, Math.floor(height * 0.4));
      const bandL = Math.floor(
        (width - Math.max(3, Math.floor(width * 0.35))) / 2,
      );
      const bandR = width - bandL;
      mask = make((x, y) => y < bandH || (x >= bandL && x < bandR));
      break;
    }
    case "cross": {
      const hBand = Math.max(3, Math.floor(height * 0.35));
      const vBand = Math.max(3, Math.floor(width * 0.35));
      const hStart = Math.floor((height - hBand) / 2);
      const vStart = Math.floor((width - vBand) / 2);
      mask = make(
        (x, y) =>
          (y >= hStart && y < hStart + hBand) ||
          (x >= vStart && x < vStart + vBand),
      );
      break;
    }
    case "U": {
      const band = Math.max(3, Math.floor(width * 0.3));
      const topGap = Math.floor(height * 0.45);
      mask = make((x, y) => y >= topGap || x < band || x >= width - band);
      break;
    }
    case "diamond": {
      const cxf = (width - 1) / 2;
      const cyf = (height - 1) / 2;
      const r = Math.min(cxf, cyf);
      mask = make((x, y) => Math.abs(x - cxf) + Math.abs(y - cyf) <= r + 0.5);
      break;
    }
    case "donut": {
      const holeW = Math.max(2, Math.floor(width * 0.3));
      const holeH = Math.max(2, Math.floor(height * 0.3));
      const hx = Math.floor((width - holeW) / 2);
      const hy = Math.floor((height - holeH) / 2);
      mask = make(
        (x, y) => !(x >= hx && x < hx + holeW && y >= hy && y < hy + holeH),
      );
      break;
    }
    default:
      return null;
  }

  // Apply random rotation
  if (rotation > 0) {
    mask = rotateMask(mask, rotation);
    // Rotation may change dimensions; resize to fit original width x height
    // rotateMask of a square stays the same size, but just in case:
    if (mask.length !== height || mask[0].length !== width) {
      // Crop/pad to original dimensions — fallback to square
      return null;
    }
  }

  // Validate connectivity
  const totalValid = mask.flat().filter(Boolean).length;
  if (totalValid < 9 || floodFillCount(mask) !== totalValid) {
    return null; // Fallback to square
  }

  return mask;
}

// ---------------------------------------------------------------------------
// Maze generation — iterative recursive backtracking
// ---------------------------------------------------------------------------

function initCells(width, height) {
  return Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => ({
      x,
      y,
      visited: false,
      walls: { top: true, right: true, bottom: true, left: true },
    })),
  );
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(_rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function isValid(x, y, width, height, mask) {
  return x >= 0 && x < width && y >= 0 && y < height && (!mask || mask[y][x]);
}

function getNeighborDirs(x, y, width, height, cells, mask) {
  const dirs = [];
  if (
    y > 0 &&
    isValid(x, y - 1, width, height, mask) &&
    !cells[y - 1][x].visited
  )
    dirs.push({ x, y: y - 1, dir: "top", opp: "bottom" });
  if (
    x < width - 1 &&
    isValid(x + 1, y, width, height, mask) &&
    !cells[y][x + 1].visited
  )
    dirs.push({ x: x + 1, y, dir: "right", opp: "left" });
  if (
    y < height - 1 &&
    isValid(x, y + 1, width, height, mask) &&
    !cells[y + 1][x].visited
  )
    dirs.push({ x, y: y + 1, dir: "bottom", opp: "top" });
  if (
    x > 0 &&
    isValid(x - 1, y, width, height, mask) &&
    !cells[y][x - 1].visited
  )
    dirs.push({ x: x - 1, y, dir: "left", opp: "right" });
  return dirs;
}

function randomValidCell(width, height, mask) {
  if (!mask) return { x: 0, y: 0 };
  const valid = [];
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) if (mask[y][x]) valid.push({ x, y });
  return valid[Math.floor(_rng() * valid.length)];
}

function carveBacktrack(cells, width, height, mask) {
  const start = randomValidCell(width, height, mask);
  const stack = [start];
  cells[start.y][start.x].visited = true;

  while (stack.length > 0) {
    const { x, y } = stack[stack.length - 1];
    const neighbors = shuffle(
      getNeighborDirs(x, y, width, height, cells, mask),
    );
    if (neighbors.length === 0) {
      stack.pop();
      continue;
    }
    const n = neighbors[0];
    cells[y][x].walls[n.dir] = false;
    cells[n.y][n.x].walls[n.opp] = false;
    cells[n.y][n.x].visited = true;
    stack.push({ x: n.x, y: n.y });
  }
}

// ---------------------------------------------------------------------------
// Maze generation — Prim's algorithm (shorter corridors, more branching)
// ---------------------------------------------------------------------------

function carvePrims(cells, width, height, mask) {
  const start = randomValidCell(width, height, mask);
  cells[start.y][start.x].visited = true;

  // Frontier: walls between visited and unvisited cells
  let frontier = [];
  const addFrontier = (x, y) => {
    for (const n of getNeighborDirs(x, y, width, height, cells, mask)) {
      frontier.push({ ox: x, oy: y, ...n });
    }
  };
  addFrontier(start.x, start.y);

  while (frontier.length > 0) {
    const idx = Math.floor(_rng() * frontier.length);
    const wall = frontier[idx];
    // Swap-remove for performance
    frontier[idx] = frontier[frontier.length - 1];
    frontier.pop();

    if (cells[wall.y][wall.x].visited) continue;

    cells[wall.oy][wall.ox].walls[wall.dir] = false;
    cells[wall.y][wall.x].walls[wall.opp] = false;
    cells[wall.y][wall.x].visited = true;

    addFrontier(wall.x, wall.y);
  }
}

// ---------------------------------------------------------------------------
// Main generation entry point
// ---------------------------------------------------------------------------

export function generateMaze(width, height, options = {}) {
  const { algorithm = "backtrack", mask = null } = options;
  const cells = initCells(width, height);

  // Mark void cells as visited so they're never carved into
  if (mask) {
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++)
        if (!mask[y][x]) cells[y][x].visited = true;
  }

  if (algorithm === "prims") {
    carvePrims(cells, width, height, mask);
  } else {
    carveBacktrack(cells, width, height, mask);
  }

  return cells;
}

// ---------------------------------------------------------------------------
// Loop injection — remove extra walls to create multiple paths
// ---------------------------------------------------------------------------

export function addLoops(cells, loopFactor, mask) {
  if (loopFactor <= 0) return;
  const height = cells.length;
  const width = cells[0].length;

  // Collect all internal walls between two valid cells
  const internalWalls = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (mask && !mask[y][x]) continue;
      // Right wall
      if (
        x < width - 1 &&
        cells[y][x].walls.right &&
        isValid(x + 1, y, width, height, mask)
      ) {
        internalWalls.push({
          x,
          y,
          dir: "right",
          nx: x + 1,
          ny: y,
          opp: "left",
        });
      }
      // Bottom wall
      if (
        y < height - 1 &&
        cells[y][x].walls.bottom &&
        isValid(x, y + 1, width, height, mask)
      ) {
        internalWalls.push({
          x,
          y,
          dir: "bottom",
          nx: x,
          ny: y + 1,
          opp: "top",
        });
      }
    }
  }

  shuffle(internalWalls);
  const count = Math.floor(internalWalls.length * loopFactor);
  for (let i = 0; i < count; i++) {
    const w = internalWalls[i];
    cells[w.y][w.x].walls[w.dir] = false;
    cells[w.ny][w.nx].walls[w.opp] = false;
  }
}

// ---------------------------------------------------------------------------
// Start / exit placement — maximize maze-path distance
// ---------------------------------------------------------------------------

function getEdgeCells(width, height, mask) {
  const edges = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (mask && !mask[y][x]) continue;
      // Check if cell is on boundary of the shape
      const dirs = [];
      if (y === 0 || (mask && !mask[y - 1]?.[x])) dirs.push("top");
      if (y === height - 1 || (mask && !mask[y + 1]?.[x])) dirs.push("bottom");
      if (x === 0 || (mask && !mask[y]?.[x - 1])) dirs.push("left");
      if (x === width - 1 || (mask && !mask[y]?.[x + 1])) dirs.push("right");
      if (dirs.length > 0) {
        edges.push({ x, y, dirs });
      }
    }
  }
  return edges;
}

function bfsDist(cells, startX, startY, width, height, mask) {
  const dist = Array.from({ length: height }, () =>
    new Int32Array(width).fill(-1),
  );
  dist[startY][startX] = 0;
  const queue = [{ x: startX, y: startY }];
  let head = 0;

  while (head < queue.length) {
    const { x, y } = queue[head++];
    const d = dist[y][x];
    const w = cells[y][x].walls;
    // Check each direction
    if (
      !w.top &&
      y > 0 &&
      dist[y - 1][x] < 0 &&
      isValid(x, y - 1, width, height, mask)
    ) {
      dist[y - 1][x] = d + 1;
      queue.push({ x, y: y - 1 });
    }
    if (
      !w.right &&
      x < width - 1 &&
      dist[y][x + 1] < 0 &&
      isValid(x + 1, y, width, height, mask)
    ) {
      dist[y][x + 1] = d + 1;
      queue.push({ x: x + 1, y });
    }
    if (
      !w.bottom &&
      y < height - 1 &&
      dist[y + 1][x] < 0 &&
      isValid(x, y + 1, width, height, mask)
    ) {
      dist[y + 1][x] = d + 1;
      queue.push({ x, y: y + 1 });
    }
    if (
      !w.left &&
      x > 0 &&
      dist[y][x - 1] < 0 &&
      isValid(x - 1, y, width, height, mask)
    ) {
      dist[y][x - 1] = d + 1;
      queue.push({ x: x - 1, y });
    }
  }
  return dist;
}

// Yaw so the player faces INTO the maze from the entry edge
// Forward vector is (-sin(yaw), 0, -cos(yaw))
// Forward vector is (-sin(yaw), 0, -cos(yaw))
const DIR_TO_YAW = {
  top: Math.PI, // entered from top → face south (+Z)
  bottom: 0, // entered from bottom → face north (-Z)
  left: -Math.PI / 2, // entered from left → face right (+X)
  right: Math.PI / 2, // entered from right → face left (-X)
};

export function chooseStartExit(cells, mask, width, height) {
  const edges = getEdgeCells(width, height, mask);
  if (edges.length < 2) {
    // Fallback: top-left start, bottom-right exit
    return {
      start: { x: 0, y: 0, dir: "top" },
      exit: { x: width - 1, y: height - 1, dir: "bottom" },
      startYaw: Math.PI,
    };
  }

  // Sample candidates and find pair with max BFS distance
  const candidates = shuffle([...edges]).slice(0, Math.min(12, edges.length));
  let bestDist = -1;
  let bestStart = null;
  let bestExit = null;

  for (const cand of candidates) {
    const dist = bfsDist(cells, cand.x, cand.y, width, height, mask);
    for (const other of edges) {
      if (other.x === cand.x && other.y === cand.y) continue;
      if (dist[other.y][other.x] > bestDist) {
        bestDist = dist[other.y][other.x];
        bestStart = cand;
        bestExit = other;
      }
    }
  }

  if (!bestStart || !bestExit) {
    bestStart = edges[0];
    bestExit = edges[edges.length - 1];
  }

  // Pick the outward dir that points most away from the maze center
  const centerX = (width - 1) / 2;
  const centerY = (height - 1) / 2;
  const pickBestDir = (cell) => {
    const offsets = {
      top: [0, -1],
      bottom: [0, 1],
      left: [-1, 0],
      right: [1, 0],
    };
    let best = cell.dirs[0];
    let bestScore = -Infinity;
    for (const d of cell.dirs) {
      const [dx, dy] = offsets[d];
      // Score: how much this direction points away from center
      const score = dx * (cell.x - centerX) + dy * (cell.y - centerY);
      if (score > bestScore) {
        bestScore = score;
        best = d;
      }
    }
    return best;
  };
  const startDir = pickBestDir(bestStart);
  const exitDir = pickBestDir(bestExit);

  // Open the walls
  cells[bestStart.y][bestStart.x].walls[startDir] = false;
  cells[bestExit.y][bestExit.x].walls[exitDir] = false;

  return {
    start: { x: bestStart.x, y: bestStart.y, dir: startDir },
    exit: { x: bestExit.x, y: bestExit.y, dir: exitDir },
    startYaw: DIR_TO_YAW[startDir] ?? Math.PI,
  };
}

// ---------------------------------------------------------------------------
// Wall box geometry for rendering and collision
// ---------------------------------------------------------------------------

export function getWallBoxes(cells, mask) {
  const height = cells.length;
  const width = cells[0].length;
  const boxes = [];
  const T = 0.3;

  // Helper: does a horizontal wall exist at line y, column x?
  function hasHWall(x, y) {
    const above = y > 0 && isValid(x, y - 1, width, height, mask);
    const below = y < height && isValid(x, y, width, height, mask);
    if (!above && !below) return false;
    if (below) return cells[y][x].walls.top;
    return cells[y - 1][x].walls.bottom;
  }

  // Helper: does a vertical wall exist at line x, row y?
  function hasVWall(x, y) {
    const left = x > 0 && isValid(x - 1, y, width, height, mask);
    const right = x < width && isValid(x, y, width, height, mask);
    if (!left && !right) return false;
    if (right) return cells[y][x].walls.left;
    return cells[y][x - 1].walls.right;
  }

  // Merge horizontal wall runs
  for (let y = 0; y <= height; y++) {
    let runStart = -1;
    for (let x = 0; x <= width; x++) {
      const wall = x < width && hasHWall(x, y);
      if (wall) {
        if (runStart < 0) runStart = x;
      } else {
        if (runStart >= 0) {
          const x0 = runStart * CELL_SIZE;
          const x1 = x * CELL_SIZE;
          boxes.push({
            cx: (x0 + x1) / 2,
            cz: y * CELL_SIZE,
            width: x1 - x0,
            depth: T,
            axis: "h",
          });
          runStart = -1;
        }
      }
    }
  }

  // Merge vertical wall runs
  for (let x = 0; x <= width; x++) {
    let runStart = -1;
    for (let y = 0; y <= height; y++) {
      const wall = y < height && hasVWall(x, y);
      if (wall) {
        if (runStart < 0) runStart = y;
      } else {
        if (runStart >= 0) {
          const z0 = runStart * CELL_SIZE;
          const z1 = y * CELL_SIZE;
          boxes.push({
            cx: x * CELL_SIZE,
            cz: (z0 + z1) / 2,
            width: T,
            depth: z1 - z0,
            axis: "v",
          });
          runStart = -1;
        }
      }
    }
  }

  return boxes;
}

// Keep old getMazeWalls for title background (no mask needed)
export function getMazeWalls(cells) {
  const height = cells.length;
  const width = cells[0].length;
  const walls = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const cell = cells[y][x];
      const wx = x * CELL_SIZE;
      const wy = y * CELL_SIZE;
      if (cell.walls.top)
        walls.push({ x: wx + CELL_SIZE / 2, z: wy, w: CELL_SIZE, h: 0.3 });
      if (cell.walls.left)
        walls.push({ x: wx, z: wy + CELL_SIZE / 2, w: 0.3, h: CELL_SIZE });
      if (x === width - 1 && cell.walls.right)
        walls.push({
          x: wx + CELL_SIZE,
          z: wy + CELL_SIZE / 2,
          w: 0.3,
          h: CELL_SIZE,
        });
      if (y === height - 1 && cell.walls.bottom)
        walls.push({
          x: wx + CELL_SIZE / 2,
          z: wy + CELL_SIZE,
          w: CELL_SIZE,
          h: 0.3,
        });
    }
  }
  return walls;
}

// ---------------------------------------------------------------------------
// Magic item placement
// ---------------------------------------------------------------------------

export function placeMagicItems(cells, count, mask, startCell, exitCell) {
  const height = cells.length;
  const width = cells[0].length;
  const types = [MAGIC_GHOST, MAGIC_FLY, MAGIC_TRAIL].sort(() => _rng() - 0.5);
  const items = [];
  const used = new Set();
  if (startCell) used.add(`${startCell.x},${startCell.y}`);
  if (exitCell) used.add(`${exitCell.x},${exitCell.y}`);

  for (let i = 0; i < count; i++) {
    let attempts = 0;
    while (attempts < 100) {
      const x = Math.floor(_rng() * width);
      const y = Math.floor(_rng() * height);
      if (mask && !mask[y][x]) {
        attempts++;
        continue;
      }
      const key = `${x},${y}`;
      const tooClose = items.some(
        (it) => Math.abs(it.cellX - x) + Math.abs(it.cellY - y) < 3,
      );
      if (!used.has(key) && !tooClose) {
        used.add(key);
        items.push({
          type: types[i % types.length],
          cellX: x,
          cellY: y,
          worldX: x * CELL_SIZE + CELL_SIZE / 2,
          worldZ: y * CELL_SIZE + CELL_SIZE / 2,
        });
        break;
      }
      attempts++;
    }
  }
  return items;
}

export function placeSingleItem(
  cells,
  existingItems,
  type = MAGIC_STEPS,
  mask,
  startCell,
  exitCell,
) {
  const height = cells.length;
  const width = cells[0].length;
  const used = new Set();
  if (startCell) used.add(`${startCell.x},${startCell.y}`);
  if (exitCell) used.add(`${exitCell.x},${exitCell.y}`);
  for (const it of existingItems) used.add(`${it.cellX},${it.cellY}`);

  for (let attempts = 0; attempts < 100; attempts++) {
    const x = Math.floor(_rng() * width);
    const y = Math.floor(_rng() * height);
    if (mask && !mask[y][x]) continue;
    const key = `${x},${y}`;
    const tooClose = existingItems.some(
      (it) => Math.abs(it.cellX - x) + Math.abs(it.cellY - y) < 3,
    );
    if (!used.has(key) && !tooClose) {
      return {
        type,
        cellX: x,
        cellY: y,
        worldX: x * CELL_SIZE + CELL_SIZE / 2,
        worldZ: y * CELL_SIZE + CELL_SIZE / 2,
      };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Nearest corridor (for landing after fly/ghost)
// ---------------------------------------------------------------------------

export function nearestCorridor(worldX, worldZ, cells, mask) {
  const height = cells.length;
  const width = cells[0].length;
  const cx = Math.max(0, Math.min(width - 1, Math.floor(worldX / CELL_SIZE)));
  const cz = Math.max(0, Math.min(height - 1, Math.floor(worldZ / CELL_SIZE)));

  if (!mask || mask[cz][cx]) {
    return {
      x: cx * CELL_SIZE + CELL_SIZE / 2,
      z: cz * CELL_SIZE + CELL_SIZE / 2,
    };
  }

  // BFS outward to find nearest valid cell
  const visited = new Set();
  const queue = [{ x: cx, y: cz }];
  visited.add(`${cx},${cz}`);
  while (queue.length) {
    const { x, y } = queue.shift();
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = x + dx;
      const ny = y + dy;
      const key = `${nx},${ny}`;
      if (nx < 0 || nx >= width || ny < 0 || ny >= height || visited.has(key))
        continue;
      visited.add(key);
      if (mask[ny][nx]) {
        return {
          x: nx * CELL_SIZE + CELL_SIZE / 2,
          z: ny * CELL_SIZE + CELL_SIZE / 2,
        };
      }
      queue.push({ x: nx, y: ny });
    }
  }

  return { x: worldX, z: worldZ };
}
