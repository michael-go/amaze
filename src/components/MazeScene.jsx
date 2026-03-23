import { useRef, useEffect, useMemo, useState, useCallback } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useKeyboardControls } from "../lib/useKeyboardControls";
import * as THREE from "three";
import { Sky, Stars } from "@react-three/drei";
import {
  getWallBoxes,
  CELL_SIZE,
  WALL_HEIGHT,
  MAGIC_GHOST,
  MAGIC_FLY,
  nearestCorridor,
} from "../lib/maze";
import { levelTheme } from "../lib/wallTexture";
import { MazeFloor, MazeWalls, PlayerLight, StartMarker } from "./MazeElements";
import KidCharacter from "./KidCharacter";
import TreasureChest from "./TreasureChest";
import MagicItem from "./MagicItem";

const PLAYER_SPEED = 5;
const TURN_SPEED = 2.5;
const PLAYER_RADIUS = 0.4;
const EXIT_RADIUS = 1.2;
const PICKUP_RADIUS = 1.0;
const GHOST_DURATION = 5;
const FLY_DURATION = 5;
const FLY_HEIGHT = WALL_HEIGHT + 1.5;

// Third-person camera offset
const CAM_BEHIND = 2.0;
const CAM_HEIGHT = 2.0;
const CAM_LERP = 5; // smoothing

export default function MazeScene({
  game,
  level,
  topView,
  onWin,
  won,
  frozen,
  onStepUsed,
  magicItems,
  onPickupItem,
  activePower,
  onPowerEnd,
  trailActive,
  skippedItem,
}) {
  const theme = levelTheme(level);
  const { camera } = useThree();
  const keys = useKeyboardControls();

  const playerPos = useRef(new THREE.Vector3(...game.startPos));
  const yaw = useRef(Math.PI);
  const isMoving = useRef(false);
  const distAccum = useRef(0);
  const powerTimer = useRef(0);
  const flyLanding = useRef(false);
  const playerY = useRef(0);
  const skipCleared = useRef(false);

  const wallBoxes = useMemo(() => getWallBoxes(game.cells), [game.cells]);
  const wallBoxesRef = useRef(wallBoxes);
  wallBoxesRef.current = wallBoxes;

  // Trail: track visited cells
  const [visitedCells, setVisitedCells] = useState(() => new Set());
  const lastCell = useRef("");

  const trackCell = useCallback((px, pz) => {
    const cx = Math.floor(px / CELL_SIZE);
    const cz = Math.floor(pz / CELL_SIZE);
    const key = `${cx},${cz}`;
    if (key !== lastCell.current) {
      // Mark the cell we just left, not the one we're entering
      const prev = lastCell.current;
      lastCell.current = key;
      if (prev) {
        setVisitedCells((s) => {
          if (s.has(prev)) return s;
          const next = new Set(s);
          next.add(prev);
          return next;
        });
      }
    }
  }, []);

  useEffect(() => {
    playerPos.current.set(...game.startPos);
    yaw.current = Math.PI;
    distAccum.current = 0;
    powerTimer.current = 0;
    flyLanding.current = false;
    playerY.current = 0;
    setVisitedCells(new Set());
    lastCell.current = "";
  }, [game]);

  function collidesWithWall(nx, nz) {
    for (const box of wallBoxesRef.current) {
      const hw = box.width / 2 + PLAYER_RADIUS;
      const hd = box.depth / 2 + PLAYER_RADIUS;
      if (
        nx > box.cx - hw &&
        nx < box.cx + hw &&
        nz > box.cz - hd &&
        nz < box.cz + hd
      )
        return true;
    }
    return false;
  }

  useFrame((_, delta) => {
    const pos = playerPos.current;
    const isGhost = activePower === MAGIC_GHOST;
    const isFlying = activePower === MAGIC_FLY;

    if (topView) {
      // Top-down camera
      camera.up.set(0, 0, -1);
      const cx = (game.width * CELL_SIZE) / 2;
      const cz = (game.height * CELL_SIZE) / 2;
      const mazeW = game.width * CELL_SIZE;
      const mazeH = game.height * CELL_SIZE;
      const fovRad = (camera.fov * Math.PI) / 180;
      const aspect = camera.aspect || 1;
      const hForH = mazeH / 2 / Math.tan(fovRad / 2);
      const hForW = mazeW / 2 / Math.tan(fovRad / 2) / aspect;
      const camHeight = Math.max(hForH, hForW) * 1.1;
      camera.position.set(cx, camHeight, cz);
      camera.lookAt(cx, 0, cz);

      if (!won && !frozen && !isFlying) {
        const ex = game.exitPos[0];
        const ez = game.exitPos[2];
        const dist = Math.sqrt((pos.x - ex) ** 2 + (pos.z - ez) ** 2);
        if (dist < EXIT_RADIUS) onWin();
      }
      return;
    }

    if (won || frozen) return;

    // Power-up timer
    if (activePower) {
      powerTimer.current += delta;
      const duration = isGhost ? GHOST_DURATION : FLY_DURATION;
      if (powerTimer.current >= duration) {
        powerTimer.current = 0;
        // Snap to nearest corridor so player doesn't end up stuck inside a wall
        const landing = nearestCorridor(pos.x, pos.z, game.cells);
        pos.x = landing.x;
        pos.z = landing.z;
        if (isFlying) {
          flyLanding.current = true;
        }
        onPowerEnd();
      }
    }

    // Smooth fly height transition
    const targetY = isFlying ? FLY_HEIGHT : 0;
    if (flyLanding.current && playerY.current > 0.05) {
      playerY.current = THREE.MathUtils.lerp(playerY.current, 0, 6 * delta);
    } else if (flyLanding.current) {
      playerY.current = 0;
      flyLanding.current = false;
    } else {
      playerY.current = THREE.MathUtils.lerp(
        playerY.current,
        targetY,
        4 * delta,
      );
    }

    if (!topView) {
      // Turning
      if (keys.turnLeft) yaw.current += TURN_SPEED * delta;
      if (keys.turnRight) yaw.current -= TURN_SPEED * delta;

      // Forward/backward movement
      const forward = new THREE.Vector3(
        -Math.sin(yaw.current),
        0,
        -Math.cos(yaw.current),
      );

      let dx = 0,
        dz = 0;
      if (keys.forward) {
        dx += forward.x;
        dz += forward.z;
      }
      if (keys.backward) {
        dx -= forward.x;
        dz -= forward.z;
      }

      const len = Math.sqrt(dx * dx + dz * dz);
      isMoving.current = len > 0;
      if (len > 0) {
        dx = (dx / len) * PLAYER_SPEED * delta;
        dz = (dz / len) * PLAYER_SPEED * delta;

        const ox = pos.x,
          oz = pos.z;
        const nx = pos.x + dx;
        const nz = pos.z + dz;
        // Ghost and fly modes skip wall collision
        if (isGhost || isFlying) {
          pos.x = nx;
          pos.z = nz;
        } else {
          if (!collidesWithWall(nx, pos.z)) pos.x = nx;
          if (!collidesWithWall(pos.x, nz)) pos.z = nz;
        }

        // Track distance for step counting (flying doesn't cost steps)
        if (!isFlying) {
          const moved = Math.sqrt((pos.x - ox) ** 2 + (pos.z - oz) ** 2);
          if (moved > 0 && onStepUsed) {
            distAccum.current += moved;
            while (distAccum.current >= 1) {
              distAccum.current -= 1;
              onStepUsed();
            }
          }
        }
      }

      // Clamp to maze bounds
      const margin = PLAYER_RADIUS;
      pos.x = Math.max(
        margin,
        Math.min(game.width * CELL_SIZE - margin, pos.x),
      );
      pos.z = Math.max(
        margin,
        Math.min(game.height * CELL_SIZE - margin, pos.z),
      );

      // Always track visited cells (trail reveals them retroactively)
      trackCell(pos.x, pos.z);

      // Check magic item pickup
      if (magicItems && onPickupItem && !activePower) {
        // After quiz cancel, wait until player moves away before re-triggering
        if (skippedItem >= 0 && skippedItem < magicItems.length) {
          const si = magicItems[skippedItem];
          const sd = Math.sqrt(
            (pos.x - si.worldX) ** 2 + (pos.z - si.worldZ) ** 2,
          );
          if (sd >= PICKUP_RADIUS) skipCleared.current = true;
        } else {
          skipCleared.current = true;
        }
        for (let i = 0; i < magicItems.length; i++) {
          if (i === skippedItem && !skipCleared.current) continue;
          const item = magicItems[i];
          const dx2 = pos.x - item.worldX;
          const dz2 = pos.z - item.worldZ;
          if (Math.sqrt(dx2 * dx2 + dz2 * dz2) < PICKUP_RADIUS) {
            powerTimer.current = 0;
            skipCleared.current = false;
            onPickupItem(i);
            break;
          }
        }
      }

      // Third-person camera: behind and above the player
      camera.up.set(0, 1, 0);
      const behindX = Math.sin(yaw.current);
      const behindZ = Math.cos(yaw.current);
      let camDist = CAM_BEHIND;

      // When on the ground, pull camera in if it would clip through a wall
      if (!isFlying) {
        const steps = 8;
        for (let s = 1; s <= steps; s++) {
          const t = (s / steps) * CAM_BEHIND;
          const tx = pos.x + behindX * t;
          const tz = pos.z + behindZ * t;
          if (collidesWithWall(tx, tz)) {
            camDist = Math.max(((s - 1) / steps) * CAM_BEHIND, 0.3);
            break;
          }
        }
      }

      // When pulled in, raise camera above the walls so it doesn't clip
      const pullRatio = 1 - camDist / CAM_BEHIND;
      const extraHeight = pullRatio * (WALL_HEIGHT + 0.5 - CAM_HEIGHT);
      const idealX = pos.x + behindX * camDist;
      const idealZ = pos.z + behindZ * camDist;
      const idealY = CAM_HEIGHT + playerY.current + extraHeight;

      camera.position.set(
        THREE.MathUtils.lerp(camera.position.x, idealX, CAM_LERP * delta),
        THREE.MathUtils.lerp(camera.position.y, idealY, CAM_LERP * delta),
        THREE.MathUtils.lerp(camera.position.z, idealZ, CAM_LERP * delta),
      );

      camera.lookAt(pos.x, 1.0 + playerY.current, pos.z);
    }

    // Check win (only when on the ground)
    if (!won && !frozen && !isFlying) {
      const ex = game.exitPos[0];
      const ez = game.exitPos[2];
      const dist = Math.sqrt((pos.x - ex) ** 2 + (pos.z - ez) ** 2);
      if (dist < EXIT_RADIUS) onWin();
    }
  });

  return (
    <>
      <ambientLight intensity={topView ? 2.0 : 1.0} />
      <hemisphereLight args={["#8888aa", "#444466", 0.6]} />
      {!topView && <PlayerLight playerPos={playerPos} />}
      {topView && (
        <directionalLight
          position={[
            (game.width * CELL_SIZE) / 2,
            30,
            (game.height * CELL_SIZE) / 2,
          ]}
          intensity={2}
        />
      )}

      <Sky
        sunPosition={[100, -5, 100]}
        turbidity={8}
        rayleigh={0.5}
        mieCoefficient={0.005}
        mieDirectionalG={0.8}
      />
      <Stars radius={100} depth={50} count={3000} factor={4} fade speed={1} />

      <MazeFloor game={game} theme={theme} />
      <MazeWalls wallBoxes={wallBoxes} theme={theme} />
      <TreasureChest position={game.exitPos} />
      <StartMarker game={game} />
      {magicItems &&
        magicItems.map((item) => (
          <MagicItem key={`${item.cellX}-${item.cellY}`} item={item} />
        ))}
      {trailActive && <TrailDots visitedCells={visitedCells} />}
      <KidCharacter
        playerPos={playerPos}
        yaw={yaw}
        isMoving={isMoving}
        activePower={activePower}
        playerY={playerY}
      />
    </>
  );
}

function TrailDots({ visitedCells }) {
  const dots = useMemo(() => {
    const arr = [];
    for (const key of visitedCells) {
      const [cx, cz] = key.split(",").map(Number);
      arr.push({
        key,
        x: cx * CELL_SIZE + CELL_SIZE / 2,
        z: cz * CELL_SIZE + CELL_SIZE / 2,
      });
    }
    return arr;
  }, [visitedCells]);

  const footMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#44ee88",
        emissive: "#44ee88",
        emissiveIntensity: 0.5,
        transparent: true,
        opacity: 0.6,
      }),
    [],
  );

  return (
    <>
      {dots.map((d) => (
        <group key={d.key} position={[d.x, 0.015, d.z]}>
          {/* Left foot */}
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[-0.12, 0, 0]}
            scale={[0.6, 1, 1]}
            material={footMat}
          >
            <circleGeometry args={[0.13, 8]} />
          </mesh>
          {/* Right foot */}
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0.12, 0, 0.18]}
            scale={[0.6, 1, 1]}
            material={footMat}
          >
            <circleGeometry args={[0.13, 8]} />
          </mesh>
        </group>
      ))}
    </>
  );
}
