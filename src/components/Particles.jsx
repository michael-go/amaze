import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const BURST_COUNT = 42;
const BURST_LIFE = 0.9;
const BURST_GRAVITY = 4.5;

// Shared soft round sprite so points don't render as hard squares
let softCircle = null;
function softCircleTexture() {
  if (softCircle) return softCircle;
  const S = 64;
  const canvas = document.createElement("canvas");
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext("2d");
  const grad = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.4, "rgba(255,255,255,0.6)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, S, S);
  softCircle = new THREE.CanvasTexture(canvas);
  return softCircle;
}

// One-shot sparkle burst (magic pickup, treasure found). Fades by decaying
// vertex colors to black under additive blending.
export function PickupBurst({ burst, onDone }) {
  const geoRef = useRef();
  const age = useRef(0);
  const done = useRef(false);

  const { velocities, baseColor } = useMemo(() => {
    const v = new Float32Array(BURST_COUNT * 3);
    for (let i = 0; i < BURST_COUNT; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 0.5 + Math.random() * 2.2;
      v[i * 3] = Math.cos(a) * r;
      v[i * 3 + 1] = 1.5 + Math.random() * 3;
      v[i * 3 + 2] = Math.sin(a) * r;
    }
    return { velocities: v, baseColor: new THREE.Color(burst.color) };
  }, [burst]);

  const positions = useMemo(() => {
    const p = new Float32Array(BURST_COUNT * 3);
    for (let i = 0; i < BURST_COUNT; i++) {
      p[i * 3] = burst.x;
      p[i * 3 + 1] = 0.8;
      p[i * 3 + 2] = burst.z;
    }
    return p;
  }, [burst]);

  const colors = useMemo(() => {
    const c = new Float32Array(BURST_COUNT * 3);
    for (let i = 0; i < BURST_COUNT; i++) {
      c[i * 3] = baseColor.r;
      c[i * 3 + 1] = baseColor.g;
      c[i * 3 + 2] = baseColor.b;
    }
    return c;
  }, [baseColor]);

  useFrame((_, delta) => {
    age.current += delta;
    const t = age.current;
    if (t > BURST_LIFE) {
      if (!done.current) {
        done.current = true;
        onDone();
      }
      return;
    }
    const pos = geoRef.current.attributes.position;
    const col = geoRef.current.attributes.color;
    const fade = 1 - t / BURST_LIFE;
    for (let i = 0; i < BURST_COUNT; i++) {
      pos.array[i * 3] = burst.x + velocities[i * 3] * t;
      pos.array[i * 3 + 1] =
        0.8 + velocities[i * 3 + 1] * t - BURST_GRAVITY * t * t;
      pos.array[i * 3 + 2] = burst.z + velocities[i * 3 + 2] * t;
      col.array[i * 3] = baseColor.r * fade;
      col.array[i * 3 + 1] = baseColor.g * fade;
      col.array[i * 3 + 2] = baseColor.b * fade;
    }
    pos.needsUpdate = true;
    col.needsUpdate = true;
  });

  return (
    <points frustumCulled={false}>
      <bufferGeometry ref={geoRef}>
        <bufferAttribute
          attach="attributes-position"
          count={BURST_COUNT}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={BURST_COUNT}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.16}
        map={softCircleTexture()}
        vertexColors
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}
