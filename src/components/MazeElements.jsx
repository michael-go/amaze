import { useRef, useMemo, useCallback } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { CELL_SIZE, WALL_HEIGHT } from "../lib/maze";
import { createWallMaps, zoneVariant } from "../lib/wallTexture";
import { ICON_KINDS, createIconTexture } from "../lib/wallIcons";

export function MazeFloor({ game, theme }) {
  if (game.mask) {
    return <ShapedFloor game={game} theme={theme} />;
  }
  const w = game.width * CELL_SIZE;
  const h = game.height * CELL_SIZE;
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[w / 2, 0, h / 2]}>
      <planeGeometry args={[w, h]} />
      <meshStandardMaterial color={theme.floor} roughness={0.9} />
    </mesh>
  );
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

// World units per texture tile. Matches WALL_HEIGHT so masonry keeps the same
// density as before but now tiles by world size (no stretch on long walls).
const TILE = 3;

// Per-zone material set for both wall axes, opaque + top-view-transparent.
function makeZoneMaterials(maps, theme) {
  const common = {
    map: maps.map,
    normalMap: maps.normalMap,
    roughnessMap: maps.roughnessMap,
    roughness: 1, // actual roughness is baked into roughnessMap
    // Cap metalness: highly metallic surfaces show no diffuse color and read
    // near-black under this dim lighting, hurting visibility.
    metalness: Math.min(theme.metal, 0.4),
    emissive: new THREE.Color(theme.emissive),
    normalScale: new THREE.Vector2(1, 1),
  };
  const vOffset = {
    polygonOffset: true,
    polygonOffsetFactor: 2,
    polygonOffsetUnit: 2,
  };
  const transp = { transparent: true, opacity: 0.4, depthWrite: false };
  return {
    H: new THREE.MeshStandardMaterial({ ...common }),
    V: new THREE.MeshStandardMaterial({ ...common, ...vOffset }),
    HT: new THREE.MeshStandardMaterial({ ...common, ...transp }),
    VT: new THREE.MeshStandardMaterial({ ...common, ...vOffset, ...transp }),
  };
}

// Rescale a box's UVs per face so the texture tiles by world size at a uniform
// texel density, instead of stretching one tile across the whole face.
function scaleBoxUVs(geo, w, h, d) {
  const reps = [
    [d / TILE, h / TILE], // +X end cap
    [d / TILE, h / TILE], // -X end cap
    [w / TILE, d / TILE], // +Y top
    [w / TILE, d / TILE], // -Y bottom
    [w / TILE, h / TILE], // +Z face
    [w / TILE, h / TILE], // -Z face
  ];
  const uv = geo.attributes.uv;
  for (let f = 0; f < 6; f++) {
    const [ru, rv] = reps[f];
    for (let v = 0; v < 4; v++) {
      const i = f * 4 + v;
      uv.setXY(i, uv.getX(i) * ru, uv.getY(i) * rv);
    }
  }
  uv.needsUpdate = true;
}

export function MazeWalls({ wallBoxes, theme, playerPos, topView, game }) {
  // Split the maze into a small grid of zones; one material variant per zone.
  const { variants, zonesX, zonesZ } = useMemo(() => {
    const zonesX = Math.min(3, Math.max(1, Math.round(game.width / 7)));
    const zonesZ = Math.min(3, Math.max(1, Math.round(game.height / 7)));
    const variants = [];
    for (let zz = 0; zz < zonesZ; zz++) {
      for (let zx = 0; zx < zonesX; zx++) {
        const maps = createWallMaps(theme, zoneVariant(zx, zz, zonesX, zonesZ));
        variants.push(makeZoneMaterials(maps, theme));
      }
    }
    return { variants, zonesX, zonesZ };
  }, [theme, game.width, game.height]);

  const mazeW = game.width * CELL_SIZE;
  const mazeH = game.height * CELL_SIZE;

  // Per-box geometry (world-scaled UVs) and zone index, computed once.
  const meshData = useMemo(
    () =>
      wallBoxes.map((box) => {
        const geo = new THREE.BoxGeometry(box.width, WALL_HEIGHT, box.depth);
        scaleBoxUVs(geo, box.width, WALL_HEIGHT, box.depth);
        const zx = Math.min(zonesX - 1, Math.floor((box.cx / mazeW) * zonesX));
        const zz = Math.min(zonesZ - 1, Math.floor((box.cz / mazeH) * zonesZ));
        return { geo, zone: Math.max(0, zz) * zonesX + Math.max(0, zx) };
      }),
    [wallBoxes, zonesX, zonesZ, mazeW, mazeH],
  );

  const groupRef = useRef();
  const wasTopView = useRef(false);

  useFrame(() => {
    if (!groupRef.current) return;
    const children = groupRef.current.children;
    if (!topView) {
      if (wasTopView.current) {
        for (let i = 0; i < children.length; i++) {
          const set = variants[meshData[i].zone];
          children[i].material = wallBoxes[i].axis === "h" ? set.H : set.V;
          children[i].renderOrder = 0;
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
      const set = variants[meshData[i].zone];
      const dx = p.x - box.cx;
      const dz = p.z - box.cz;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const isH = box.axis === "h";
      if (dist < REVEAL_RADIUS) {
        mesh.material = isH ? set.HT : set.VT;
        mesh.renderOrder = 1;
      } else {
        mesh.material = isH ? set.H : set.V;
        mesh.renderOrder = 0;
      }
    }
  });

  return (
    <group ref={groupRef}>
      {wallBoxes.map((box, i) => {
        const set = variants[meshData[i].zone];
        return (
          <mesh
            key={i}
            position={[box.cx, WALL_HEIGHT / 2, box.cz]}
            geometry={meshData[i].geo}
            material={box.axis === "h" ? set.H : set.V}
          />
        );
      })}
    </group>
  );
}

// Painted landmark icons on a sparse, deterministic subset of wall faces.
const DECAL_RATE = 0.22; // candidate fraction of wall segments
const DECAL_MIN_DIST = 16; // keep landmarks at least this far apart (world units)
const DECAL_SIZE = 1.6;

function decalHash(x, z) {
  let h =
    (Math.round(x * 13.37) * 73856093) ^ (Math.round(z * 13.37) * 19349663);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}

export function WallDecals({ wallBoxes, game }) {
  const geo = useMemo(
    () => new THREE.PlaneGeometry(DECAL_SIZE, DECAL_SIZE),
    [],
  );
  const materials = useMemo(() => {
    const m = {};
    for (const kind of ICON_KINDS) {
      const tex = createIconTexture(kind);
      m[kind] = new THREE.MeshStandardMaterial({
        map: tex,
        emissiveMap: tex,
        emissive: new THREE.Color(0xffffff),
        emissiveIntensity: 0.1, // barely-there glow
        roughness: 0.95,
        metalness: 0,
        transparent: true, // washed-out: let the wall show through
        opacity: 0.5,
        depthWrite: false,
        alphaTest: 0.04,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      });
    }
    return m;
  }, []);

  const decals = useMemo(() => {
    const my = WALL_HEIGHT / 2;
    // 1) pick spread-out, deterministic landmark spots
    const chosen = [];
    for (const box of wallBoxes) {
      const h = decalHash(box.cx, box.cz);
      if (h % 1000 >= DECAL_RATE * 1000) continue;
      // Center the icon on a single cell's face (a cell midpoint), never on a
      // cell boundary — boundaries are where perpendicular walls attach and
      // would clip the drawing.
      const along = box.axis === "h" ? box.width : box.depth;
      const cells = Math.max(1, Math.round(along / CELL_SIZE));
      const mid = Math.floor(cells / 2) * CELL_SIZE + CELL_SIZE / 2;
      let x = box.cx,
        z = box.cz;
      if (box.axis === "h") x = box.cx - box.width / 2 + mid;
      else z = box.cz - box.depth / 2 + mid;
      // keep landmarks spread apart
      const tooClose = chosen.some((c) => {
        const dx = c.x - x,
          dz = c.z - z;
        return dx * dx + dz * dz < DECAL_MIN_DIST * DECAL_MIN_DIST;
      });
      if (tooClose) continue;
      chosen.push({ x, z, box, h });
    }
    // 2) at most one of each motif per level. If there are more spots than
    // motifs, sample evenly across them so the survivors stay spread out.
    let spots = chosen;
    const maxKinds = ICON_KINDS.length;
    if (spots.length > maxKinds) {
      const step = spots.length / maxKinds;
      spots = Array.from(
        { length: maxKinds },
        (_, i) => chosen[Math.floor(i * step)],
      );
    }
    // 3) assign a unique motif to each spot (deterministic linear probing)
    const used = new Array(maxKinds).fill(false);
    for (const c of spots) {
      let idx = c.h % maxKinds;
      while (used[idx]) idx = (idx + 1) % maxKinds;
      used[idx] = true;
      c.kind = ICON_KINDS[idx];
    }
    // 4) place the painting on a SINGLE face — the one that faces an open
    // corridor. If both sides are open, pick one deterministically by hash.
    const open = (cx, cy) =>
      cx >= 0 &&
      cx < game.width &&
      cy >= 0 &&
      cy < game.height &&
      (!game.mask || game.mask[cy][cx]);
    const out = [];
    for (const c of spots) {
      if (c.box.axis === "h") {
        const y = Math.round(c.box.cz / CELL_SIZE);
        const cellX = Math.floor(c.x / CELL_SIZE);
        const plus = open(cellX, y); // cell toward +Z
        const minus = open(cellX, y - 1); // cell toward -Z
        const zf = c.box.depth / 2 + 0.02;
        if (plus && minus ? (c.h & 1) === 0 : plus) {
          out.push({ pos: [c.x, my, c.z + zf], rotY: 0, kind: c.kind });
        } else {
          out.push({ pos: [c.x, my, c.z - zf], rotY: Math.PI, kind: c.kind });
        }
      } else {
        const gx = Math.round(c.box.cx / CELL_SIZE);
        const cellZ = Math.floor(c.z / CELL_SIZE);
        const plus = open(gx, cellZ); // cell toward +X
        const minus = open(gx - 1, cellZ); // cell toward -X
        const xf = c.box.width / 2 + 0.02;
        if (plus && minus ? (c.h & 1) === 0 : plus) {
          out.push({
            pos: [c.x + xf, my, c.z],
            rotY: Math.PI / 2,
            kind: c.kind,
          });
        } else {
          out.push({
            pos: [c.x - xf, my, c.z],
            rotY: -Math.PI / 2,
            kind: c.kind,
          });
        }
      }
    }
    return out;
  }, [wallBoxes, game.width, game.height, game.mask]);

  return (
    <group>
      {decals.map((d, i) => (
        <mesh
          key={i}
          position={d.pos}
          rotation={[0, d.rotY, 0]}
          geometry={geo}
          material={materials[d.kind]}
        />
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
