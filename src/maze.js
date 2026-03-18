// Recursive backtracking maze generator
// Returns a 2D grid where each cell has { top, right, bottom, left } walls

export function generateMaze(width, height) {
  const cells = Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => ({
      x,
      y,
      visited: false,
      walls: { top: true, right: true, bottom: true, left: true },
    }))
  )

  function getNeighbors(x, y) {
    const neighbors = []
    if (y > 0) neighbors.push({ x, y: y - 1, dir: 'top', opp: 'bottom' })
    if (x < width - 1) neighbors.push({ x: x + 1, y, dir: 'right', opp: 'left' })
    if (y < height - 1) neighbors.push({ x, y: y + 1, dir: 'bottom', opp: 'top' })
    if (x > 0) neighbors.push({ x: x - 1, y, dir: 'left', opp: 'right' })
    return neighbors.filter(n => !cells[n.y][n.x].visited)
  }

  function carve(x, y) {
    cells[y][x].visited = true
    const neighbors = getNeighbors(x, y)
    // shuffle
    for (let i = neighbors.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [neighbors[i], neighbors[j]] = [neighbors[j], neighbors[i]]
    }
    for (const n of neighbors) {
      if (!cells[n.y][n.x].visited) {
        cells[y][x].walls[n.dir] = false
        cells[n.y][n.x].walls[n.opp] = false
        carve(n.x, n.y)
      }
    }
  }

  carve(0, 0)

  // Entry: remove top wall of (0,0), Exit: remove bottom wall of (width-1, height-1)
  cells[0][0].walls.top = false
  cells[height - 1][width - 1].walls.bottom = false

  return cells
}

// Returns flat list of wall segments as { x1,y1,x2,y2 } in world coords
// Each cell is CELL_SIZE units wide
export const CELL_SIZE = 4
export const WALL_HEIGHT = 3

export function getMazeWalls(cells) {
  const height = cells.length
  const width = cells[0].length
  const walls = []

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const cell = cells[y][x]
      const wx = x * CELL_SIZE
      const wy = y * CELL_SIZE

      if (cell.walls.top) {
        walls.push({ x: wx + CELL_SIZE / 2, z: wy, w: CELL_SIZE, h: 0.3 })
      }
      if (cell.walls.left) {
        walls.push({ x: wx, z: wy + CELL_SIZE / 2, w: 0.3, h: CELL_SIZE })
      }
      // Only add right/bottom on edges to avoid duplicates
      if (x === width - 1 && cell.walls.right) {
        walls.push({ x: wx + CELL_SIZE, z: wy + CELL_SIZE / 2, w: 0.3, h: CELL_SIZE })
      }
      if (y === height - 1 && cell.walls.bottom) {
        walls.push({ x: wx + CELL_SIZE / 2, z: wy + CELL_SIZE, w: CELL_SIZE, h: 0.3 })
      }
    }
  }

  return walls
}

// Build a solid geometry description for collision & rendering
// Returns array of { cx, cz, width, depth } boxes (centered)
export function getWallBoxes(cells) {
  const height = cells.length
  const width = cells[0].length
  const boxes = []
  const T = 0.3 // wall thickness

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const cell = cells[y][x]
      const wx = x * CELL_SIZE
      const wy = y * CELL_SIZE

      if (cell.walls.top) {
        boxes.push({ cx: wx + CELL_SIZE / 2, cz: wy, width: CELL_SIZE + T, depth: T })
      }
      if (cell.walls.left) {
        boxes.push({ cx: wx, cz: wy + CELL_SIZE / 2, width: T, depth: CELL_SIZE + T })
      }
      if (x === width - 1 && cell.walls.right) {
        boxes.push({ cx: wx + CELL_SIZE, cz: wy + CELL_SIZE / 2, width: T, depth: CELL_SIZE + T })
      }
      if (y === height - 1 && cell.walls.bottom) {
        boxes.push({ cx: wx + CELL_SIZE / 2, cz: wy + CELL_SIZE, width: CELL_SIZE + T, depth: T })
      }
    }
  }

  return boxes
}
