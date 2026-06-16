import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { Play } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface EndlessRunnerProps {
  userEmail: string
  playerName: string
}

export function EndlessRunner({ userEmail, playerName }: EndlessRunnerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [score, setScore] = useState(0)
  
  const gameRef = useRef<{
    scene: THREE.Scene
    camera: THREE.PerspectiveCamera
    renderer: THREE.WebGLRenderer
    ball: THREE.Mesh
    track: THREE.Mesh
    ballPosition: { x: number; z: number }
    speed: number
    isRunning: boolean
    keys: { left: boolean; right: boolean }
    animationId: number | null
  } | null>(null)

  const startGame = () => {
    console.log('🎮 Game started')
    
    if (!gameRef.current) {
      console.error('❌ gameRef.current is null')
      return
    }
    
    setIsPlaying(true)
    setScore(0)
    
    gameRef.current.ballPosition.x = 0
    gameRef.current.ballPosition.z = 0
    gameRef.current.speed = 0.1
    gameRef.current.isRunning = true
    
    console.log('✅ Game started with ball position:', gameRef.current.ballPosition)
    console.log('⚡ Initial speed:', gameRef.current.speed)
  }

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return

    console.log('🎬 Initializing Three.js scene')

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x1a1a2e)

    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    )
    camera.position.set(0, 3, 5)

    const renderer = new THREE.WebGLRenderer({ 
      canvas: canvasRef.current,
      antialias: true,
    })
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight)

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(5, 10, 5)
    scene.add(directionalLight)

    const trackGeometry = new THREE.BoxGeometry(5, 0.2, 100)
    const trackMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x4444ff,
      emissive: 0x2222ff,
      emissiveIntensity: 0.3,
    })
    const track = new THREE.Mesh(trackGeometry, trackMaterial)
    track.position.set(0, 0, -50)
    scene.add(track)

    const ballGeometry = new THREE.SphereGeometry(0.5, 32, 32)
    const ballMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xffff00,
      emissive: 0xffaa00,
      emissiveIntensity: 0.5,
    })
    const ball = new THREE.Mesh(ballGeometry, ballMaterial)
    ball.position.set(0, 1, 0)
    scene.add(ball)

    gameRef.current = {
      scene,
      camera,
      renderer,
      ball,
      track,
      ballPosition: { x: 0, z: 0 },
      speed: 0.1,
      isRunning: false,
      keys: { left: false, right: false },
      animationId: null,
    }

    console.log('✅ Scene initialized')

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!gameRef.current) return
      if (e.key === 'ArrowLeft') {
        console.log('⬅️ Left key pressed')
        gameRef.current.keys.left = true
      }
      if (e.key === 'ArrowRight') {
        console.log('➡️ Right key pressed')
        gameRef.current.keys.right = true
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!gameRef.current) return
      if (e.key === 'ArrowLeft') {
        gameRef.current.keys.left = false
      }
      if (e.key === 'ArrowRight') {
        gameRef.current.keys.right = false
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    const animate = () => {
      if (!gameRef.current) return
      
      gameRef.current.animationId = requestAnimationFrame(animate)
      
      if (gameRef.current.isRunning) {
        console.log('🔄 Game loop running')
        console.log('📍 Ball position:', gameRef.current.ballPosition)
        
        gameRef.current.ballPosition.z -= gameRef.current.speed
        
        if (gameRef.current.keys.left) {
          gameRef.current.ballPosition.x -= 0.05
        }
        if (gameRef.current.keys.right) {
          gameRef.current.ballPosition.x += 0.05
        }
        
        gameRef.current.ballPosition.x = Math.max(-2, Math.min(2, gameRef.current.ballPosition.x))
        
        gameRef.current.ball.position.x = gameRef.current.ballPosition.x
        gameRef.current.ball.position.z = gameRef.current.ballPosition.z
        
        gameRef.current.track.position.z = gameRef.current.ballPosition.z - 50
        
        gameRef.current.camera.position.x = gameRef.current.ballPosition.x * 0.3
        gameRef.current.camera.position.z = gameRef.current.ballPosition.z + 5
        gameRef.current.camera.lookAt(
          gameRef.current.ballPosition.x,
          0,
          gameRef.current.ballPosition.z - 5
        )
        
        const currentScore = Math.floor(Math.abs(gameRef.current.ballPosition.z) * 10)
        setScore(currentScore)
      }
      
      gameRef.current.renderer.render(gameRef.current.scene, gameRef.current.camera)
    }

    animate()

    const handleResize = () => {
      if (!containerRef.current || !gameRef.current) return
      
      const width = containerRef.current.clientWidth
      const height = containerRef.current.clientHeight
      
      gameRef.current.camera.aspect = width / height
      gameRef.current.camera.updateProjectionMatrix()
      gameRef.current.renderer.setSize(width, height)
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('resize', handleResize)
      
      if (gameRef.current?.animationId) {
        cancelAnimationFrame(gameRef.current.animationId)
      }
      
      renderer.dispose()
    }
  }, [])

  return (
    <div className="space-y-6">
      <div ref={containerRef} className="relative w-full h-[600px] rounded-lg overflow-hidden border-2 border-border bg-[#1a1a2e]">
        <canvas ref={canvasRef} className="w-full h-full" />
        
        {isPlaying && (
          <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/20">
            <div className="text-xs text-white/70 mb-1">Score</div>
            <div className="text-2xl font-bold text-[#ffff00]">{score}</div>
          </div>
        )}

        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <Card className="p-8 max-w-md mx-4 text-center space-y-6">
              <div>
                <h2 className="text-3xl font-bold mb-2">3D Runner</h2>
                <p className="text-muted-foreground">
                  Control the ball with arrow keys!
                </p>
              </div>
              <div className="text-left space-y-2 text-sm">
                <p className="font-semibold">How to play:</p>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Use ← → arrow keys to move left/right</li>
                  <li>• Ball moves forward automatically</li>
                  <li>• Score increases as you move</li>
                </ul>
              </div>
              <Button
                onClick={startGame}
                size="lg"
                className="w-full bg-gradient-to-r from-[#ffff00] to-[#ff8800] hover:opacity-90 text-black font-bold"
              >
                <Play size={20} weight="fill" className="mr-2" />
                Start Game
              </Button>
            </Card>
          </div>
        )}
      </div>

      <Card className="p-6">
        <h3 className="text-xl font-bold mb-4">Debug Info</h3>
        <div className="space-y-2 text-sm font-mono">
          <p>Game Running: {isPlaying ? 'YES' : 'NO'}</p>
          <p>Score: {score}</p>
          <p className="text-xs text-muted-foreground">
            Check console for detailed logs
          </p>
        </div>
      </Card>
    </div>
  )
}
