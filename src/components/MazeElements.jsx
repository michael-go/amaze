import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { CELL_SIZE, WALL_HEIGHT } from '../lib/maze'
import { createWallTexture } from '../lib/wallTexture'

export function MazeFloor({ game, theme }) {
  const w = game.width * CELL_SIZE
  const h = game.height * CELL_SIZE
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[w / 2, 0, h / 2]}>
      <planeGeometry args={[w, h]} />
      <meshStandardMaterial color={theme.floor} roughness={0.9} />
    </mesh>
  )
}

export function PlayerLight({ playerPos }) {
  const ref = useRef()
  useFrame(() => {
    if (ref.current) {
      ref.current.position.set(playerPos.current.x, 2.2, playerPos.current.z)
    }
  })
  return <pointLight ref={ref} intensity={20} distance={25} color="#ffeedd" decay={2} />
}

export function MazeWalls({ wallBoxes, theme }) {
  const tex = useMemo(() => createWallTexture(theme), [theme])
  const matH = useMemo(() => new THREE.MeshStandardMaterial({
    map: tex,
    roughness: theme.rough,
    metalness: theme.metal,
    emissive: new THREE.Color(theme.emissive),
  }), [tex, theme])
  const matV = useMemo(() => new THREE.MeshStandardMaterial({
    map: tex,
    roughness: theme.rough,
    metalness: theme.metal,
    emissive: new THREE.Color(theme.emissive),
    polygonOffset: true,
    polygonOffsetFactor: 2,
    polygonOffsetUnit: 2,
  }), [tex, theme])

  return (
    <>
      {wallBoxes.map((box, i) => (
        <mesh key={i} position={[box.cx, WALL_HEIGHT / 2, box.cz]} material={box.axis === 'h' ? matH : matV}>
          <boxGeometry args={[box.width, WALL_HEIGHT, box.depth]} />
        </mesh>
      ))}
    </>
  )
}

export function StartMarker({ game }) {
  return (
    <group position={[game.startPos[0], 0, game.startPos[2]]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[0.6, 32]} />
        <meshStandardMaterial color="#ff6b35" emissive="#ff6b35" emissiveIntensity={0.4} />
      </mesh>
    </group>
  )
}
