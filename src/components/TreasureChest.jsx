import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'

export default function TreasureChest({ position }) {
  const lidRef = useRef()
  const glowRef = useRef()

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (lidRef.current) {
      lidRef.current.rotation.x = -0.2 - Math.sin(t * 1.5) * 0.15
    }
    if (glowRef.current) {
      glowRef.current.intensity = 2 + Math.sin(t * 2) * 0.8
    }
  })

  return (
    <group position={[position[0], 0, position[2]]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[0.9, 32]} />
        <meshStandardMaterial color="#ffd700" emissive="#ffd700" emissiveIntensity={0.2} transparent opacity={0.35} />
      </mesh>

      <mesh position={[0, 0.25, 0]}>
        <boxGeometry args={[0.7, 0.4, 0.5]} />
        <meshStandardMaterial color="#8B4513" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.44, 0]}>
        <boxGeometry args={[0.74, 0.04, 0.54]} />
        <meshStandardMaterial color="#daa520" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.3, 0.26]}>
        <boxGeometry args={[0.12, 0.15, 0.02]} />
        <meshStandardMaterial color="#daa520" metalness={0.9} roughness={0.1} />
      </mesh>

      <group position={[0, 0.45, -0.25]} ref={lidRef}>
        <mesh position={[0, 0.13, 0.25]}>
          <boxGeometry args={[0.7, 0.22, 0.5]} />
          <meshStandardMaterial color="#a0522d" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.23, 0.25]}>
          <boxGeometry args={[0.74, 0.04, 0.54]} />
          <meshStandardMaterial color="#daa520" metalness={0.8} roughness={0.2} />
        </mesh>
      </group>

      <pointLight ref={glowRef} position={[0, 0.5, 0]} color="#ffd700" intensity={2} distance={3} decay={2} />

      {[[-0.15, 0.35, 0], [0.1, 0.33, -0.05], [0, 0.38, 0.08], [0.15, 0.36, -0.1], [-0.08, 0.4, 0.05]].map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.06, 8, 4]} />
          <meshStandardMaterial color="#ffd700" emissive="#ffd700" emissiveIntensity={0.5} metalness={0.9} roughness={0.1} />
        </mesh>
      ))}
    </group>
  )
}
