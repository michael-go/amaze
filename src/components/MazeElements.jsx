import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CELL_SIZE, WALL_HEIGHT } from "../lib/maze";
import { createWallTexture } from "../lib/wallTexture";

export function MazeFloor({ game, theme }) {
  const w = game.width * CELL_SIZE;
  const h = game.height * CELL_SIZE;
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[w / 2, 0, h / 2]}>
      <planeGeometry args={[w, h]} />
      <meshStandardMaterial color={theme.floor} roughness={0.9} />
    </mesh>
  );
}

export function PlayerLight({ playerPos }) {
  const ref = useRef();
  useFrame(() => {
    if (ref.current) {
      ref.current.position.set(playerPos.current.x, 4, playerPos.current.z);
    }
  });
  return (
    <pointLight
      ref={ref}
      intensity={30}
      distance={30}
      color="#ccd0e0"
      decay={2}
    />
  );
}

const REVEAL_RADIUS = CELL_SIZE;

export function MazeWalls({ wallBoxes, theme, playerPos, topView }) {
  const tex = useMemo(() => createWallTexture(theme), [theme]);
  const matH = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: tex,
        roughness: theme.rough,
        metalness: theme.metal,
        emissive: new THREE.Color(theme.emissive),
      }),
    [tex, theme],
  );
  const matV = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: tex,
        roughness: theme.rough,
        metalness: theme.metal,
        emissive: new THREE.Color(theme.emissive),
        polygonOffset: true,
        polygonOffsetFactor: 2,
        polygonOffsetUnit: 2,
      }),
    [tex, theme],
  );
  const matHT = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: tex,
        roughness: theme.rough,
        metalness: theme.metal,
        emissive: new THREE.Color(theme.emissive),
        transparent: true,
        opacity: 0.4,
        depthWrite: false,
      }),
    [tex, theme],
  );
  const matVT = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: tex,
        roughness: theme.rough,
        metalness: theme.metal,
        emissive: new THREE.Color(theme.emissive),
        polygonOffset: true,
        polygonOffsetFactor: 2,
        polygonOffsetUnit: 2,
        transparent: true,
        opacity: 0.4,
        depthWrite: false,
      }),
    [tex, theme],
  );

  const groupRef = useRef();
  const wasTopView = useRef(false);

  useFrame(() => {
    if (!groupRef.current) return;
    const children = groupRef.current.children;
    if (!topView) {
      if (wasTopView.current) {
        for (let i = 0; i < children.length; i++) {
          const mesh = children[i];
          mesh.material = wallBoxes[i].axis === "h" ? matH : matV;
          mesh.renderOrder = 0;
        }
        wasTopView.current = false;
      }
      return;
    }
    wasTopView.current = true;
    if (!playerPos) return;
    const p = playerPos.current;
    for (let i = 0; i < children.length; i++) {
      const mesh = children[i];
      const box = wallBoxes[i];
      const dx = p.x - box.cx;
      const dz = p.z - box.cz;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const isH = box.axis === "h";
      if (dist < REVEAL_RADIUS) {
        mesh.material = isH ? matHT : matVT;
        mesh.renderOrder = 1;
      } else {
        mesh.material = isH ? matH : matV;
        mesh.renderOrder = 0;
      }
    }
  });

  return (
    <group ref={groupRef}>
      {wallBoxes.map((box, i) => (
        <mesh
          key={i}
          position={[box.cx, WALL_HEIGHT / 2, box.cz]}
          material={box.axis === "h" ? matH : matV}
        >
          <boxGeometry args={[box.width, WALL_HEIGHT, box.depth]} />
        </mesh>
      ))}
    </group>
  );
}

export function StartMarker({ game }) {
  return (
    <group position={[game.startPos[0], 0, game.startPos[2]]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[0.6, 32]} />
        <meshStandardMaterial
          color="#ff6b35"
          emissive="#ff6b35"
          emissiveIntensity={0.4}
        />
      </mesh>
    </group>
  );
}
