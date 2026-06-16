import { useEffect, useRef, useState } from "react"
import * as THREE from "three"

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const [gameState, setGameState] = useState("menu")

  const gameRef = useRef<any>(null)
  const keys = useRef({ left: false, right: false })

  const startGame = () => {
    console.log("🎮 START")
    if (!gameRef.current) return

    gameRef.current.ball.position.set(0, 1, 0)
    gameRef.current.speed = 0.15
    gameRef.current.running = true

    setGameState("playing")
  }

  useEffect(() => {
    if (!canvasRef.current) return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x000011)

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / 600, 0.1, 1000)
    camera.position.set(0, 3, 6)

    const renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current })
    renderer.setSize(window.innerWidth, 600)

    // LIGHT
    const light = new THREE.DirectionalLight(0xffffff, 1)
    light.position.set(5, 10, 5)
    scene.add(light)

    // TRACK
    const track = new THREE.Mesh(
      new THREE.BoxGeometry(5, 0.2, 200),
      new THREE.MeshStandardMaterial({ color: 0x3333ff })
    )
    track.position.z = -100
    scene.add(track)

    // BALL
    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 32, 32),
      new THREE.MeshStandardMaterial({ color: 0xffff00 })
    )
    ball.position.y = 1
    scene.add(ball)

    gameRef.current = {
      scene,
      camera,
      renderer,
      ball,
      track,
      speed: 0.15,
      running: false
    }

    // INPUT
    const down = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") keys.current.left = true
      if (e.key === "ArrowRight") keys.current.right = true
    }
    const up = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") keys.current.left = false
      if (e.key === "ArrowRight") keys.current.right = false
    }

    window.addEventListener("keydown", down)
    window.addEventListener("keyup", up)

    // GAME LOOP ✅
    function loop() {
      requestAnimationFrame(loop)

      if (gameRef.current.running) {
        const g = gameRef.current

        // MOVE FORWARD ✅
        g.ball.position.z -= g.speed

        // LEFT / RIGHT ✅
        if (keys.current.left) g.ball.position.x -= 0.15
        if (keys.current.right) g.ball.position.x += 0.15

        // LIMIT ✅
        g.ball.position.x = Math.max(-2, Math.min(2, g.ball.position.x))

        // CAMERA FOLLOW ✅
        g.camera.position.x = g.ball.position.x * 0.4
        g.camera.position.z = g.ball.position.z + 6
        g.camera.lookAt(g.ball.position)

        // SPIN (so you see movement) ✅
        g.ball.rotation.x += 0.1

        console.log("RUNNING ✅", g.ball.position.z)
      }

      renderer.render(scene, camera)
    }

    loop()

    return () => {
      window.removeEventListener("keydown", down)
      window.removeEventListener("keyup", up)
    }
  }, [])

  return (
    <div>
      {gameState === "menu" && (
        <button onClick={startGame} style={{ padding: 20, fontSize: 20 }}>
          START GAME
        </button>
      )}

      <canvas ref={canvasRef} />
    </div>
  )
}
'