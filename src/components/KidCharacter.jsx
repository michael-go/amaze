import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// ─── Curved backwards cap brim — D-shaped with variable depth and natural droop ───
function BrimGeometry() {
  const geo = useMemo(() => {
    const innerR = 0.232;
    const halfArc = Math.PI * 0.195;
    const startA = Math.PI - halfArc;
    const endA = Math.PI + halfArc;
    const centerDepth = 0.19;
    const edgeDepth = 0.055;
    const radialSegs = 10;
    const arcSegs = 24;

    const verts = [];
    for (let j = 0; j <= arcSegs; j++) {
      const tBase = startA + (j / arcSegs) * (endA - startA);
      const af = Math.abs(j / arcSegs - 0.5) * 2;

      const depth = centerDepth - (centerDepth - edgeDepth) * af * af;

      for (let i = 0; i <= radialSegs; i++) {
        const rf = i / radialSegs;

        const arcExpand = 1.0 + (1 - rf) * 0.4;
        const t = Math.PI + (tBase - Math.PI) * arcExpand;
        const sx = Math.sin(t),
          cz = Math.cos(t);

        const ix = innerR * sx,
          iz = innerR * cz;
        const ox = ix * (1 + rf * 0.18);
        const oz = iz - depth;

        const x = ix + rf * (ox - ix);
        const z = iz + rf * (oz - iz);

        const droop = rf * rf * 0.036 * (1 - af * 0.3);

        const innerThin = 0.004,
          midThick = 0.022,
          outerThin = 0.009;
        const htRadial =
          rf < 0.35
            ? innerThin + (midThick - innerThin) * (rf / 0.35)
            : midThick - (midThick - outerThin) * ((rf - 0.35) / 0.65);
        const angularFade = Math.pow(1 - af, 0.4);
        const ht = htRadial * angularFade;

        const rise = (1 - rf) * (1 - rf) * 0.02;

        verts.push(x, ht - droop + rise, z);
        verts.push(x, -ht - droop + rise, z);
      }
    }

    const W = (radialSegs + 1) * 2;
    const idx = [];
    for (let j = 0; j < arcSegs; j++) {
      for (let i = 0; i < radialSegs; i++) {
        const b = j * W + i * 2,
          n = (j + 1) * W + i * 2;
        const aT = b,
          aB = b + 1,
          bT = b + 2,
          bB = b + 3,
          cT = n,
          cB = n + 1,
          dT = n + 2,
          dB = n + 3;
        idx.push(aT, bT, dT, aT, dT, cT);
        idx.push(aB, dB, bB, aB, cB, dB);
      }
    }
    for (let j = 0; j < arcSegs; j++) {
      const o = j * W + radialSegs * 2,
        p = (j + 1) * W + radialSegs * 2;
      idx.push(o, o + 1, p + 1, o, p + 1, p);
    }
    for (let j = 0; j < arcSegs; j++) {
      const o = j * W,
        p = (j + 1) * W;
      idx.push(o, p, p + 1, o, p + 1, o + 1);
    }
    for (let i = 0; i < radialSegs; i++) {
      idx.push(i * 2, i * 2 + 1, i * 2 + 3, i * 2, i * 2 + 3, i * 2 + 2);
      const L = arcSegs * W;
      idx.push(
        L + i * 2,
        L + i * 2 + 2,
        L + i * 2 + 3,
        L + i * 2,
        L + i * 2 + 3,
        L + i * 2 + 1,
      );
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }, []);
  return <primitive object={geo} />;
}

export default function KidCharacter({
  playerPos,
  yaw,
  isMoving,
  activePower,
  playerY,
}) {
  const groupRef = useRef();
  const leftLegRef = useRef();
  const rightLegRef = useRef();
  const leftArmRef = useRef();
  const rightArmRef = useRef();
  const auraRef = useRef();

  const isGhost = activePower === "ghost";
  const isFlying = activePower === "fly";

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const p = playerPos.current;
    const yOff = playerY ? playerY.current : 0;
    groupRef.current.position.set(p.x, yOff, p.z);
    groupRef.current.rotation.y = yaw.current + Math.PI;

    if (isFlying) {
      // Flying pose: arms out to sides, legs trailing back, gentle sway
      const t = clock.elapsedTime;
      const flap = Math.sin(t * 2) * 0.12;
      if (leftArmRef.current) {
        leftArmRef.current.rotation.set(0, 0, -1.3 - flap);
      }
      if (rightArmRef.current) {
        rightArmRef.current.rotation.set(0, 0, 1.3 + flap);
      }
      if (leftLegRef.current) leftLegRef.current.rotation.set(0.3, 0, 0);
      if (rightLegRef.current) rightLegRef.current.rotation.set(0.3, 0, 0);
      // Gentle hovering bob
      groupRef.current.position.y = yOff + Math.sin(t * 1.5) * 0.08;
    } else if (isMoving.current) {
      const t = clock.elapsedTime * 8;
      const swing = Math.sin(t) * 0.4;
      if (leftLegRef.current) leftLegRef.current.rotation.x = swing;
      if (rightLegRef.current) rightLegRef.current.rotation.x = -swing;
      if (leftArmRef.current) {
        leftArmRef.current.rotation.x = -swing;
        leftArmRef.current.rotation.z = 0;
      }
      if (rightArmRef.current) {
        rightArmRef.current.rotation.x = swing;
        rightArmRef.current.rotation.z = 0;
      }
      groupRef.current.position.y = yOff + Math.abs(Math.sin(t)) * 0.05;
    } else {
      if (leftLegRef.current) leftLegRef.current.rotation.x = 0;
      if (rightLegRef.current) rightLegRef.current.rotation.x = 0;
      if (leftArmRef.current) {
        leftArmRef.current.rotation.x = 0;
        leftArmRef.current.rotation.z = 0;
      }
      if (rightArmRef.current) {
        rightArmRef.current.rotation.x = 0;
        rightArmRef.current.rotation.z = 0;
      }
    }

    // Aura pulse
    if (auraRef.current) {
      const t = clock.elapsedTime;
      auraRef.current.scale.setScalar(1 + Math.sin(t * 4) * 0.15);
      auraRef.current.material.opacity = 0.15 + Math.sin(t * 3) * 0.08;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Power-up aura */}
      {(isGhost || isFlying) && (
        <mesh ref={auraRef} position={[0, 0.85, 0]}>
          <sphereGeometry args={[0.6, 16, 16]} />
          <meshStandardMaterial
            color={isGhost ? "#44aaff" : "#ffcc00"}
            emissive={isGhost ? "#2266ff" : "#ff8800"}
            emissiveIntensity={0.5}
            transparent
            opacity={0.2}
            side={2}
          />
        </mesh>
      )}
      <mesh position={[0, 1.35, 0]}>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshStandardMaterial color="#fdd9b5" />
      </mesh>
      <mesh position={[0, 1.37, 0]}>
        <sphereGeometry args={[0.24, 16, 12, 0, Math.PI * 2, 0, 1.25]} />
        <meshStandardMaterial color="#2255cc" />
      </mesh>
      <mesh position={[0, 1.446, 0]}>
        <BrimGeometry />
        <meshStandardMaterial color="#1a44aa" />
      </mesh>
      <mesh position={[-0.08, 1.37, 0.18]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      <mesh position={[0.08, 1.37, 0.18]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color="#222" />
      </mesh>

      <mesh position={[0, 0.95, 0]}>
        <boxGeometry args={[0.34, 0.45, 0.22]} />
        <meshStandardMaterial color="#e63946" />
      </mesh>

      <mesh position={[0, 0.65, 0.001]}>
        <boxGeometry args={[0.34, 0.2, 0.22]} />
        <meshStandardMaterial color="#457b9d" />
      </mesh>

      <group position={[-0.11, 0.55, 0]} ref={leftLegRef}>
        <mesh position={[0, -0.2, 0]}>
          <boxGeometry args={[0.13, 0.4, 0.15]} />
          <meshStandardMaterial color="#457b9d" />
        </mesh>
        <mesh position={[0, -0.42, 0.03]}>
          <boxGeometry args={[0.15, 0.08, 0.22]} />
          <meshStandardMaterial color="#333" />
        </mesh>
      </group>

      <group position={[0.11, 0.55, 0]} ref={rightLegRef}>
        <mesh position={[0, -0.2, 0]}>
          <boxGeometry args={[0.13, 0.4, 0.15]} />
          <meshStandardMaterial color="#457b9d" />
        </mesh>
        <mesh position={[0, -0.42, 0.03]}>
          <boxGeometry args={[0.15, 0.08, 0.22]} />
          <meshStandardMaterial color="#333" />
        </mesh>
      </group>

      <group position={[-0.25, 1.1, 0]} ref={leftArmRef}>
        <mesh position={[0, -0.18, 0]}>
          <boxGeometry args={[0.11, 0.36, 0.13]} />
          <meshStandardMaterial color="#e63946" />
        </mesh>
        <mesh position={[0, -0.38, 0]}>
          <sphereGeometry args={[0.07, 8, 8]} />
          <meshStandardMaterial color="#fdd9b5" />
        </mesh>
      </group>

      <group position={[0.25, 1.1, 0]} ref={rightArmRef}>
        <mesh position={[0, -0.18, 0]}>
          <boxGeometry args={[0.11, 0.36, 0.13]} />
          <meshStandardMaterial color="#e63946" />
        </mesh>
        <mesh position={[0, -0.38, 0]}>
          <sphereGeometry args={[0.07, 8, 8]} />
          <meshStandardMaterial color="#fdd9b5" />
        </mesh>
      </group>
    </group>
  );
}
