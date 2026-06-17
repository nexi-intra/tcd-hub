import { useState, useEffect, useRef } from 'react'
import { RocketLaunch, Trophy, X, Lightning, Speedometer, Fire, Flame, Crown } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useKV } from '@github/spark/hooks'
import { useLanguage } from '@/contexts/LanguageContext'

interface Meteorite {
  id: number
  x: number
  y: number
  speed: number
}

interface LeaderboardEntry {
  email: string
  score: number
  timestamp: number
}

interface GlobalLeaderboard {
  easy: LeaderboardEntry[]
  medium: LeaderboardEntry[]
  hard: LeaderboardEntry[]
  expert: LeaderboardEntry[]
}

type Difficulty = 'easy' | 'medium' | 'hard' | 'expert'
type GameState = 'menu' | 'playing' | 'ended'

const DIFFICULTY_SETTINGS = {
  easy: {
    meteoriteSpeed: 3.5,
    spawnRate: 600,
    label: { en: 'Easy', da: 'Let' },
    description: { en: 'Slow meteorites', da: 'Langsomme meteoritter' },
    icon: Speedometer,
    color: 'text-green-500',
    bgGradient: 'from-green-500/20 to-green-600/20',
    borderColor: 'border-green-500/30',
    glowColor: 'shadow-green-500/20',
  },
  medium: {
    meteoriteSpeed: 5,
    spawnRate: 450,
    label: { en: 'Medium', da: 'Mellem' },
    description: { en: 'Medium speed', da: 'Mellem hastighed' },
    icon: Lightning,
    color: 'text-yellow-500',
    bgGradient: 'from-yellow-500/20 to-yellow-600/20',
    borderColor: 'border-yellow-500/30',
    glowColor: 'shadow-yellow-500/20',
  },
  hard: {
    meteoriteSpeed: 7,
    spawnRate: 350,
    label: { en: 'Hard', da: 'Svær' },
    description: { en: 'Fast meteorites', da: 'Hurtige meteoritter' },
    icon: Fire,
    color: 'text-red-500',
    bgGradient: 'from-red-500/20 to-red-600/20',
    borderColor: 'border-red-500/30',
    glowColor: 'shadow-red-500/20',
  },
  expert: {
    meteoriteSpeed: 9,
    spawnRate: 250,
    label: { en: 'Expert', da: 'Ekspert' },
    description: { en: 'Very fast!', da: 'Meget hurtigt!' },
    icon: Flame,
    color: 'text-purple-500',
    bgGradient: 'from-purple-500/20 to-purple-600/20',
    borderColor: 'border-purple-500/30',
    glowColor: 'shadow-purple-500/20',
  }
}

const SPACESHIP_SIZE = 50
const METEORITE_SIZE = 45
const GAME_AREA_HEIGHT = 600

const SPACESHIP_HITBOX_SIZE = 35
const METEORITE_HITBOX_SIZE = 38

interface User {
  email: string
  fullName: string
  role: string
  phone?: string
}

interface EndlessDodgerProps {
  userEmail?: string
}

export function EndlessDodger({ userEmail = 'guest@example.com' }: EndlessDodgerProps = {}) {
  const { language } = useLanguage()
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [gameState, setGameState] = useState<GameState>('menu')
  const [score, setScore] = useState(0)
  const [spaceshipX, setSpaceshipX] = useState(0)
  const [meteorites, setMeteorites] = useState<Meteorite[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [globalLeaderboard, setGlobalLeaderboard] = useKV<GlobalLeaderboard>('endless-dodger-global-leaderboard', {
    easy: [],
    medium: [],
    hard: [],
    expert: []
  })
  
  const gameAreaRef = useRef<HTMLDivElement>(null)
  const animationFrameRef = useRef<number | null>(null)
  const spawnIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const keysPressed = useRef<Set<string>>(new Set())

  useEffect(() => {
    const loadUsers = async () => {
      const usersData = await window.spark.kv.get<Record<string, { email: string; password: string; fullName: string; role: string; phone?: string }>>('users')
      if (usersData) {
        const userList = Object.values(usersData).map(u => ({
          email: u.email,
          fullName: u.fullName,
          role: u.role || 'user',
          phone: u.phone
        }))
        setUsers(userList)
      } else {
        setUsers([])
      }
    }
    loadUsers()
  }, [])

  const getDisplayName = (email: string) => {
    const user = users.find(u => u.email === email)
    return user ? user.fullName : email.split('@')[0]
  }

  const getCurrentHighScore = () => {
    const board = globalLeaderboard?.[difficulty] || []
    return board.length > 0 ? board[0].score : 0
  }

  const updateGlobalLeaderboard = (newScore: number) => {
    if (!userEmail) return

    setGlobalLeaderboard((currentLeaderboard) => {
      if (!currentLeaderboard) {
        currentLeaderboard = { easy: [], medium: [], hard: [], expert: [] }
      }
      
      const updated: GlobalLeaderboard = {
        easy: [...(currentLeaderboard.easy || [])],
        medium: [...(currentLeaderboard.medium || [])],
        hard: [...(currentLeaderboard.hard || [])],
        expert: [...(currentLeaderboard.expert || [])]
      }
      
      const difficultyBoard = updated[difficulty]
      
      const existingEntryIndex = difficultyBoard.findIndex(entry => entry.email === userEmail)
      
      if (existingEntryIndex !== -1) {
        if (newScore > difficultyBoard[existingEntryIndex].score) {
          difficultyBoard[existingEntryIndex] = {
            email: userEmail,
            score: newScore,
            timestamp: Date.now()
          }
        }
      } else {
        difficultyBoard.push({
          email: userEmail,
          score: newScore,
          timestamp: Date.now()
        })
      }
      
      difficultyBoard.sort((a, b) => b.score - a.score)
      updated[difficulty] = difficultyBoard.slice(0, 10)
      
      return updated
    })
  }

  const getTopScoreForDifficulty = (diff: Difficulty): number => {
    const board = globalLeaderboard?.[diff] || []
    return board.length > 0 ? board[0].score : 0
  }

  const getUserRankForDifficulty = (diff: Difficulty): number | null => {
    const board = globalLeaderboard?.[diff] || []
    const index = board.findIndex(entry => entry.email === userEmail)
    return index !== -1 ? index + 1 : null
  }

  const spawnMeteorite = () => {
    if (!gameAreaRef.current) return

    const rect = gameAreaRef.current.getBoundingClientRect()
    const x = Math.random() * (rect.width - METEORITE_SIZE)

    const newMeteorite: Meteorite = {
      id: Date.now() + Math.random(),
      x,
      y: 0,
      speed: DIFFICULTY_SETTINGS[difficulty].meteoriteSpeed
    }

    setMeteorites(prev => [...prev, newMeteorite])
  }

  const getSpawnRate = (currentScore: number): number => {
    const baseRate = DIFFICULTY_SETTINGS[difficulty].spawnRate
    const scoreThreshold = 50
    const reductionPerThreshold = 40
    const minRate = 100
    
    const reductions = Math.floor(currentScore / scoreThreshold)
    const newRate = Math.max(minRate, baseRate - (reductions * reductionPerThreshold))
    
    return newRate
  }

  const getMeteoritesPerSpawn = (currentScore: number): number => {
    const baseCount = 1
    const scoreThreshold = 30
    const maxCount = 4
    
    const additionalMeteorites = Math.floor(currentScore / scoreThreshold)
    return Math.min(maxCount, baseCount + additionalMeteorites)
  }

  const checkCollision = (meteoriteX: number, meteoriteY: number, currentSpaceshipX: number): boolean => {
    if (!gameAreaRef.current) return false

    const spaceshipY = GAME_AREA_HEIGHT - SPACESHIP_SIZE - 10

    const spaceshipCenterX = currentSpaceshipX + (SPACESHIP_SIZE / 2)
    const spaceshipCenterY = spaceshipY + (SPACESHIP_SIZE / 2)
    
    const meteoriteCenterX = meteoriteX + (METEORITE_SIZE / 2)
    const meteoriteCenterY = meteoriteY + (METEORITE_SIZE / 2)
    
    const distanceX = Math.abs(spaceshipCenterX - meteoriteCenterX)
    const distanceY = Math.abs(spaceshipCenterY - meteoriteCenterY)
    
    const collisionThresholdX = (SPACESHIP_HITBOX_SIZE + METEORITE_HITBOX_SIZE) / 2
    const collisionThresholdY = (SPACESHIP_HITBOX_SIZE + METEORITE_HITBOX_SIZE) / 2

    return distanceX < collisionThresholdX && distanceY < collisionThresholdY
  }

  const startGame = () => {
    setScore(0)
    setMeteorites([])
    setGameState('playing')
    
    if (gameAreaRef.current) {
      const rect = gameAreaRef.current.getBoundingClientRect()
      setSpaceshipX((rect.width - SPACESHIP_SIZE) / 2)
    }
  }

  const endGame = () => {
    setGameState('ended')
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    
    if (spawnIntervalRef.current) {
      clearInterval(spawnIntervalRef.current)
      spawnIntervalRef.current = null
    }

    const finalScore = Math.floor(score / 10)
    updateGlobalLeaderboard(finalScore)
  }

  const resetGame = () => {
    setGameState('menu')
    setScore(0)
    setMeteorites([])
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    
    if (spawnIntervalRef.current) {
      clearInterval(spawnIntervalRef.current)
      spawnIntervalRef.current = null
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      if (['arrowleft', 'arrowright', 'a', 'd'].includes(key)) {
        e.preventDefault()
        keysPressed.current.add(key)
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase()
      keysPressed.current.delete(key)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (spawnIntervalRef.current) {
        clearInterval(spawnIntervalRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (gameState === 'playing' && gameAreaRef.current) {
      const rect = gameAreaRef.current.getBoundingClientRect()
      let currentSpaceshipX = spaceshipX
      let gameEnded = false
      let currentScore = 0
      
      const runGameLoop = () => {
        if (!gameAreaRef.current || gameEnded) return

        const rect = gameAreaRef.current.getBoundingClientRect()

        setMeteorites(prev => {
          const updated = prev.map(meteorite => ({
            ...meteorite,
            y: meteorite.y + meteorite.speed
          })).filter(meteorite => meteorite.y < GAME_AREA_HEIGHT + METEORITE_SIZE)

          for (const meteorite of updated) {
            if (checkCollision(meteorite.x, meteorite.y, currentSpaceshipX)) {
              gameEnded = true
              endGame()
              return prev
            }
          }

          return updated
        })

        if (!gameEnded) {
          setScore(prev => {
            currentScore = prev + 1
            return currentScore
          })

          const moveSpeed = 10
          if (keysPressed.current.has('arrowleft') || keysPressed.current.has('a')) {
            setSpaceshipX(prev => {
              const newX = Math.max(0, prev - moveSpeed)
              currentSpaceshipX = newX
              return newX
            })
          }
          if (keysPressed.current.has('arrowright') || keysPressed.current.has('d')) {
            setSpaceshipX(prev => {
              const newX = Math.min(rect.width - SPACESHIP_SIZE, prev + moveSpeed)
              currentSpaceshipX = newX
              return newX
            })
          }

          animationFrameRef.current = requestAnimationFrame(runGameLoop)
        }
      }
      
      animationFrameRef.current = requestAnimationFrame(runGameLoop)
      
      const updateSpawnInterval = () => {
        if (spawnIntervalRef.current) {
          clearInterval(spawnIntervalRef.current)
        }
        
        const currentSpawnRate = getSpawnRate(Math.floor(currentScore / 10))
        const meteoritesPerSpawn = getMeteoritesPerSpawn(Math.floor(currentScore / 10))
        
        spawnIntervalRef.current = setInterval(() => {
          if (!gameEnded) {
            for (let i = 0; i < meteoritesPerSpawn; i++) {
              spawnMeteorite()
            }
          }
        }, currentSpawnRate)
      }
      
      updateSpawnInterval()
      
      const adjustDifficultyInterval = setInterval(() => {
        if (!gameEnded) {
          updateSpawnInterval()
        }
      }, 1000)
      
      return () => {
        clearInterval(adjustDifficultyInterval)
      }
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
      if (spawnIntervalRef.current) {
        clearInterval(spawnIntervalRef.current)
        spawnIntervalRef.current = null
      }
    }
  }, [gameState, difficulty])

  if (gameState === 'menu') {
    return (
      <div className="space-y-8">
        <Card className="p-8 bg-gradient-to-br from-card via-card to-muted/30 border-2 shadow-xl">
          <h2 className="text-3xl font-bold mb-6 text-center bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
            {language === 'da' ? 'Vælg sværhedsgrad' : 'Select Difficulty'}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {(Object.keys(DIFFICULTY_SETTINGS) as Difficulty[]).map((diff) => {
              const settings = DIFFICULTY_SETTINGS[diff]
              const Icon = settings.icon
              const topScore = getTopScoreForDifficulty(diff)
              const userRank = getUserRankForDifficulty(diff)
              const isSelected = difficulty === diff

              return (
                <button
                  key={diff}
                  onClick={() => setDifficulty(diff)}
                  className={`
                    relative p-6 rounded-2xl border-2 transition-all duration-300
                    ${isSelected 
                      ? `${settings.borderColor} bg-gradient-to-br ${settings.bgGradient} scale-105 shadow-2xl ${settings.glowColor}` 
                      : 'border-border hover:border-primary/30 hover:scale-102 bg-card/50'
                    }
                  `}
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${settings.bgGradient}`}>
                      <Icon size={32} weight="duotone" className={settings.color} />
                    </div>
                    <div className="text-center">
                      <h3 className="font-bold text-lg mb-1">
                        {settings.label[language]}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        {settings.description[language]}
                      </p>
                      {topScore > 0 && (
                        <div className="text-xs space-y-1">
                          <div className="flex items-center justify-center gap-1 text-yellow-600 dark:text-yellow-400">
                            <Crown size={14} weight="fill" />
                            <span className="font-semibold">{topScore}</span>
                          </div>
                          {userRank && (
                            <div className="text-muted-foreground">
                              {language === 'da' ? `Din rang: #${userRank}` : `Your rank: #${userRank}`}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  {isSelected && (
                    <div className="absolute top-2 right-2">
                      <div className={`w-3 h-3 rounded-full ${settings.color.replace('text-', 'bg-')} animate-pulse`} />
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          <div className="flex justify-center">
            <Button
              onClick={startGame}
              size="lg"
              className="text-xl px-12 py-6 bg-gradient-to-r from-primary via-accent to-primary hover:shadow-2xl hover:scale-105 transition-all duration-300 font-bold"
            >
              <RocketLaunch size={28} weight="duotone" className="mr-3" />
              {language === 'da' ? 'Start spil' : 'Start Game'}
            </Button>
          </div>
        </Card>

        <Card className="p-8 bg-gradient-to-br from-card via-card to-muted/30 border-2 shadow-xl">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Trophy size={32} weight="duotone" className="text-yellow-500" />
            <h2 className="text-3xl font-bold text-center bg-gradient-to-r from-yellow-500 via-yellow-400 to-yellow-500 bg-clip-text text-transparent">
              {language === 'da' ? 'Global Highscore' : 'Global Leaderboard'}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {(Object.keys(DIFFICULTY_SETTINGS) as Difficulty[]).map((diff) => {
              const settings = DIFFICULTY_SETTINGS[diff]
              const Icon = settings.icon
              const board = globalLeaderboard?.[diff] || []

              return (
                <div key={diff} className="space-y-3">
                  <div className={`flex items-center gap-2 p-3 rounded-xl bg-gradient-to-br ${settings.bgGradient} border ${settings.borderColor}`}>
                    <Icon size={24} weight="duotone" className={settings.color} />
                    <h3 className="font-bold text-lg">{settings.label[language]}</h3>
                  </div>
                  
                  <div className="space-y-2">
                    {board.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        {language === 'da' ? 'Ingen scores endnu' : 'No scores yet'}
                      </div>
                    ) : (
                      board.slice(0, 10).map((entry, index) => (
                        <div
                          key={entry.email + entry.timestamp}
                          className={`
                            flex items-center justify-between p-3 rounded-lg
                            ${entry.email === userEmail 
                              ? 'bg-primary/10 border-2 border-primary/30 font-semibold' 
                              : 'bg-muted/50'
                            }
                            ${index === 0 ? 'ring-2 ring-yellow-500/50' : ''}
                          `}
                        >
                          <div className="flex items-center gap-3">
                            <span className={`
                              font-bold w-6 text-center
                              ${index === 0 ? 'text-yellow-500' : ''}
                              ${index === 1 ? 'text-gray-400' : ''}
                              ${index === 2 ? 'text-orange-600' : ''}
                            `}>
                              #{index + 1}
                            </span>
                            <span className="truncate max-w-[120px]">
                              {getDisplayName(entry.email)}
                            </span>
                          </div>
                          <span className="font-bold text-primary">
                            {entry.score}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      </div>
    )
  }

  if (gameState === 'playing') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 rounded-xl border-2 border-primary/20">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="text-center px-4 py-2 bg-card/80 backdrop-blur rounded-lg border shadow-lg">
              <div className="text-xs text-muted-foreground mb-1">
                {language === 'da' ? 'Score' : 'Score'}
              </div>
              <div className="text-2xl font-bold text-primary">
                {Math.floor(score / 10)}
              </div>
            </div>
            
            <div className="text-center px-4 py-2 bg-card/80 backdrop-blur rounded-lg border shadow-lg">
              <div className="text-xs text-muted-foreground mb-1">
                {language === 'da' ? 'Highscore' : 'High Score'}
              </div>
              <div className="text-xl font-bold text-yellow-500">
                {getCurrentHighScore()}
              </div>
            </div>
          </div>

          <Button
            onClick={resetGame}
            variant="destructive"
            size="lg"
            className="gap-2"
          >
            <X size={20} weight="bold" />
            {language === 'da' ? 'Afslut' : 'End Game'}
          </Button>
        </div>

        <div
          ref={gameAreaRef}
          className="relative bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 rounded-xl border-2 border-primary/20 overflow-hidden shadow-2xl"
          style={{ height: `${GAME_AREA_HEIGHT}px` }}
        >
          <div
            className="absolute"
            style={{
              left: `${spaceshipX}px`,
              bottom: '10px',
              width: `${SPACESHIP_SIZE}px`,
              height: `${SPACESHIP_SIZE}px`,
            }}
          >
            <svg
              width={SPACESHIP_SIZE}
              height={SPACESHIP_SIZE}
              viewBox="0 0 50 50"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M25 10 L40 42 L25 38 L10 42 Z"
                fill="url(#spaceshipGradient)"
                stroke="#ffffff"
                strokeWidth="2"
              />
              <circle cx="25" cy="28" r="4" fill="#00ffff" opacity="0.8" />
              <defs>
                <linearGradient id="spaceshipGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {meteorites.map(meteorite => (
            <div
              key={meteorite.id}
              className="absolute"
              style={{
                left: `${meteorite.x}px`,
                top: `${meteorite.y}px`,
                width: `${METEORITE_SIZE}px`,
                height: `${METEORITE_SIZE}px`,
              }}
            >
              <svg
                width={METEORITE_SIZE}
                height={METEORITE_SIZE}
                viewBox="0 0 45 45"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="22.5" cy="22.5" r="19" fill="url(#meteoriteGradient)" />
                <circle cx="16" cy="18" r="3.5" fill="#8b4513" opacity="0.5" />
                <circle cx="28" cy="24" r="2.5" fill="#654321" opacity="0.5" />
                <circle cx="22" cy="28" r="2.5" fill="#5a3a1a" opacity="0.5" />
                <defs>
                  <radialGradient id="meteoriteGradient">
                    <stop offset="0%" stopColor="#ff6b35" />
                    <stop offset="50%" stopColor="#d64933" />
                    <stop offset="100%" stopColor="#8b2e1f" />
                  </radialGradient>
                </defs>
              </svg>
            </div>
          ))}

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center text-xs text-white/80 bg-black/50 backdrop-blur px-4 py-2 rounded-full border border-white/20">
            {language === 'da' ? '← → eller A D for at flytte rumskibet' : '← → or A D to move spaceship'}
          </div>
        </div>
      </div>
    )
  }

  if (gameState === 'ended') {
    const finalScore = Math.floor(score / 10)
    const highScore = getCurrentHighScore()
    const isNewRecord = finalScore >= highScore && finalScore > 0

    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <Card className="max-w-2xl w-full p-8 bg-gradient-to-br from-card via-card to-muted/30 border-2 shadow-2xl">
          <div className="text-center space-y-6">
            <div className="space-y-4">
              <div className="flex justify-center">
                {isNewRecord ? (
                  <div className="p-6 rounded-full bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 border-2 border-yellow-500/50 animate-pulse">
                    <Crown size={64} weight="fill" className="text-yellow-500" />
                  </div>
                ) : (
                  <div className="p-6 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 border-2 border-primary/30">
                    <Trophy size={64} weight="duotone" className="text-primary" />
                  </div>
                )}
              </div>
              
              <h2 className="text-4xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                {language === 'da' ? 'Spil slut!' : 'Game Over!'}
              </h2>
            </div>

            {isNewRecord && (
              <div className="py-4 px-6 bg-gradient-to-r from-yellow-500/20 via-yellow-400/20 to-yellow-500/20 rounded-xl border-2 border-yellow-500/50 animate-pulse">
                <p className="text-xl font-bold text-yellow-600 dark:text-yellow-400">
                  🎉 {language === 'da' ? 'Ny rekord!' : 'New Record!'} 🎉
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="p-6 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 border-2 border-primary/20">
                <div className="text-sm text-muted-foreground mb-2">
                  {language === 'da' ? 'Din score' : 'Your Score'}
                </div>
                <div className="text-5xl font-bold text-primary">
                  {finalScore}
                </div>
              </div>
              
              <div className="p-6 rounded-xl bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 border-2 border-yellow-500/20">
                <div className="text-sm text-muted-foreground mb-2">
                  {language === 'da' ? 'Highscore' : 'High Score'}
                </div>
                <div className="text-5xl font-bold text-yellow-600 dark:text-yellow-400">
                  {getCurrentHighScore()}
                </div>
              </div>
            </div>

            <div className="flex gap-4 justify-center pt-4">
              <Button
                onClick={startGame}
                size="lg"
                className="bg-gradient-to-r from-primary via-accent to-primary hover:shadow-2xl hover:scale-105 transition-all duration-300 font-bold px-8"
              >
                <RocketLaunch size={24} weight="duotone" className="mr-2" />
                {language === 'da' ? 'Spil igen' : 'Play Again'}
              </Button>
              
              <Button
                onClick={resetGame}
                variant="outline"
                size="lg"
                className="px-8 font-bold"
              >
                {language === 'da' ? 'Menu' : 'Menu'}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return null
}
