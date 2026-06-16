import { useState, useEffect, useRef } from 'react'
import { Trophy, ArrowLeft, ArrowRight, User, Crown, Target, X } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useKV } from '@github/spark/hooks'
import { useLanguage } from '@/contexts/LanguageContext'
import { motion, AnimatePresence } from 'framer-motion'

interface Position {
  x: number
  y: number
}

interface FallingObject {
  id: number
  x: number
  y: number
  speed: number
  size: number
}

interface LeaderboardEntry {
  name: string
  score: number
  timestamp: number
}

type GameState = 'menu' | 'playing' | 'gameover'

const PLAYER_WIDTH = 50
const PLAYER_HEIGHT = 50
const GAME_WIDTH = 600
const GAME_HEIGHT = 500
const INITIAL_SPAWN_RATE = 1500
const MIN_SPAWN_RATE = 400
const INITIAL_SPEED = 2
const MAX_SPEED = 8
const SPEED_INCREASE_INTERVAL = 5000
const SPAWN_RATE_DECREASE_INTERVAL = 8000
const COLLISION_MARGIN = 8

export function EndlessDodger({ userEmail }: { userEmail?: string }) {
  const { language } = useLanguage()
  const [gameState, setGameState] = useState<GameState>('menu')
  const [playerX, setPlayerX] = useState(GAME_WIDTH / 2 - PLAYER_WIDTH / 2)
  const [fallingObjects, setFallingObjects] = useState<FallingObject[]>([])
  const [score, setScore] = useState(0)
  const [playerName, setPlayerName] = useState('')
  const [showNameInput, setShowNameInput] = useState(false)
  const [currentSpeed, setCurrentSpeed] = useState(INITIAL_SPEED)
  const [spawnRate, setSpawnRate] = useState(INITIAL_SPAWN_RATE)
  const [globalLeaderboard, setGlobalLeaderboard] = useKV<LeaderboardEntry[]>('endless-dodger-leaderboard', [])
  const [users] = useKV<Array<{ name: string; email: string }>>('app-users', [])

  const gameLoopRef = useRef<number | undefined>(undefined)
  const spawnTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const speedIncreaseTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const spawnRateDecreaseTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const keysPressed = useRef<Set<string>>(new Set())
  const lastUpdateRef = useRef<number>(Date.now())
  const startTimeRef = useRef<number>(0)

  const currentUser = users?.find(u => u.email === userEmail)
  const displayName = currentUser?.name || userEmail || 'Player'

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameState === 'playing') {
        keysPressed.current.add(e.key)
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.key)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [gameState])

  useEffect(() => {
    if (gameState === 'playing') {
      startTimeRef.current = Date.now()
      lastUpdateRef.current = Date.now()
      startGameLoop()
      startSpawning()
      startSpeedIncrease()
      startSpawnRateDecrease()
    } else {
      stopGame()
    }

    return () => {
      stopGame()
    }
  }, [gameState])

  const startGameLoop = () => {
    const gameLoop = () => {
      const now = Date.now()
      const deltaTime = now - lastUpdateRef.current
      lastUpdateRef.current = now

      updatePlayerPosition(deltaTime)
      updateFallingObjects(deltaTime)
      checkCollisions()
      updateScore()

      gameLoopRef.current = requestAnimationFrame(gameLoop)
    }
    gameLoopRef.current = requestAnimationFrame(gameLoop)
  }

  const updatePlayerPosition = (deltaTime: number) => {
    const moveSpeed = 0.5 * deltaTime

    setPlayerX(prev => {
      let newX = prev

      if (keysPressed.current.has('ArrowLeft') || keysPressed.current.has('a')) {
        newX -= moveSpeed
      }
      if (keysPressed.current.has('ArrowRight') || keysPressed.current.has('d')) {
        newX += moveSpeed
      }

      return Math.max(0, Math.min(GAME_WIDTH - PLAYER_WIDTH, newX))
    })
  }

  const updateFallingObjects = (deltaTime: number) => {
    setFallingObjects(prev => {
      const updated = prev.map(obj => ({
        ...obj,
        y: obj.y + (obj.speed * deltaTime / 16)
      })).filter(obj => obj.y < GAME_HEIGHT + 50)

      return updated
    })
  }

  const checkCollisions = () => {
    setFallingObjects(prev => {
      for (const obj of prev) {
        const playerTop = GAME_HEIGHT - PLAYER_HEIGHT + COLLISION_MARGIN
        const playerBottom = GAME_HEIGHT - COLLISION_MARGIN
        const playerLeft = playerX + COLLISION_MARGIN
        const playerRight = playerX + PLAYER_WIDTH - COLLISION_MARGIN
        
        const objTop = obj.y + COLLISION_MARGIN
        const objBottom = obj.y + obj.size - COLLISION_MARGIN
        const objLeft = obj.x + COLLISION_MARGIN
        const objRight = obj.x + obj.size - COLLISION_MARGIN
        
        const xOverlap = playerRight > objLeft && playerLeft < objRight
        const yOverlap = playerBottom > objTop && playerTop < objBottom
        
        const isColliding = xOverlap && yOverlap
        
        if (isColliding) {
          handleGameOver()
          return prev
        }
      }
      return prev
    })
  }

  const updateScore = () => {
    const elapsedTime = Date.now() - startTimeRef.current
    const newScore = Math.floor(elapsedTime / 100)
    setScore(newScore)
  }

  const spawnObject = () => {
    const size = 20 + Math.random() * 30
    const newObject: FallingObject = {
      id: Date.now() + Math.random(),
      x: Math.random() * (GAME_WIDTH - size),
      y: -size,
      speed: currentSpeed + Math.random() * 2,
      size
    }

    setFallingObjects(prev => [...prev, newObject])
  }

  const startSpawning = () => {
    const spawn = () => {
      spawnObject()
      spawnTimerRef.current = setTimeout(spawn, spawnRate)
    }
    spawn()
  }

  const startSpeedIncrease = () => {
    const increase = () => {
      setCurrentSpeed(prev => Math.min(MAX_SPEED, prev + 0.5))
      speedIncreaseTimerRef.current = setTimeout(increase, SPEED_INCREASE_INTERVAL)
    }
    speedIncreaseTimerRef.current = setTimeout(increase, SPEED_INCREASE_INTERVAL)
  }

  const startSpawnRateDecrease = () => {
    const decrease = () => {
      setSpawnRate(prev => Math.max(MIN_SPAWN_RATE, prev - 100))
      spawnRateDecreaseTimerRef.current = setTimeout(decrease, SPAWN_RATE_DECREASE_INTERVAL)
    }
    spawnRateDecreaseTimerRef.current = setTimeout(decrease, SPAWN_RATE_DECREASE_INTERVAL)
  }

  const stopGame = () => {
    if (gameLoopRef.current) {
      cancelAnimationFrame(gameLoopRef.current)
    }
    if (spawnTimerRef.current) {
      clearTimeout(spawnTimerRef.current)
    }
    if (speedIncreaseTimerRef.current) {
      clearTimeout(speedIncreaseTimerRef.current)
    }
    if (spawnRateDecreaseTimerRef.current) {
      clearTimeout(spawnRateDecreaseTimerRef.current)
    }
    keysPressed.current.clear()
  }

  const handleGameOver = () => {
    setGameState('gameover')
    setShowNameInput(true)
  }

  const handleSaveScore = () => {
    if (!playerName.trim()) return

    const newEntry: LeaderboardEntry = {
      name: playerName.trim(),
      score,
      timestamp: Date.now()
    }

    setGlobalLeaderboard(current => {
      const updated = [...(current || []), newEntry]
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
      return updated
    })

    setShowNameInput(false)
  }

  const handleStartGame = () => {
    setGameState('playing')
    setPlayerX(GAME_WIDTH / 2 - PLAYER_WIDTH / 2)
    setFallingObjects([])
    setScore(0)
    setCurrentSpeed(INITIAL_SPEED)
    setSpawnRate(INITIAL_SPAWN_RATE)
    setShowNameInput(false)
  }

  const handleRestart = () => {
    handleStartGame()
  }

  const handleBackToMenu = () => {
    setGameState('menu')
    setPlayerName('')
    setShowNameInput(false)
  }

  const topLeaderboard = (globalLeaderboard || []).slice(0, 10)

  if (gameState === 'menu') {
    return (
      <div className="flex flex-col items-center justify-center gap-8 py-8">
        <Card className="p-8 max-w-2xl w-full">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-6">
              <div className="p-6 rounded-3xl bg-gradient-to-br from-[oklch(0.65_0.25_30)] via-[oklch(0.60_0.22_15)] to-[oklch(0.65_0.25_30)] shadow-2xl">
                <Trophy size={64} weight="duotone" className="text-white" />
              </div>
            </div>
            <h2 className="text-4xl font-bold mb-4 bg-gradient-to-br from-[oklch(0.65_0.25_30)] via-[oklch(0.60_0.22_15)] to-[oklch(0.65_0.25_30)] bg-clip-text text-transparent">
              {language === 'da' ? 'Endless Dodger' : 'Endless Dodger'}
            </h2>
            <p className="text-muted-foreground text-lg mb-6">
              {language === 'da' 
                ? 'Undgå faldende objekter og overlev så længe som muligt!'
                : 'Avoid falling objects and survive as long as possible!'}
            </p>
            <div className="bg-muted/50 rounded-lg p-6 text-left space-y-3">
              <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                <Target size={20} />
                {language === 'da' ? 'Sådan spiller du:' : 'How to play:'}
              </h3>
              <div className="space-y-2 text-sm">
                <p className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 font-mono bg-background px-2 py-1 rounded border">
                    <ArrowLeft size={16} weight="bold" /> / <ArrowRight size={16} weight="bold" />
                  </span>
                  <span>{language === 'da' ? 'Bevæg spilleren' : 'Move player'}</span>
                </p>
                <p className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 font-mono bg-background px-2 py-1 rounded border">
                    A / D
                  </span>
                  <span>{language === 'da' ? 'Alternative kontrolknapper' : 'Alternative controls'}</span>
                </p>
                <p className="text-muted-foreground mt-4">
                  {language === 'da' 
                    ? '• Objekterne falder hurtigere over tid\n• Flere objekter spawner som spillet skrider frem\n• Scoren stiger baseret på overlevelsestid'
                    : '• Objects fall faster over time\n• More objects spawn as the game progresses\n• Score increases based on survival time'}
                </p>
              </div>
            </div>
          </div>

          <Button
            onClick={handleStartGame}
            size="lg"
            className="w-full text-lg font-bold py-6 bg-gradient-to-r from-[oklch(0.65_0.25_30)] via-[oklch(0.60_0.22_15)] to-[oklch(0.65_0.25_30)] hover:opacity-90 transition-opacity"
          >
            {language === 'da' ? 'Start Spil' : 'Start Game'}
          </Button>
        </Card>

        {topLeaderboard.length > 0 && (
          <Card className="p-6 max-w-2xl w-full">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-xl bg-gradient-to-br from-yellow-500 to-amber-600 shadow-lg">
                <Crown size={28} weight="duotone" className="text-white" />
              </div>
              <h3 className="text-2xl font-bold">
                {language === 'da' ? 'Top 10 Highscores' : 'Top 10 Highscores'}
              </h3>
            </div>
            <div className="space-y-2">
              {topLeaderboard.map((entry, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-lg w-8 text-center">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                    </span>
                    <span className="font-semibold">{entry.name}</span>
                  </div>
                  <span className="font-bold text-lg text-primary">{entry.score}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    )
  }

  if (gameState === 'playing') {
    return (
      <div className="flex flex-col items-center justify-center gap-8 py-8">
        <div className="flex justify-between items-center w-full max-w-[600px] mb-4">
          <div className="text-2xl font-bold flex items-center gap-2">
            <Trophy size={28} weight="duotone" className="text-primary" />
            <span>{language === 'da' ? 'Score:' : 'Score:'}</span>
            <span className="text-primary">{score}</span>
          </div>
          <div className="text-sm text-muted-foreground">
            {language === 'da' ? 'Brug piletaster eller A/D' : 'Use arrow keys or A/D'}
          </div>
        </div>

        <div
          style={{
            width: GAME_WIDTH,
            height: GAME_HEIGHT,
            position: 'relative',
            border: '4px solid',
            borderImage: 'linear-gradient(135deg, oklch(0.65 0.25 30), oklch(0.60 0.22 15)) 1',
            borderRadius: '12px',
            overflow: 'hidden',
            background: 'linear-gradient(180deg, oklch(0.98 0.01 250), oklch(0.95 0.01 240))'
          }}
        >
          {fallingObjects.map(obj => (
            <div
              key={obj.id}
              style={{
                position: 'absolute',
                left: obj.x,
                top: obj.y,
                width: obj.size,
                height: obj.size,
                borderRadius: '50%',
                background: 'radial-gradient(circle at 30% 30%, oklch(0.65 0.25 30), oklch(0.45 0.22 15))',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
              }}
            />
          ))}

          <div
            style={{
              position: 'absolute',
              left: playerX,
              bottom: 0,
              width: PLAYER_WIDTH,
              height: PLAYER_HEIGHT,
              background: 'linear-gradient(135deg, oklch(0.60 0.15 250), oklch(0.55 0.12 210))',
              borderRadius: '8px',
              border: '3px solid white',
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <User size={32} weight="duotone" className="text-white" />
          </div>
        </div>
      </div>
    )
  }

  if (gameState === 'gameover') {
    const isTopScore = topLeaderboard.length === 0 || score > topLeaderboard[topLeaderboard.length - 1].score || topLeaderboard.length < 10

    return (
      <div className="flex flex-col items-center justify-center gap-8 py-8">
        <Card className="p-8 max-w-2xl w-full">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <div className="p-6 rounded-3xl bg-gradient-to-br from-red-500 via-orange-500 to-red-500 shadow-2xl">
                <X size={64} weight="duotone" className="text-white" />
              </div>
            </div>
            <h2 className="text-4xl font-bold mb-4 text-red-500">
              {language === 'da' ? 'Spillet Slut!' : 'Game Over!'}
            </h2>
            <p className="text-muted-foreground text-lg mb-6">
              {language === 'da' ? 'Din score:' : 'Your score:'}
            </p>
            <div className="text-6xl font-bold text-primary mb-8">{score}</div>

            {isTopScore && showNameInput && (
              <div className="mb-6">
                <p className="text-lg font-semibold mb-4 text-green-600">
                  {language === 'da' ? '🎉 Ny highscore! Indtast dit navn:' : '🎉 New highscore! Enter your name:'}
                </p>
                <div className="flex gap-2">
                  <Input
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder={displayName}
                    className="text-lg"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && playerName.trim()) {
                        handleSaveScore()
                      }
                    }}
                    autoFocus
                  />
                  <Button
                    onClick={handleSaveScore}
                    disabled={!playerName.trim()}
                    className="bg-gradient-to-r from-green-500 to-emerald-600 hover:opacity-90"
                  >
                    {language === 'da' ? 'Gem' : 'Save'}
                  </Button>
                </div>
              </div>
            )}

            <div className="flex gap-4">
              <Button
                onClick={handleRestart}
                size="lg"
                className="flex-1 text-lg font-bold py-6 bg-gradient-to-r from-[oklch(0.65_0.25_30)] via-[oklch(0.60_0.22_15)] to-[oklch(0.65_0.25_30)] hover:opacity-90"
              >
                {language === 'da' ? 'Spil Igen' : 'Play Again'}
              </Button>
              <Button
                onClick={handleBackToMenu}
                size="lg"
                variant="outline"
                className="flex-1 text-lg font-bold py-6"
              >
                {language === 'da' ? 'Tilbage til Menu' : 'Back to Menu'}
              </Button>
            </div>
          </div>
        </Card>

        {topLeaderboard.length > 0 && (
          <Card className="p-6 max-w-2xl w-full">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-xl bg-gradient-to-br from-yellow-500 to-amber-600 shadow-lg">
                <Crown size={28} weight="duotone" className="text-white" />
              </div>
              <h3 className="text-2xl font-bold">
                {language === 'da' ? 'Top 10 Highscores' : 'Top 10 Highscores'}
              </h3>
            </div>
            <div className="space-y-2">
              {topLeaderboard.map((entry, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-lg w-8 text-center">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                    </span>
                    <span className="font-semibold">{entry.name}</span>
                  </div>
                  <span className="font-bold text-lg text-primary">{entry.score}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    )
  }

  return null
}
