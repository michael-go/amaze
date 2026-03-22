import { useRef, useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useKeyboardControls } from "../lib/useKeyboardControls";
import * as THREE from "three";
import { Sky, Stars } from "@react-three/drei";
import { getWallBoxes, CELL_SIZE } from "../lib/maze";
import { levelTheme } from "../lib/wallTexture";
import { MazeFloor, MazeWalls, PlayerLight, StartMarker } from "./MazeElements";
import KidCharacter from "./KidCharacter";
import TreasureChest from "./TreasureChest";

const PLAYER_SPEED = 5;
const TURN_SPEED = 2.5;
const PLAYER_RADIUS = 0.4;
const EXIT_RADIUS = 1.2;

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
}) {
  const theme = levelTheme(level);
  const { camera } = useThree();
  const keys = useKeyboardControls();

  const playerPos = useRef(new THREE.Vector3(...game.startPos));
  const yaw = useRef(Math.PI);
  const isMoving = useRef(false);
  const distAccum = useRef(0);

  const wallBoxes = useMemo(() => getWallBoxes(game.cells), [game.cells]);
  const wallBoxesRef = useRef(wallBoxes);
  wallBoxesRef.current = wallBoxes;

  useEffect(() => {
    playerPos.current.set(...game.startPos);
    yaw.current = Math.PI;
    distAccum.current = 0;
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

    if (topView) {
      // Top-down camera
      camera.up.set(0, 0, -1);
      const cx = (game.width * CELL_SIZE) / 2;
      const cz = (game.height * CELL_SIZE) / 2;
      const mazeW = game.width * CELL_SIZE;
      const mazeH = game.height * CELL_SIZE;
      const fovRad = (camera.fov * Math.PI) / 180;
      const aspect = camera.aspect || 1;
      // Height needed to fit maze vertically and horizontally
      const hForH = mazeH / 2 / Math.tan(fovRad / 2);
      const hForW = mazeW / 2 / Math.tan(fovRad / 2) / aspect;
      const camHeight = Math.max(hForH, hForW) * 1.1;
      camera.position.set(cx, camHeight, cz);
      camera.lookAt(cx, 0, cz);

      if (!won && !frozen) {
        const ex = game.exitPos[0];
        const ez = game.exitPos[2];
        const dist = Math.sqrt((pos.x - ex) ** 2 + (pos.z - ez) ** 2);
        if (dist < EXIT_RADIUS) onWin();
      }
      return;
    }

    if (won || frozen) return;

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
        if (!collidesWithWall(nx, pos.z)) pos.x = nx;
        if (!collidesWithWall(pos.x, nz)) pos.z = nz;

        // Track distance for step counting
        const moved = Math.sqrt((pos.x - ox) ** 2 + (pos.z - oz) ** 2);
        if (moved > 0 && onStepUsed) {
          distAccum.current += moved;
          while (distAccum.current >= 1) {
            distAccum.current -= 1;
            onStepUsed();
          }
        }
      }

      // Clamp to maze bounds so player can't escape through entry/exit openings
      const margin = PLAYER_RADIUS;
      pos.x = Math.max(
        margin,
        Math.min(game.width * CELL_SIZE - margin, pos.x),
      );
      pos.z = Math.max(
        margin,
        Math.min(game.height * CELL_SIZE - margin, pos.z),
      );

      // Third-person camera: behind and above the player
      camera.up.set(0, 1, 0);
      const idealX = pos.x + Math.sin(yaw.current) * CAM_BEHIND;
      const idealZ = pos.z + Math.cos(yaw.current) * CAM_BEHIND;
      const idealY = CAM_HEIGHT;

      camera.position.set(
        THREE.MathUtils.lerp(camera.position.x, idealX, CAM_LERP * delta),
        THREE.MathUtils.lerp(camera.position.y, idealY, CAM_LERP * delta),
        THREE.MathUtils.lerp(camera.position.z, idealZ, CAM_LERP * delta),
      );

      // Look at a point slightly above the player
      camera.lookAt(pos.x, 1.0, pos.z);
    }

    // Check win
    const ex = game.exitPos[0];
    const ez = game.exitPos[2];
    const dist = Math.sqrt((pos.x - ex) ** 2 + (pos.z - ez) ** 2);
    if (dist < EXIT_RADIUS) onWin();
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
        sunPosition={[100, 20, 100]}
        turbidity={8}
        rayleigh={2}
        mieCoefficient={0.005}
        mieDirectionalG={0.8}
      />
      <Stars radius={100} depth={50} count={3000} factor={4} fade speed={1} />

      <MazeFloor game={game} theme={theme} />
      <MazeWalls wallBoxes={wallBoxes} theme={theme} />
      <TreasureChest position={game.exitPos} />
      <StartMarker game={game} />
      <KidCharacter playerPos={playerPos} yaw={yaw} isMoving={isMoving} />
    </>
  );
}
