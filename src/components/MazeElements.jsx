import { useRef, useMemo, useCallback } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CELL_SIZE, WALL_HEIGHT } from "../lib/maze";
import { createWallTexture } from "../lib/wallTexture";

export function MazeFloor({ game, theme }) {
  if (!game.mask) {
    const w = game.width * CELL_SIZE;
    const h = game.height * CELL_SIZE;
    return (
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[w / 2, 0, h / 2]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial color={theme.floor} roughness={0.9} />
      </mesh>
    );
  }
  return <ShapedFloor game={game} theme={theme} />;
}

function ShapedFloor({ game, theme }) {
  const { mask } = game;
  const geo = useMemo(() => new THREE.PlaneGeometry(CELL_SIZE, CELL_SIZE), []);
  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({ color: theme.floor, roughness: 0.9 }),
    [theme.floor],
  );

  const tiles = useMemo(() => {
    const t = [];
    for (let y = 0; y < game.height; y++)
      for (let x = 0; x < game.width; x++)
        if (mask[y][x])
          t.push({
            x: x * CELL_SIZE + CELL_SIZE / 2,
            z: y * CELL_SIZE + CELL_SIZE / 2,
          });
    return t;
  }, [mask, game.width, game.height]);

  const meshRef = useRef();

  // Set instance matrices whenever the ref or tiles change
  const setRef = useCallback(
    (node) => {
      meshRef.current = node;
      if (!node) return;
      const dummy = new THREE.Object3D();
      for (let i = 0; i < tiles.length; i++) {
        dummy.position.set(tiles[i].x, 0, tiles[i].z);
        dummy.rotation.set(-Math.PI / 2, 0, 0);
        dummy.updateMatrix();
        node.setMatrixAt(i, dummy.matrix);
      }
      node.instanceMatrix.needsUpdate = true;
    },
    [tiles],
  );

  return <instancedMesh ref={setRef} args={[geo, mat, tiles.length]} />;
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
