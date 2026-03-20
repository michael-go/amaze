import { useRef, useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useKeyboardControls } from './useKeyboardControls'
import * as THREE from 'three'
import { Sky, Stars } from '@react-three/drei'
import { getWallBoxes, CELL_SIZE, WALL_HEIGHT } from './maze'

const PLAYER_SPEED = 5
const TURN_SPEED = 2.5
const PLAYER_RADIUS = 0.4
const EXIT_RADIUS = 1.2

// Third-person camera offset
const CAM_BEHIND = 2.0
const CAM_HEIGHT = 2.0
const CAM_LERP = 5 // smoothing

export default function MazeScene({ game, topView, onWin, won, frozen }) {
  const { camera, gl } = useThree()
  const keys = useKeyboardControls()

  const playerPos = useRef(new THREE.Vector3(...game.startPos))
  const yaw = useRef(Math.PI)
  const pitch = useRef(0)
  const isMoving = useRef(false)
  const pointerLocked = useRef(false)

  const wallBoxes = useMemo(() => getWallBoxes(game.cells), [game.cells])
  const wallBoxesRef = useRef(wallBoxes)
  wallBoxesRef.current = wallBoxes

  useEffect(() => {
    playerPos.current.set(...game.startPos)
    yaw.current = Math.PI
    pitch.current = 0
  }, [game])

  // Pointer lock for mouse look
  useEffect(() => {
    if (topView || won) return
    const canvas = gl.domElement

    const onMove = (e) => {
      if (!pointerLocked.current) return
      yaw.current -= e.movementX * 0.002
      pitch.current -= e.movementY * 0.002
      pitch.current = Math.max(-Math.PI / 6, Math.min(Math.PI / 6, pitch.current))
    }
    const onClick = () => {
      if (!pointerLocked.current) canvas.requestPointerLock()
    }
    const onLockChange = () => {
      pointerLocked.current = document.pointerLockElement === canvas
    }

    canvas.addEventListener('click', onClick)
    document.addEventListener('pointerlockchange', onLockChange)
    document.addEventListener('mousemove', onMove)

    return () => {
      canvas.removeEventListener('click', onClick)
      document.removeEventListener('pointerlockchange', onLockChange)
      document.removeEventListener('mousemove', onMove)
      if (document.pointerLockElement) document.exitPointerLock()
    }
  }, [gl, topView, won])

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
    const pos = playerPos.current

    if (topView) {
      // Top-down camera
      camera.up.set(0, 0, -1)
      const cx = game.width * CELL_SIZE / 2
      const cz = game.height * CELL_SIZE / 2
      const maxDim = Math.max(game.width, game.height) * CELL_SIZE
      camera.position.set(cx, maxDim * 0.9, cz)
      camera.lookAt(cx, 0, cz)

      if (!won && !frozen) {
        const ex = game.exitPos[0]
        const ez = game.exitPos[2]
        const dist = Math.sqrt((pos.x - ex) ** 2 + (pos.z - ez) ** 2)
        if (dist < EXIT_RADIUS) onWin()
      }
      return
    }

    if (won || frozen) return

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
      isMoving.current = len > 0
      if (len > 0) {
        dx = (dx / len) * PLAYER_SPEED * delta
        dz = (dz / len) * PLAYER_SPEED * delta

        const nx = pos.x + dx
        const nz = pos.z + dz
        if (!collidesWithWall(nx, pos.z)) pos.x = nx
        if (!collidesWithWall(pos.x, nz)) pos.z = nz
      }

      // Third-person camera: behind and above the player
      camera.up.set(0, 1, 0)
      const idealX = pos.x + Math.sin(yaw.current) * CAM_BEHIND
      const idealZ = pos.z + Math.cos(yaw.current) * CAM_BEHIND
      const idealY = CAM_HEIGHT

      camera.position.set(
        THREE.MathUtils.lerp(camera.position.x, idealX, CAM_LERP * delta),
        THREE.MathUtils.lerp(camera.position.y, idealY, CAM_LERP * delta),
        THREE.MathUtils.lerp(camera.position.z, idealZ, CAM_LERP * delta),
      )

      // Look at a point slightly above the player
      camera.lookAt(pos.x, 1.0, pos.z)
    }

    // Check win
    const ex = game.exitPos[0]
    const ez = game.exitPos[2]
    const dist = Math.sqrt((pos.x - ex) ** 2 + (pos.z - ez) ** 2)
    if (dist < EXIT_RADIUS) onWin()
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
      <TreasureChest position={game.exitPos} />
      <StartMarker game={game} />
      <KidCharacter playerPos={playerPos} yaw={yaw} isMoving={isMoving} />
    </>
  )
}

// ─── Curved backwards cap brim — D-shaped with variable depth and natural droop ───
function BrimGeometry() {
  const geo = useMemo(() => {
    const innerR = 0.232        // slightly outside cap sphere for clean edge
    const halfArc = Math.PI * 0.195  // ~70° total, narrow but wraps naturally
    const startA = Math.PI - halfArc
    const endA   = Math.PI + halfArc
    const centerDepth = 0.190   // brim extends this far at center (back)
    const edgeDepth   = 0.055   // brim depth at arc ends (tapers in more)
    const radialSegs  = 10
    const arcSegs     = 24

    const verts = []
    for (let j = 0; j <= arcSegs; j++) {
      const tBase = startA + (j / arcSegs) * (endA - startA)
      const af = Math.abs(j / arcSegs - 0.5) * 2  // 0 at center, 1 at edges

      // Variable depth creates D-shape: deeper at back-center, shallower at edges
      const depth = centerDepth - (centerDepth - edgeDepth) * af * af

      for (let i = 0; i <= radialSegs; i++) {
        const rf = i / radialSegs

        // Inner arc is wider — spreads 40% more at rf=0, converges to base width at rf=1
        const arcExpand = 1.0 + (1 - rf) * 0.40
        const t = Math.PI + (tBase - Math.PI) * arcExpand
        const sx = Math.sin(t), cz = Math.cos(t)

        // Inner anchor point follows the cap sphere arc
        const ix = innerR * sx, iz = innerR * cz
        // Outer point: extends in -Z direction (back) + slight outward X spread
        // This creates the D-shape (not a concentric arc)
        const ox = ix * (1 + rf * 0.18)         // modest x spread for D-shape
        const oz = iz - depth                    // extends backward

        const x = ix + rf * (ox - ix)
        const z = iz + rf * (oz - iz)

        // Droop: outer edge sags, center sags more than edges
        const droop = rf * rf * 0.036 * (1 - af * 0.3)

        // Thickness: tapers to near-zero at inner edge (gradual attachment),
        // swells to peak around rf≈0.35, then tapers toward outer edge
        const innerThin = 0.004, midThick = 0.022, outerThin = 0.009
        const htRadial = rf < 0.35
          ? innerThin + (midThick - innerThin) * (rf / 0.35)
          : midThick - (midThick - outerThin) * ((rf - 0.35) / 0.65)
        // Angular fade: taper to zero at arc ends so side edges dissolve smoothly
        const angularFade = Math.pow(1 - af, 0.4)
        const ht = htRadial * angularFade

        // Rise: inner edge curves upward, making brim emerge smoothly from under the cap
        const rise = (1 - rf) * (1 - rf) * 0.020

        verts.push(x,  ht - droop + rise, z)   // top vertex
        verts.push(x, -ht - droop + rise, z)   // bottom vertex
      }
    }

    const W = (radialSegs + 1) * 2
    const idx = []
    for (let j = 0; j < arcSegs; j++) {
      for (let i = 0; i < radialSegs; i++) {
        const b = j * W + i * 2, n = (j+1) * W + i * 2
        const aT=b, aB=b+1, bT=b+2, bB=b+3, cT=n, cB=n+1, dT=n+2, dB=n+3
        idx.push(aT,bT,dT, aT,dT,cT)  // top
        idx.push(aB,dB,bB, aB,cB,dB)  // bottom
      }
    }
    for (let j = 0; j < arcSegs; j++) {
      const o = j*W + radialSegs*2, p = (j+1)*W + radialSegs*2
      idx.push(o,o+1,p+1, o,p+1,p)    // outer edge
    }
    for (let j = 0; j < arcSegs; j++) {
      const o = j*W, p = (j+1)*W
      idx.push(o,p,p+1, o,p+1,o+1)    // inner edge
    }
    for (let i = 0; i < radialSegs; i++) {
      idx.push(i*2, i*2+1, i*2+3, i*2, i*2+3, i*2+2)  // start cap
      const L = arcSegs*W
      idx.push(L+i*2, L+i*2+2, L+i*2+3, L+i*2, L+i*2+3, L+i*2+1)  // end cap
    }

    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
    g.setIndex(idx)
    g.computeVertexNormals()
    return g
  }, [])
  return <primitive object={geo} />
}

// ─── Kid character built from primitives ───
function KidCharacter({ playerPos, yaw, isMoving }) {
  const groupRef = useRef()
  const leftLegRef = useRef()
  const rightLegRef = useRef()
  const leftArmRef = useRef()
  const rightArmRef = useRef()

  useFrame(({ clock }) => {
    if (!groupRef.current) return
    const p = playerPos.current
    groupRef.current.position.set(p.x, 0, p.z)
    groupRef.current.rotation.y = yaw.current + Math.PI // face forward

    // Walking animation
    if (isMoving.current) {
      const t = clock.elapsedTime * 8
      const swing = Math.sin(t) * 0.6
      if (leftLegRef.current) leftLegRef.current.rotation.x = swing
      if (rightLegRef.current) rightLegRef.current.rotation.x = -swing
      if (leftArmRef.current) leftArmRef.current.rotation.x = -swing
      if (rightArmRef.current) rightArmRef.current.rotation.x = swing
      // Slight bounce
      groupRef.current.position.y = Math.abs(Math.sin(t)) * 0.05
    } else {
      if (leftLegRef.current) leftLegRef.current.rotation.x = 0
      if (rightLegRef.current) rightLegRef.current.rotation.x = 0
      if (leftArmRef.current) leftArmRef.current.rotation.x = 0
      if (rightArmRef.current) rightArmRef.current.rotation.x = 0
    }
  })

  return (
    <group ref={groupRef}>
      {/* Head (full sphere, skin) */}
      <mesh position={[0, 1.35, 0]}>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshStandardMaterial color="#fdd9b5" />
      </mesh>
      {/* Cap dome — sphere sitting naturally on head, same approach as original */}
      <mesh position={[0, 1.37, 0]}>
        <sphereGeometry args={[0.24, 16, 12, 0, Math.PI * 2, 0, 1.25]} />
        <meshStandardMaterial color="#2255cc" />
      </mesh>
      {/* Brim — curved 3D arc at cap sphere base (y≈1.446), back of head */}
      <mesh position={[0, 1.446, 0]}>
        <BrimGeometry />
        <meshStandardMaterial color="#1a44aa" />
      </mesh>
      {/* Eyes */}
      <mesh position={[-0.08, 1.37, 0.18]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color="#222" />
      </mesh>
      <mesh position={[0.08, 1.37, 0.18]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color="#222" />
      </mesh>

      {/* Body (t-shirt) */}
      <mesh position={[0, 0.95, 0]}>
        <boxGeometry args={[0.38, 0.45, 0.25]} />
        <meshStandardMaterial color="#e63946" />
      </mesh>

      {/* Pants */}
      <mesh position={[0, 0.65, 0]}>
        <boxGeometry args={[0.38, 0.2, 0.25]} />
        <meshStandardMaterial color="#457b9d" />
      </mesh>

      {/* Left leg */}
      <group position={[-0.1, 0.55, 0]} ref={leftLegRef}>
        <mesh position={[0, -0.2, 0]}>
          <boxGeometry args={[0.14, 0.4, 0.16]} />
          <meshStandardMaterial color="#457b9d" />
        </mesh>
        {/* Shoe */}
        <mesh position={[0, -0.42, 0.03]}>
          <boxGeometry args={[0.16, 0.08, 0.22]} />
          <meshStandardMaterial color="#333" />
        </mesh>
      </group>

      {/* Right leg */}
      <group position={[0.1, 0.55, 0]} ref={rightLegRef}>
        <mesh position={[0, -0.2, 0]}>
          <boxGeometry args={[0.14, 0.4, 0.16]} />
          <meshStandardMaterial color="#457b9d" />
        </mesh>
        <mesh position={[0, -0.42, 0.03]}>
          <boxGeometry args={[0.16, 0.08, 0.22]} />
          <meshStandardMaterial color="#333" />
        </mesh>
      </group>

      {/* Left arm */}
      <group position={[-0.27, 1.1, 0]} ref={leftArmRef}>
        <mesh position={[0, -0.18, 0]}>
          <boxGeometry args={[0.12, 0.36, 0.14]} />
          <meshStandardMaterial color="#e63946" />
        </mesh>
        {/* Hand */}
        <mesh position={[0, -0.38, 0]}>
          <sphereGeometry args={[0.07, 8, 8]} />
          <meshStandardMaterial color="#fdd9b5" />
        </mesh>
      </group>

      {/* Right arm */}
      <group position={[0.27, 1.1, 0]} ref={rightArmRef}>
        <mesh position={[0, -0.18, 0]}>
          <boxGeometry args={[0.12, 0.36, 0.14]} />
          <meshStandardMaterial color="#e63946" />
        </mesh>
        <mesh position={[0, -0.38, 0]}>
          <sphereGeometry args={[0.07, 8, 8]} />
          <meshStandardMaterial color="#fdd9b5" />
        </mesh>
      </group>
    </group>
  )
}

// ─── Treasure chest ───
function TreasureChest({ position }) {
  const lidRef = useRef()
  const glowRef = useRef()

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    // Lid gently opens and closes
    if (lidRef.current) {
      lidRef.current.rotation.x = -0.2 - Math.sin(t * 1.5) * 0.15
    }
    if (glowRef.current) {
      glowRef.current.intensity = 3 + Math.sin(t * 2) * 1.5
    }
  })

  return (
    <group position={[position[0], 0, position[2]]}>
      {/* Glow pad */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[1.2, 32]} />
        <meshStandardMaterial color="#ffd700" emissive="#ffd700" emissiveIntensity={0.3} transparent opacity={0.4} />
      </mesh>

      {/* Chest base */}
      <mesh position={[0, 0.25, 0]}>
        <boxGeometry args={[0.7, 0.4, 0.5]} />
        <meshStandardMaterial color="#8B4513" roughness={0.6} />
      </mesh>
      {/* Gold trim on base */}
      <mesh position={[0, 0.44, 0]}>
        <boxGeometry args={[0.74, 0.04, 0.54]} />
        <meshStandardMaterial color="#daa520" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Lock plate */}
      <mesh position={[0, 0.3, 0.26]}>
        <boxGeometry args={[0.12, 0.15, 0.02]} />
        <meshStandardMaterial color="#daa520" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Lid (hinged at back) */}
      <group position={[0, 0.45, -0.25]} ref={lidRef}>
        {/* Lid body */}
        <mesh position={[0, 0.13, 0.25]}>
          <boxGeometry args={[0.7, 0.22, 0.5]} />
          <meshStandardMaterial color="#a0522d" roughness={0.5} />
        </mesh>
        {/* Lid trim */}
        <mesh position={[0, 0.23, 0.25]}>
          <boxGeometry args={[0.74, 0.04, 0.54]} />
          <meshStandardMaterial color="#daa520" metalness={0.8} roughness={0.2} />
        </mesh>
      </group>

      {/* Treasure glow from inside */}
      <pointLight ref={glowRef} position={[0, 0.5, 0]} color="#ffd700" intensity={3} distance={8} />

      {/* Gold coins inside (small spheres) */}
      {[[-0.15, 0.35, 0], [0.1, 0.33, -0.05], [0, 0.38, 0.08], [0.15, 0.36, -0.1], [-0.08, 0.4, 0.05]].map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.06, 8, 4]} />
          <meshStandardMaterial color="#ffd700" emissive="#ffd700" emissiveIntensity={0.5} metalness={0.9} roughness={0.1} />
        </mesh>
      ))}
    </group>
  )
}

// ─── Other scene elements ───

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
