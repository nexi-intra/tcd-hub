import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowRight, Play, Trophy, Lightning, SkipForward } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useLanguage } from '@/contexts/LanguageContext'
import { useKV } from '@github/spark/hooks'
import { cn } from '@/lib/utils'

interface RunnerScore {
  id: string
  playerName: string
  score: number
  distance: number
  timestamp: number
  playerEmail: string
}

interface MovingObstacle extends THREE.Mesh {
  isMoving?: boolean
  moveDirection?: number
  moveSpeed?: number
}

interface EndlessRunnerProps {
  userEmail: string
  playerName: string
}

export function EndlessRunner({ userEmail, playerName }: EndlessRunnerProps) {
  const { language } = useLanguage()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover'>('menu')
  const [score, setScore] = useState(0)
  const [distance, setDistance] = useState(0)
  const [highScores, setHighScores] = useKV<RunnerScore[]>('runner-highscores', [])
  
  const gameRef = useRef<{
    scene: THREE.Scene
    camera: THREE.PerspectiveCamera
    renderer: THREE.WebGLRenderer
    ball: THREE.Mesh
    trackSegments: THREE.Mesh[]
    obstacles: THREE.Mesh[]
    ballPosition: THREE.Vector3
    ballVelocity: THREE.Vector3
    speed: number
    distance: number
    score: number
    isPlaying: boolean
    keys: { left: boolean; right: boolean }
    lastObstacleZ: number
    lastGapZ: number
    animationId: number | null
    cameraShake: number
    speedIncreaseTimer: number
  } | null>(null)

  const startGame = () => {
    setGameState('playing')
    setScore(0)
    setDistance(0)
    
    if (!gameRef.current) return
    
    gameRef.current.isPlaying = true
    gameRef.current.score = 0
    gameRef.current.distance = 0
    gameRef.current.speed = 0.2
    gameRef.current.ballPosition.set(0, 1, 0)
    gameRef.current.ballVelocity.set(0, 0, 0)
    gameRef.current.lastObstacleZ = -20
    gameRef.current.lastGapZ = -50
    gameRef.current.cameraShake = 0
    gameRef.current.speedIncreaseTimer = 0
    
    gameRef.current.trackSegments.forEach(segment => {
      gameRef.current!.scene.remove(segment)
    })
    gameRef.current.obstacles.forEach(obstacle => {
      gameRef.current!.scene.remove(obstacle)
    })
    gameRef.current.trackSegments = []
    gameRef.current.obstacles = []
    
    for (let i = 0; i < 30; i++) {
      createTrackSegment(-i * 10)
    }
  }

  const endGame = () => {
    if (!gameRef.current) return
    
    gameRef.current.isPlaying = false
    setGameState('gameover')
    
    const finalScore = gameRef.current.score
    const finalDistance = Math.floor(gameRef.current.distance)
    
    setScore(finalScore)
    setDistance(finalDistance)
    
    const newScore: RunnerScore = {
      id: Date.now().toString(),
      playerName: playerName,
      score: finalScore,
      distance: finalDistance,
      timestamp: Date.now(),
      playerEmail: userEmail,
    }
    
    setHighScores(current => {
      const updated = [...(current || []), newScore]
      return updated.sort((a, b) => b.score - a.score).slice(0, 50)
    })
  }

  const createTrackSegment = (z: number) => {
    if (!gameRef.current) return
    
    const random = Math.random()
    let xOffset = 0
    let width = 4
    let segmentLength = 10
    
    if (z < -50) {
      if (random < 0.3) {
        xOffset = (Math.random() - 0.5) * 1.5
      }
      if (random > 0.7) {
        width = 3 + Math.random() * 1
      }
      if (random > 0.85) {
        segmentLength = 8 + Math.random() * 4
      }
    }
    
    const colorVariation = Math.random() * 0.2
    const segmentGeometry = new THREE.BoxGeometry(width, 0.2, segmentLength)
    const segmentMaterial = new THREE.MeshStandardMaterial({ 
      color: new THREE.Color().setHSL(0.6 + colorVariation * 0.1, 0.8, 0.4),
      emissive: new THREE.Color().setHSL(0.6 + colorVariation * 0.1, 0.8, 0.2),
      roughness: 0.3,
      metalness: 0.6,
    })
    const segment = new THREE.Mesh(segmentGeometry, segmentMaterial)
    segment.position.set(xOffset, 0, z)
    segment.castShadow = true
    segment.receiveShadow = true
    
    const edgeGeometry1 = new THREE.BoxGeometry(0.2, 0.4, segmentLength)
    const hue = 0.5 + Math.random() * 0.2
    const edgeMaterial = new THREE.MeshStandardMaterial({ 
      color: new THREE.Color().setHSL(hue, 1, 0.6),
      emissive: new THREE.Color().setHSL(hue, 1, 0.4),
      emissiveIntensity: 0.8,
    })
    const edge1 = new THREE.Mesh(edgeGeometry1, edgeMaterial)
    edge1.position.set(xOffset - width / 2 - 0.1, 0.2, z)
    const edge2 = new THREE.Mesh(edgeGeometry1, edgeMaterial)
    edge2.position.set(xOffset + width / 2 + 0.1, 0.2, z)
    
    gameRef.current.scene.add(segment)
    gameRef.current.scene.add(edge1)
    gameRef.current.scene.add(edge2)
    gameRef.current.trackSegments.push(segment, edge1, edge2)
  }

  const createObstacle = (z: number, type: 'cube' | 'tall' | 'moving') => {
    if (!gameRef.current) return
    
    let geometry: THREE.BufferGeometry
    let xPos = (Math.random() - 0.5) * 3
    
    if (type === 'cube') {
      const size = 0.6 + Math.random() * 0.4
      geometry = new THREE.BoxGeometry(size, size, size)
    } else if (type === 'tall') {
      const width = 0.5 + Math.random() * 0.3
      const height = 1.5 + Math.random() * 1
      geometry = new THREE.BoxGeometry(width, height, width)
    } else {
      const size = 0.6 + Math.random() * 0.4
      geometry = new THREE.BoxGeometry(size, size, size)
    }
    
    const hue = 0 + Math.random() * 0.1
    const material = new THREE.MeshStandardMaterial({ 
      color: new THREE.Color().setHSL(hue, 0.9, 0.5),
      emissive: new THREE.Color().setHSL(hue, 0.8, 0.3),
      emissiveIntensity: 0.5,
    })
    const obstacle = new THREE.Mesh(geometry, material)
    obstacle.position.set(xPos, type === 'tall' ? 1.1 : 0.5, z)
    obstacle.castShadow = true
    
    if (type === 'moving') {
      const movingObstacle = obstacle as MovingObstacle
      movingObstacle.isMoving = true
      movingObstacle.moveDirection = Math.random() > 0.5 ? 1 : -1
      movingObstacle.moveSpeed = 0.015 + Math.random() * 0.025
    }
    
    gameRef.current.scene.add(obstacle)
    gameRef.current.obstacles.push(obstacle)
  }

  const createGap = (z: number) => {
    if (!gameRef.current) return
    
    const gapSize = 2 + Math.floor(Math.random() * 3)
    
    for (let i = 0; i < gapSize; i++) {
      const segmentZ = z - i * 10
      const existingSegments = gameRef.current.trackSegments.filter(
        s => Math.abs(s.position.z - segmentZ) < 5
      )
      existingSegments.forEach(s => {
        gameRef.current!.scene.remove(s)
        const index = gameRef.current!.trackSegments.indexOf(s)
        if (index > -1) gameRef.current!.trackSegments.splice(index, 1)
      })
    }
  }

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return

    const scene = new THREE.Scene()
    scene.fog = new THREE.Fog(0x0a0a1a, 10, 50)
    scene.background = new THREE.Color(0x0a0a1a)

    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    )
    camera.position.set(0, 4, 6)
    camera.lookAt(0, 0, -10)

    const renderer = new THREE.WebGLRenderer({ 
      canvas: canvasRef.current,
      antialias: true,
    })
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap

    const ambientLight = new THREE.AmbientLight(0x6666ff, 0.4)
    scene.add(ambientLight)

    const mainLight = new THREE.DirectionalLight(0xffffff, 1)
    mainLight.position.set(5, 10, 5)
    mainLight.castShadow = true
    mainLight.shadow.mapSize.width = 2048
    mainLight.shadow.mapSize.height = 2048
    mainLight.shadow.camera.near = 0.5
    mainLight.shadow.camera.far = 50
    scene.add(mainLight)

    const pointLight1 = new THREE.PointLight(0x00ffff, 1, 20)
    pointLight1.position.set(-3, 2, -10)
    scene.add(pointLight1)

    const pointLight2 = new THREE.PointLight(0xff00ff, 1, 20)
    pointLight2.position.set(3, 2, -10)
    scene.add(pointLight2)

    const ballGeometry = new THREE.SphereGeometry(0.5, 32, 32)
    const ballMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xffff00,
      emissive: 0xffaa00,
      emissiveIntensity: 0.5,
      roughness: 0.2,
      metalness: 0.8
    })
    const ball = new THREE.Mesh(ballGeometry, ballMaterial)
    ball.position.set(0, 1, 0)
    ball.castShadow = true
    scene.add(ball)

    gameRef.current = {
      scene,
      camera,
      renderer,
      ball,
      trackSegments: [],
      obstacles: [],
      ballPosition: new THREE.Vector3(0, 1, 0),
      ballVelocity: new THREE.Vector3(0, 0, 0),
      speed: 0.2,
      distance: 0,
      score: 0,
      isPlaying: false,
      keys: { left: false, right: false },
      lastObstacleZ: -20,
      lastGapZ: -50,
      animationId: null,
      cameraShake: 0,
      speedIncreaseTimer: 0,
    }

    for (let i = 0; i < 30; i++) {
      createTrackSegment(-i * 10)
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (!gameRef.current) return
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        gameRef.current.keys.left = true
      }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        gameRef.current.keys.right = true
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!gameRef.current) return
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        gameRef.current.keys.left = false
      }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        gameRef.current.keys.right = false
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    const animate = () => {
      if (!gameRef.current) return
      
      gameRef.current.animationId = requestAnimationFrame(animate)
      
      if (gameRef.current.isPlaying) {
        gameRef.current.speedIncreaseTimer += 1
        if (gameRef.current.speedIncreaseTimer >= 300) {
          gameRef.current.speed += 0.01
          gameRef.current.speedIncreaseTimer = 0
          gameRef.current.cameraShake = Math.min(gameRef.current.cameraShake + 0.001, 0.03)
        }

        if (gameRef.current.keys.left) {
          gameRef.current.ballVelocity.x -= 0.02
        }
        if (gameRef.current.keys.right) {
          gameRef.current.ballVelocity.x += 0.02
        }

        gameRef.current.ballVelocity.x *= 0.9
        gameRef.current.ballPosition.x += gameRef.current.ballVelocity.x
        gameRef.current.ballPosition.x = Math.max(-1.8, Math.min(1.8, gameRef.current.ballPosition.x))

        gameRef.current.ballPosition.z -= gameRef.current.speed

        gameRef.current.ballVelocity.y -= 0.02
        gameRef.current.ballPosition.y += gameRef.current.ballVelocity.y

        const onTrack = gameRef.current.trackSegments.some(segment => {
          if (segment.position.z > gameRef.current!.ballPosition.z - 5 &&
              segment.position.z < gameRef.current!.ballPosition.z + 5 &&
              Math.abs(segment.position.x - gameRef.current!.ballPosition.x) < 2) {
            return true
          }
          return false
        })

        if (onTrack && gameRef.current.ballPosition.y <= 1) {
          gameRef.current.ballPosition.y = 1
          gameRef.current.ballVelocity.y = 0
        }

        if (gameRef.current.ballPosition.y < -5) {
          endGame()
        }

        gameRef.current.obstacles.forEach(obstacle => {
          const movingObstacle = obstacle as MovingObstacle
          if (movingObstacle.isMoving) {
            obstacle.position.x += (movingObstacle.moveDirection || 0) * (movingObstacle.moveSpeed || 0)
            if (Math.abs(obstacle.position.x) > 1.8) {
              movingObstacle.moveDirection = (movingObstacle.moveDirection || 0) * -1
            }
          }

          const distance = gameRef.current!.ballPosition.distanceTo(obstacle.position)
          if (distance < 1) {
            endGame()
          }
        })

        gameRef.current.distance += gameRef.current.speed
        gameRef.current.score = Math.floor(gameRef.current.distance * 10)
        setScore(gameRef.current.score)
        setDistance(Math.floor(gameRef.current.distance))

        gameRef.current.trackSegments.forEach(segment => {
          segment.position.z += gameRef.current!.speed
          if (segment.position.z > 10) {
            gameRef.current!.scene.remove(segment)
          }
        })
        gameRef.current.trackSegments = gameRef.current.trackSegments.filter(s => s.position.z <= 10)

        gameRef.current.obstacles.forEach(obstacle => {
          obstacle.position.z += gameRef.current!.speed
          if (obstacle.position.z > 10) {
            gameRef.current!.scene.remove(obstacle)
          }
        })
        gameRef.current.obstacles = gameRef.current.obstacles.filter(o => o.position.z <= 10)

        const furthestSegment = Math.min(...gameRef.current.trackSegments.map(s => s.position.z))
        if (furthestSegment > -200) {
          createTrackSegment(furthestSegment - 10)
        }

        if (gameRef.current.ballPosition.z - gameRef.current.lastObstacleZ > 15 + Math.random() * 10) {
          const obstacleType = Math.random()
          if (obstacleType < 0.4) {
            createObstacle(gameRef.current.ballPosition.z - 30, 'cube')
          } else if (obstacleType < 0.7) {
            createObstacle(gameRef.current.ballPosition.z - 30, 'tall')
          } else {
            createObstacle(gameRef.current.ballPosition.z - 30, 'moving')
          }
          gameRef.current.lastObstacleZ = gameRef.current.ballPosition.z
        }

        if (gameRef.current.ballPosition.z - gameRef.current.lastGapZ > 60 + Math.random() * 40) {
          createGap(gameRef.current.ballPosition.z - 50)
          gameRef.current.lastGapZ = gameRef.current.ballPosition.z
        }

        gameRef.current.camera.position.x = gameRef.current.ballPosition.x * 0.3
        gameRef.current.camera.position.z = gameRef.current.ballPosition.z + 6
        
        const shake = gameRef.current.cameraShake
        gameRef.current.camera.position.x += (Math.random() - 0.5) * shake
        gameRef.current.camera.position.y = 4 + (Math.random() - 0.5) * shake
        
        gameRef.current.camera.lookAt(
          gameRef.current.ballPosition.x,
          gameRef.current.ballPosition.y,
          gameRef.current.ballPosition.z - 5
        )

        pointLight1.position.z = gameRef.current.ballPosition.z - 10
        pointLight2.position.z = gameRef.current.ballPosition.z - 10
      }

      gameRef.current.ball.position.copy(gameRef.current.ballPosition)
      gameRef.current.ball.rotation.x += 0.1
      gameRef.current.ball.rotation.y += 0.05

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

  const handleTouchMove = (direction: 'left' | 'right', isPressed: boolean) => {
    if (!gameRef.current) return
    if (direction === 'left') {
      gameRef.current.keys.left = isPressed
    } else {
      gameRef.current.keys.right = isPressed
    }
  }

  const topScores = (highScores || [])
    .slice()
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)

  return (
    <div className="space-y-6">
      <div ref={containerRef} className="relative w-full h-[600px] rounded-lg overflow-hidden border-2 border-border bg-[#0a0a1a]">
        <canvas ref={canvasRef} className="w-full h-full" />
        
        <AnimatePresence>
          {gameState === 'playing' && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none"
            >
              <div className="bg-black/60 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/20">
                <div className="text-xs text-white/70 mb-1">
                  {language === 'da' ? 'Point' : 'Score'}
                </div>
                <div className="text-2xl font-bold text-[#ffff00]">{score}</div>
              </div>
              <div className="bg-black/60 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/20">
                <div className="text-xs text-white/70 mb-1">
                  {language === 'da' ? 'Afstand' : 'Distance'}
                </div>
                <div className="text-2xl font-bold text-[#00ffff]">{distance}m</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {gameState === 'menu' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm"
            >
              <Card className="p-8 max-w-md mx-4 text-center space-y-6">
                <div className="flex justify-center">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#ffff00] to-[#ff8800] flex items-center justify-center">
                    <Lightning size={40} weight="fill" className="text-black" />
                  </div>
                </div>
                <div>
                  <h2 className="text-3xl font-bold mb-2">
                    {language === 'da' ? '3D Løber' : '3D Runner'}
                  </h2>
                  <p className="text-muted-foreground">
                    {language === 'da' 
                      ? 'Rul boldigt gennem banen så langt som muligt!'
                      : 'Roll the ball through the track as far as you can!'}
                  </p>
                </div>
                <div className="text-left space-y-2 text-sm">
                  <p className="font-semibold">{language === 'da' ? 'Sådan spiller du:' : 'How to play:'}</p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• {language === 'da' ? 'Brug ←→ piletaster eller A/D til at styre' : 'Use ←→ arrow keys or A/D to steer'}</li>
                    <li>• {language === 'da' ? 'Undgå forhindringer (røde objekter)' : 'Avoid obstacles (red objects)'}</li>
                    <li>• {language === 'da' ? 'Pas på ikke at falde af banen!' : 'Don\'t fall off the track!'}</li>
                    <li>• {language === 'da' ? 'Hastigheden øges over tid' : 'Speed increases over time'}</li>
                  </ul>
                </div>
                <Button
                  onClick={startGame}
                  size="lg"
                  className="w-full bg-gradient-to-r from-[#ffff00] to-[#ff8800] hover:opacity-90 text-black font-bold"
                >
                  <Play size={20} weight="fill" className="mr-2" />
                  {language === 'da' ? 'Start Spil' : 'Start Game'}
                </Button>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {gameState === 'gameover' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm"
            >
              <Card className="p-8 max-w-md mx-4 text-center space-y-6">
                <div className="flex justify-center">
                  <motion.div
                    initial={{ rotate: -180, scale: 0 }}
                    animate={{ rotate: 0, scale: 1 }}
                    transition={{ type: 'spring', duration: 0.6 }}
                    className="w-24 h-24 rounded-full bg-gradient-to-br from-[#ffff00] to-[#ff8800] flex items-center justify-center"
                  >
                    <Trophy size={48} weight="fill" className="text-black" />
                  </motion.div>
                </div>
                <div>
                  <h2 className="text-3xl font-bold mb-2">
                    {language === 'da' ? 'Spil Slut!' : 'Game Over!'}
                  </h2>
                  <p className="text-muted-foreground mb-4">
                    {language === 'da' ? 'Godt gået!' : 'Well done!'}
                  </p>
                  <div className="space-y-2">
                    <div>
                      <div className="text-sm text-muted-foreground">
                        {language === 'da' ? 'Point' : 'Score'}
                      </div>
                      <div className="text-5xl font-bold text-[#ffff00]">{score}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">
                        {language === 'da' ? 'Afstand' : 'Distance'}
                      </div>
                      <div className="text-2xl font-bold text-[#00ffff]">{distance}m</div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button
                    onClick={startGame}
                    size="lg"
                    className="flex-1 bg-gradient-to-r from-[#ffff00] to-[#ff8800] hover:opacity-90 text-black font-bold"
                  >
                    <Play size={20} weight="fill" className="mr-2" />
                    {language === 'da' ? 'Spil Igen' : 'Play Again'}
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {gameState === 'playing' && (
          <div className="absolute bottom-4 left-4 right-4 flex justify-center gap-4 sm:hidden">
            <Button
              size="lg"
              className="w-24 h-24 rounded-full bg-black/60 backdrop-blur-sm border-2 border-white/20 hover:bg-black/80"
              onTouchStart={() => handleTouchMove('left', true)}
              onTouchEnd={() => handleTouchMove('left', false)}
              onMouseDown={() => handleTouchMove('left', true)}
              onMouseUp={() => handleTouchMove('left', false)}
              onMouseLeave={() => handleTouchMove('left', false)}
            >
              <ArrowLeft size={32} weight="bold" className="text-white" />
            </Button>
            <Button
              size="lg"
              className="w-24 h-24 rounded-full bg-black/60 backdrop-blur-sm border-2 border-white/20 hover:bg-black/80"
              onTouchStart={() => handleTouchMove('right', true)}
              onTouchEnd={() => handleTouchMove('right', false)}
              onMouseDown={() => handleTouchMove('right', true)}
              onMouseUp={() => handleTouchMove('right', false)}
              onMouseLeave={() => handleTouchMove('right', false)}
            >
              <ArrowRight size={32} weight="bold" className="text-white" />
            </Button>
          </div>
        )}
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#ffff00] to-[#ff8800] flex items-center justify-center">
            <Trophy size={20} weight="fill" className="text-black" />
          </div>
          <h3 className="text-xl font-bold">
            {language === 'da' ? 'Topscorer' : 'Leaderboard'}
          </h3>
        </div>

        {topScores.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Trophy size={48} weight="duotone" className="mx-auto mb-3 opacity-50" />
            <p className="text-sm">
              {language === 'da' 
                ? 'Ingen scores endnu. Vær den første!' 
                : 'No scores yet. Be the first!'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {topScores.map((entry, index) => {
              const isCurrentPlayer = entry.playerEmail === userEmail
              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg transition-colors",
                    isCurrentPlayer 
                      ? "bg-gradient-to-r from-[#ffff00]/10 to-transparent border border-[#ffff00]/30"
                      : "bg-muted/30 hover:bg-muted/50"
                  )}
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-background text-sm font-bold shrink-0">
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={cn(
                      "font-medium truncate",
                      isCurrentPlayer && "font-bold text-[#ffff00]"
                    )}>
                      {entry.playerName}
                      {isCurrentPlayer && (
                        <span className="text-xs ml-2 opacity-70">
                          ({language === 'da' ? 'dig' : 'you'})
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {entry.distance}m • {new Date(entry.timestamp).toLocaleDateString(language === 'da' ? 'da-DK' : 'en-US')}
                    </div>
                  </div>
                  <div className="text-xl font-bold text-[#ffff00]">
                    {entry.score}
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
