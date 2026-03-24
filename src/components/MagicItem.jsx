import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { MAGIC_GHOST, MAGIC_TRAIL, MAGIC_STEPS } from "../lib/maze";

const ITEM_COLORS = {
  ghost: { color: "#44aaff", emissive: "#2266ff" },
  fly: { color: "#ffcc00", emissive: "#ff8800" },
  trail: { color: "#44ee88", emissive: "#22aa55" },
  steps: { color: "#ff44aa", emissive: "#cc2288" },
};

export default function MagicItem({ item }) {
  const groupRef = useRef();
  const glowRef = useRef();

  const { color, emissive } = ITEM_COLORS[item.type] || ITEM_COLORS.ghost;

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (groupRef.current) {
      groupRef.current.position.y = 0.8 + Math.sin(t * 2) * 0.15;
      groupRef.current.rotation.y = t * 1.5;
    }
    if (glowRef.current) {
      glowRef.current.intensity = 3 + Math.sin(t * 3) * 1.5;
    }
  });

  return (
    <group position={[item.worldX, 0, item.worldZ]}>
      <group ref={groupRef}>
        {item.type === MAGIC_GHOST ? (
          <GhostCrystal color={color} emissive={emissive} />
        ) : item.type === MAGIC_TRAIL ? (
          <TrailCompass color={color} emissive={emissive} />
        ) : item.type === MAGIC_STEPS ? (
          <StepsHeart color={color} emissive={emissive} />
        ) : (
          <FlyWings color={color} emissive={emissive} />
        )}
      </group>
      <pointLight
        ref={glowRef}
        position={[0, 0.8, 0]}
        color={color}
        intensity={3}
        distance={4}
        decay={2}
      />
      {/* Ground glow circle */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[0.5, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.3}
          transparent
          opacity={0.3}
        />
      </mesh>
    </group>
  );
}

function GhostCrystal({ color, emissive }) {
  return (
    <group>
      {/* Central crystal */}
      <mesh>
        <octahedronGeometry args={[0.2, 0]} />
        <meshStandardMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={0.6}
          transparent
          opacity={0.8}
          metalness={0.3}
          roughness={0.1}
        />
      </mesh>
      {/* Outer glow sphere */}
      <mesh>
        <sphereGeometry args={[0.28, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={0.3}
          transparent
          opacity={0.2}
        />
      </mesh>
    </group>
  );
}

function FlyWings({ color, emissive }) {
  return (
    <group>
      {/* Central orb */}
      <mesh>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={0.8}
          metalness={0.5}
          roughness={0.1}
        />
      </mesh>
      {/* Left wing */}
      <mesh position={[-0.18, 0.02, 0]} rotation={[0, 0, 0.3]}>
        <boxGeometry args={[0.22, 0.02, 0.12]} />
        <meshStandardMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={0.5}
          transparent
          opacity={0.7}
        />
      </mesh>
      {/* Right wing */}
      <mesh position={[0.18, 0.02, 0]} rotation={[0, 0, -0.3]}>
        <boxGeometry args={[0.22, 0.02, 0.12]} />
        <meshStandardMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={0.5}
          transparent
          opacity={0.7}
        />
      </mesh>
    </group>
  );
}

function TrailCompass({ color, emissive }) {
  return (
    <group>
      {/* Compass ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.16, 0.03, 8, 24]} />
        <meshStandardMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={0.6}
          metalness={0.4}
          roughness={0.2}
        />
      </mesh>
      {/* Center dot */}
      <mesh>
        <sphereGeometry args={[0.07, 12, 12]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive={color}
          emissiveIntensity={0.8}
        />
      </mesh>
      {/* Arrow pointer */}
      <mesh position={[0, 0, 0.12]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.04, 0.1, 6]} />
        <meshStandardMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={0.5}
        />
      </mesh>
    </group>
  );
}

function StepsHeart({ color, emissive }) {
  return (
    <group>
      {/* Two spheres forming a heart-like top */}
      <mesh position={[-0.08, 0.04, 0]}>
        <sphereGeometry args={[0.1, 12, 12]} />
        <meshStandardMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={0.7}
          metalness={0.3}
          roughness={0.2}
        />
      </mesh>
      <mesh position={[0.08, 0.04, 0]}>
        <sphereGeometry args={[0.1, 12, 12]} />
        <meshStandardMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={0.7}
          metalness={0.3}
          roughness={0.2}
        />
      </mesh>
      {/* Bottom point */}
      <mesh position={[0, -0.08, 0]} rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[0.12, 0.12, 0.12]} />
        <meshStandardMaterial
          color={color}
          emissive={emissive}
          emissiveIntensity={0.7}
          metalness={0.3}
          roughness={0.2}
        />
      </mesh>
    </group>
  );
}
