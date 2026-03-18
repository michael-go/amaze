import { useRef, useEffect, useState, useCallback } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useKeyboardControls } from './useKeyboardControls'
import * as THREE from 'three'
import { Sky, Stars } from '@react-three/drei'
import { getWallBoxes, CELL_SIZE, WALL_HEIGHT } from './maze'

const PLAYER_SPEED = 5
const TURN_SPEED = 2.5
const PLAYER_RADIUS = 0.4
const EXIT_RADIUS = 1.2

export default function MazeScene({ game, topView, onWin, won }) {
  const { camera, gl } = useThree()
  const keys = useKeyboardControls()

  const playerPos = useRef(new THREE.Vector3(...game.startPos))
  const yaw = useRef(Math.PI)   // horizontal angle — start facing into the maze
  const pitch = useRef(0) // vertical angle
  const pointerLocked = useRef(false)

  const wallBoxes = getWallBoxes(game.cells)
  const wallBoxesRef = useRef(wallBoxes)
  wallBoxesRef.current = wallBoxes

  // Reset player when game changes
  useEffect(() => {
    playerPos.current.set(...game.startPos)
    yaw.current = Math.PI
    pitch.current = 0
  }, [game])

  // Pointer lock for mouse look
  useEffect(() => {
    if (topView || won) return

    const canvas = gl.domElement

    const onLock = () => { pointerLocked.current = true }
    const onUnlock = () => { pointerLocked.current = false }
    const onMove = (e) => {
      if (!pointerLocked.current) return
      yaw.current -= e.movementX * 0.002
      pitch.current -= e.movementY * 0.002
      pitch.current = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, pitch.current))
    }
    const onClick = () => {
      if (!pointerLocked.current) canvas.requestPointerLock()
    }

    canvas.addEventListener('click', onClick)
    document.addEventListener('pointerlockchange', onLock)
    document.addEventListener('pointerlockchange', onUnlock)
    document.addEventListener('mousemove', onMove)

    document.addEventListener('pointerlockchange', () => {
      pointerLocked.current = document.pointerLockElement === canvas
    })

    return () => {
      canvas.removeEventListener('click', onClick)
      document.removeEventListener('pointerlockchange', onLock)
      document.removeEventListener('pointerlockchange', onUnlock)
      document.removeEventListener('mousemove', onMove)
      if (document.pointerLockElement) document.exitPointerLock()
    }
  }, [gl, topView, won])

  // T key toggles top view — handled in parent, but we need to handle key press
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 't' || e.key === 'T') {
        // handled in HUD toggle — no-op here, parent handles via re-render
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function collidesWithWall(nx, nz) {
    for (const box of wallBoxesRef.current) {
      const hw = box.width / 2 + PLAYER_RADIUS
      const hd = box.depth / 2 + PLAYER_RADIUS
      if (
        nx > box.cx - hw && nx < box.cx + hw &&
        nz > box.cz - hd && nz < box.cz + hd
      ) return true
    }
    return false
  }

  useFrame((_, delta) => {
    if (won) return

    const pos = playerPos.current

    if (!topView) {
      // Keyboard turning
      if (keys.turnLeft) yaw.current += TURN_SPEED * delta
      if (keys.turnRight) yaw.current -= TURN_SPEED * delta

      // Movement
      const forward = new THREE.Vector3(-Math.sin(yaw.current), 0, -Math.cos(yaw.current))
      const right = new THREE.Vector3(Math.cos(yaw.current), 0, -Math.sin(yaw.current))

      let dx = 0, dz = 0
      if (keys.forward) { dx += forward.x; dz += forward.z }
      if (keys.backward) { dx -= forward.x; dz -= forward.z }
      if (keys.left) { dx -= right.x; dz -= right.z }
      if (keys.right) { dx += right.x; dz += right.z }

      const len = Math.sqrt(dx * dx + dz * dz)
      if (len > 0) {
        dx = (dx / len) * PLAYER_SPEED * delta
        dz = (dz / len) * PLAYER_SPEED * delta

        // Separate axis collision
        const nx = pos.x + dx
        const nz = pos.z + dz

        if (!collidesWithWall(nx, pos.z)) pos.x = nx
        if (!collidesWithWall(pos.x, nz)) pos.z = nz
      }

      // First person camera
      camera.position.set(pos.x, 1.6, pos.z)
      camera.rotation.order = 'YXZ'
      camera.rotation.y = yaw.current
      camera.rotation.x = pitch.current
    } else {
      // Top-down camera
      const cx = game.width * CELL_SIZE / 2
      const cz = game.height * CELL_SIZE / 2
      const maxDim = Math.max(game.width, game.height) * CELL_SIZE
      camera.position.set(cx, maxDim * 0.9, cz)
      camera.lookAt(cx, 0, cz)
      camera.up.set(0, 0, -1)
    }

    // Check win
    const ex = game.exitPos[0]
    const ez = game.exitPos[2]
    const dist = Math.sqrt((pos.x - ex) ** 2 + (pos.z - ez) ** 2)
    if (dist < EXIT_RADIUS) {
      onWin()
    }
  })

  return (
    <>
      <ambientLight intensity={topView ? 1.5 : 1.0} />
      <hemisphereLight args={['#8888aa', '#444466', 0.6]} />
      {!topView && <PlayerLight playerPos={playerPos} />}
      {topView && (
        <directionalLight
          position={[game.width * CELL_SIZE / 2, 30, game.height * CELL_SIZE / 2]}
          intensity={1}
        />
      )}

      <Sky sunPosition={[100, 20, 100]} turbidity={8} rayleigh={2} mieCoefficient={0.005} mieDirectionalG={0.8} />
      <Stars radius={100} depth={50} count={3000} factor={4} fade speed={1} />

      <MazeFloor game={game} />
      <MazeWalls wallBoxes={wallBoxes} />
      <ExitMarker game={game} />
      <StartMarker game={game} />
      {topView && <PlayerMarker playerPos={playerPos} />}
    </>
  )
}

function MazeFloor({ game }) {
  const w = game.width * CELL_SIZE
  const h = game.height * CELL_SIZE
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[w / 2, 0, h / 2]} receiveShadow>
      <planeGeometry args={[w, h]} />
      <meshStandardMaterial color="#4a4a5e" roughness={0.8} />
    </mesh>
  )
}

function PlayerLight({ playerPos }) {
  const ref = useRef()
  useFrame(() => {
    if (ref.current) {
      ref.current.position.set(playerPos.current.x, 2.2, playerPos.current.z)
    }
  })
  return <pointLight ref={ref} intensity={20} distance={25} color="#ffeedd" decay={2} />
}

function MazeWalls({ wallBoxes }) {
  return (
    <>
      {wallBoxes.map((box, i) => (
        <mesh key={i} position={[box.cx, WALL_HEIGHT / 2, box.cz]} castShadow receiveShadow>
          <boxGeometry args={[box.width, WALL_HEIGHT, box.depth]} />
          <meshStandardMaterial color="#5a6a8e" roughness={0.5} metalness={0.1} />
        </mesh>
      ))}
    </>
  )
}

function ExitMarker({ game }) {
  const ref = useRef()
  useFrame(({ clock }) => {
    if (ref.current) {
      ref.current.position.y = 0.5 + Math.sin(clock.elapsedTime * 2) * 0.2
      ref.current.rotation.y = clock.elapsedTime
    }
  })
  return (
    <group position={[game.exitPos[0], 0, game.exitPos[2]]}>
      {/* Glowing exit pad */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[1, 32]} />
        <meshStandardMaterial color="#00ff88" emissive="#00ff88" emissiveIntensity={0.5} />
      </mesh>
      {/* Floating crystal */}
      <mesh ref={ref}>
        <octahedronGeometry args={[0.4]} />
        <meshStandardMaterial color="#00ff88" emissive="#00ff88" emissiveIntensity={1} wireframe />
      </mesh>
      <pointLight color="#00ff88" intensity={2} distance={6} />
    </group>
  )
}

function StartMarker({ game }) {
  return (
    <group position={[game.startPos[0], 0, game.startPos[2]]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[0.6, 32]} />
        <meshStandardMaterial color="#ff6b35" emissive="#ff6b35" emissiveIntensity={0.4} />
      </mesh>
    </group>
  )
}

function PlayerMarker({ playerPos }) {
  const ref = useRef()
  useFrame(() => {
    if (ref.current) {
      ref.current.position.set(playerPos.current.x, 2, playerPos.current.z)
    }
  })
  return (
    <mesh ref={ref}>
      <coneGeometry args={[0.3, 0.7, 6]} />
      <meshStandardMaterial color="#ff6b35" emissive="#ff6b35" emissiveIntensity={1} />
    </mesh>
  )
}
