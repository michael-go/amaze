import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { isMuted, getCtx } from "../lib/sounds";

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
  frozen,
  playerY,
  won,
}) {
  const groupRef = useRef();
  const leftLegRef = useRef();
  const rightLegRef = useRef();
  const leftArmRef = useRef();
  const rightArmRef = useRef();
  const auraRef = useRef();
  const prevSwing = useRef(0);

  const isGhost = activePower === "ghost";
  const isFlying = activePower === "fly";

  // All the solid body parts cast shadows (the transparent aura must not —
  // it would throw a solid blob). Re-run when the aura mounts/unmounts.
  useEffect(() => {
    groupRef.current?.traverse((o) => {
      if (o.isMesh && !o.material?.transparent) o.castShadow = true;
    });
  }, [isGhost, isFlying]);

  const playFootstep = () => {
    if (isMuted()) return;
    const ctx = getCtx();
    // Soft step: short filtered noise with gentle attack
    const duration = 0.07;
    const bufSize = Math.ceil(ctx.sampleRate * duration);
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      const t = i / bufSize;
      // Soft attack, quick fade
      const env = Math.sin(t * Math.PI) * (1 - t);
      data[i] = (Math.random() * 2 - 1) * env;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const lpf = ctx.createBiquadFilter();
    lpf.type = "lowpass";
    lpf.frequency.value = 180;
    const hpf = ctx.createBiquadFilter();
    hpf.type = "highpass";
    hpf.frequency.value = 60;
    const gain = ctx.createGain();
    gain.gain.value = 2.5;
    src.connect(lpf).connect(hpf).connect(gain).connect(ctx.destination);
    src.start();
  };

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const p = playerPos.current;
    // -0.08 grounds the shoes: the foot boxes bottom out at local y=0.08,
    // so without it the kid hovers visibly above the floor
    const yOff = (playerY ? playerY.current : 0) - 0.08;
    groupRef.current.position.set(p.x, yOff, p.z);
    groupRef.current.rotation.y = yaw.current + Math.PI;

    if (won && !isFlying) {
      // Victory: arms up, hopping in place
      const t = clock.elapsedTime;
      const hop = Math.abs(Math.sin(t * 5)) * 0.18;
      groupRef.current.position.y = yOff + hop;
      if (leftArmRef.current) leftArmRef.current.rotation.set(0, 0, -2.5);
      if (rightArmRef.current) rightArmRef.current.rotation.set(0, 0, 2.5);
      if (leftLegRef.current) leftLegRef.current.rotation.x = 0;
      if (rightLegRef.current) rightLegRef.current.rotation.x = 0;
    } else if (isFlying) {
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
    } else if (isMoving.current && !frozen) {
      const t = clock.elapsedTime * 8;
      const swing = Math.sin(t) * 0.4;
      // Footstep on zero-crossings
      if (prevSwing.current * swing < 0) playFootstep();
      prevSwing.current = swing;
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

      <RoundedBox
        args={[0.34, 0.45, 0.22]}
        radius={0.08}
        smoothness={4}
        position={[0, 0.95, 0]}
      >
        <meshStandardMaterial color="#e63946" />
      </RoundedBox>

      <RoundedBox
        args={[0.34, 0.22, 0.22]}
        radius={0.07}
        smoothness={4}
        position={[0, 0.65, 0.001]}
      >
        <meshStandardMaterial color="#457b9d" />
      </RoundedBox>

      <group position={[-0.11, 0.55, 0]} ref={leftLegRef}>
        <RoundedBox
          args={[0.13, 0.4, 0.15]}
          radius={0.05}
          smoothness={4}
          position={[0, -0.2, 0]}
        >
          <meshStandardMaterial color="#457b9d" />
        </RoundedBox>
        <RoundedBox
          args={[0.15, 0.1, 0.24]}
          radius={0.045}
          smoothness={4}
          position={[0, -0.42, 0.03]}
        >
          <meshStandardMaterial color="#333" />
        </RoundedBox>
      </group>

      <group position={[0.11, 0.55, 0]} ref={rightLegRef}>
        <RoundedBox
          args={[0.13, 0.4, 0.15]}
          radius={0.05}
          smoothness={4}
          position={[0, -0.2, 0]}
        >
          <meshStandardMaterial color="#457b9d" />
        </RoundedBox>
        <RoundedBox
          args={[0.15, 0.1, 0.24]}
          radius={0.045}
          smoothness={4}
          position={[0, -0.42, 0.03]}
        >
          <meshStandardMaterial color="#333" />
        </RoundedBox>
      </group>

      <group position={[-0.205, 1.12, 0]} ref={leftArmRef}>
        <RoundedBox
          args={[0.11, 0.36, 0.13]}
          radius={0.05}
          smoothness={4}
          position={[0, -0.18, 0]}
        >
          <meshStandardMaterial color="#e63946" />
        </RoundedBox>
        <mesh position={[0, -0.38, 0]}>
          <sphereGeometry args={[0.07, 8, 8]} />
          <meshStandardMaterial color="#fdd9b5" />
        </mesh>
      </group>

      <group position={[0.205, 1.12, 0]} ref={rightArmRef}>
        <RoundedBox
          args={[0.11, 0.36, 0.13]}
          radius={0.05}
          smoothness={4}
          position={[0, -0.18, 0]}
        >
          <meshStandardMaterial color="#e63946" />
        </RoundedBox>
        <mesh position={[0, -0.38, 0]}>
          <sphereGeometry args={[0.07, 8, 8]} />
          <meshStandardMaterial color="#fdd9b5" />
        </mesh>
      </group>
    </group>
  );
}
