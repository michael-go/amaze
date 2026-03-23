// Recursive backtracking maze generator
// Returns a 2D grid where each cell has { top, right, bottom, left } walls

// Magic item types
export const MAGIC_GHOST = "ghost"; // walk through walls
export const MAGIC_FLY = "fly"; // float above walls
export const MAGIC_TRAIL = "trail"; // show visited path on floor

export function generateMaze(width, height) {
  const cells = Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => ({
      x,
      y,
      visited: false,
      walls: { top: true, right: true, bottom: true, left: true },
    })),
  );

  function getNeighbors(x, y) {
    const neighbors = [];
    if (y > 0) neighbors.push({ x, y: y - 1, dir: "top", opp: "bottom" });
    if (x < width - 1)
      neighbors.push({ x: x + 1, y, dir: "right", opp: "left" });
    if (y < height - 1)
      neighbors.push({ x, y: y + 1, dir: "bottom", opp: "top" });
    if (x > 0) neighbors.push({ x: x - 1, y, dir: "left", opp: "right" });
    return neighbors.filter((n) => !cells[n.y][n.x].visited);
  }

  function carve(x, y) {
    cells[y][x].visited = true;
    const neighbors = getNeighbors(x, y);
    // shuffle
    for (let i = neighbors.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [neighbors[i], neighbors[j]] = [neighbors[j], neighbors[i]];
    }
    for (const n of neighbors) {
      if (!cells[n.y][n.x].visited) {
        cells[y][x].walls[n.dir] = false;
        cells[n.y][n.x].walls[n.opp] = false;
        carve(n.x, n.y);
      }
    }
  }

  carve(0, 0);

  // Entry: remove top wall of (0,0), Exit: remove bottom wall of (width-1, height-1)
  cells[0][0].walls.top = false;
  cells[height - 1][width - 1].walls.bottom = false;

  return cells;
}

// Returns flat list of wall segments as { x1,y1,x2,y2 } in world coords
// Each cell is CELL_SIZE units wide
export const CELL_SIZE = 4;
export const WALL_HEIGHT = 3;

export function getMazeWalls(cells) {
  const height = cells.length;
  const width = cells[0].length;
  const walls = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const cell = cells[y][x];
      const wx = x * CELL_SIZE;
      const wy = y * CELL_SIZE;

      if (cell.walls.top) {
        walls.push({ x: wx + CELL_SIZE / 2, z: wy, w: CELL_SIZE, h: 0.3 });
      }
      if (cell.walls.left) {
        walls.push({ x: wx, z: wy + CELL_SIZE / 2, w: 0.3, h: CELL_SIZE });
      }
      // Only add right/bottom on edges to avoid duplicates
      if (x === width - 1 && cell.walls.right) {
        walls.push({
          x: wx + CELL_SIZE,
          z: wy + CELL_SIZE / 2,
          w: 0.3,
          h: CELL_SIZE,
        });
      }
      if (y === height - 1 && cell.walls.bottom) {
        walls.push({
          x: wx + CELL_SIZE / 2,
          z: wy + CELL_SIZE,
          w: CELL_SIZE,
          h: 0.3,
        });
      }
    }
  }

  return walls;
}

// Build a solid geometry description for collision & rendering
// Returns array of { cx, cz, width, depth } boxes (centered)
export function getWallBoxes(cells) {
  const height = cells.length;
  const width = cells[0].length;
  const boxes = [];
  const T = 0.3; // wall thickness

  // Merge horizontal wall runs (top walls + bottom edge)
  for (let y = 0; y <= height; y++) {
    let runStart = -1;
    for (let x = 0; x <= width; x++) {
      const hasWall =
        y < height && x < width
          ? cells[y][x].walls.top
          : y === height && x < width
            ? cells[height - 1][x].walls.bottom
            : false;
      if (hasWall) {
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

  // Merge vertical wall runs (left walls + right edge)
  for (let x = 0; x <= width; x++) {
    let runStart = -1;
    for (let y = 0; y <= height; y++) {
      const hasWall =
        x < width && y < height
          ? cells[y][x].walls.left
          : x === width && y < height
            ? cells[y][width - 1].walls.right
            : false;
      if (hasWall) {
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

// Place magic items in random corridor cells (avoiding start/exit)
export function placeMagicItems(cells, count) {
  const height = cells.length;
  const width = cells[0].length;
  const types = [MAGIC_GHOST, MAGIC_FLY, MAGIC_TRAIL].sort(
    () => Math.random() - 0.5,
  );
  const items = [];
  const used = new Set();
  used.add("0,0");
  used.add(`${width - 1},${height - 1}`);

  for (let i = 0; i < count; i++) {
    let attempts = 0;
    while (attempts < 100) {
      const x = Math.floor(Math.random() * width);
      const y = Math.floor(Math.random() * height);
      const key = `${x},${y}`;
      // Ensure minimum 3-cell distance from all other items
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

// Find the nearest corridor cell center from a world position
export function nearestCorridor(worldX, worldZ, cells) {
  const height = cells.length;
  const width = cells[0].length;
  // Clamp to grid
  const cx = Math.max(0, Math.min(width - 1, Math.floor(worldX / CELL_SIZE)));
  const cz = Math.max(0, Math.min(height - 1, Math.floor(worldZ / CELL_SIZE)));
  // The cell the player is above is always a valid corridor
  return {
    x: cx * CELL_SIZE + CELL_SIZE / 2,
    z: cz * CELL_SIZE + CELL_SIZE / 2,
  };
}
