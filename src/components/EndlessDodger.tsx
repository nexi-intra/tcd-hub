import { useState, useEffect, useRef } from 'react'
import { RocketLaunch, Trophy, X, Lightning, Speedometer, Fire, Flame, Crown, Medal, Star } from '@phosphor-icons/react'
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

  const endGame = async (finalScore?: number) => {
    setGameState('ended')
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    
    if (spawnIntervalRef.current) {
      clearInterval(spawnIntervalRef.current)
      spawnIntervalRef.current = null
    }

    const scoreToSave = finalScore !== undefined ? Math.floor(finalScore / 10) : Math.floor(score / 10)
    updateGlobalLeaderboard(scoreToSave)
    
    await trackGamePlay(difficulty)
  }

  const trackGamePlay = async (gameDifficulty: Difficulty) => {
    if (!userEmail) return

    try {
      const gameStats = await window.spark.kv.get<Record<string, Record<Difficulty, number>>>('endless-dodger-play-counts') || {}
      
      if (!gameStats[userEmail]) {
        gameStats[userEmail] = { easy: 0, medium: 0, hard: 0, expert: 0 }
      }
      
      gameStats[userEmail][gameDifficulty] = (gameStats[userEmail][gameDifficulty] || 0) + 1
      
      await window.spark.kv.set('endless-dodger-play-counts', gameStats)
    } catch (error) {
      console.error('Error tracking game play:', error)
    }
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
              endGame(currentScore)
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

  return (
    <div className="space-y-6">
      <Card className="p-6 bg-gradient-to-br from-card via-primary/5 to-accent/5 border-2">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-gradient-to-br from-primary to-accent shadow-lg">
              <RocketLaunch size={32} weight="duotone" className="text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Endless Dodger
              </h2>
              <p className="text-sm text-muted-foreground">
                {language === 'da' 
                  ? 'Undgå meteoritter så længe som muligt!' 
                  : 'Avoid meteorites for as long as you can!'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center p-4 rounded-lg bg-gradient-to-br from-accent/10 to-primary/10 border border-accent/20">
              <div className="text-sm text-muted-foreground font-semibold">
                {language === 'da' ? 'Højeste score' : 'High Score'}
              </div>
              <div className="text-2xl font-bold text-primary flex items-center gap-2 justify-center mt-1">
                <Trophy size={24} weight="fill" className="text-accent" />
                {getCurrentHighScore()}
              </div>
            </div>
          </div>
        </div>

        {gameState === 'menu' && (
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="text-center">
                <p className="text-sm font-semibold text-muted-foreground mb-3">
                  {language === 'da' ? 'Vælg sværhedsgrad' : 'Select Difficulty'}
                </p>
              </div>
              <div className="flex items-center justify-center gap-4">
                {(Object.keys(DIFFICULTY_SETTINGS) as Difficulty[]).map((diff) => {
                  const setting = DIFFICULTY_SETTINGS[diff]
                  const Icon = setting.icon
                  const isSelected = difficulty === diff
                  
                  return (
                    <div
                      key={diff}
                      onClick={() => setDifficulty(diff)}
                      className={`group relative cursor-pointer rounded-xl p-6 transition-all duration-300 min-w-[140px] ${
                        isSelected 
                          ? `bg-gradient-to-br ${setting.bgGradient} border-2 ${setting.borderColor} shadow-lg ${setting.glowColor}` 
                          : 'bg-card border-2 border-border hover:border-border/60 hover:shadow-md'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-3">
                        <Icon 
                          size={28} 
                          weight="duotone" 
                          className={isSelected ? setting.color : `${setting.color} opacity-60 group-hover:opacity-100`} 
                        />
                        <div className="flex flex-col items-center gap-1">
                          <span className={`font-bold text-base ${isSelected ? setting.color : 'text-foreground'}`}>
                            {setting.label[language as 'en' | 'da']}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {setting.description[language as 'en' | 'da']}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                {language === 'da' 
                  ? 'Overlev så længe som muligt! Undgå meteoritter der falder fra toppen.' 
                  : 'Survive as long as possible! Avoid meteorites falling from the top.'}
              </p>
              <Button onClick={startGame} size="lg" className="px-8 bg-gradient-to-r from-primary to-accent hover:opacity-90">
                {language === 'da' ? 'Start spil' : 'Start Game'}
              </Button>
            </div>
          </div>
        )}
      </Card>

      {gameState === 'playing' && (
        <Card className="p-0 overflow-hidden border-2 border-primary/30 shadow-2xl">
          <div className="relative bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 border-b-2 border-primary/30">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-accent/10 to-primary/5" />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-8">
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary to-accent blur-xl opacity-30 group-hover:opacity-50 transition-opacity" />
                  <div className="relative px-6 py-3 rounded-xl bg-gradient-to-br from-primary/20 to-accent/30 border-2 border-primary/40 backdrop-blur-sm">
                    <div className="text-[10px] text-primary-foreground/70 uppercase tracking-widest font-bold mb-1 flex items-center gap-1">
                      <Trophy size={12} weight="fill" />
                      {language === 'da' ? 'Point' : 'Score'}
                    </div>
                    <div className="text-4xl font-black bg-gradient-to-br from-white to-primary-foreground bg-clip-text text-transparent drop-shadow-lg">
                      {Math.floor(score / 10)}
                    </div>
                  </div>
                </div>
              </div>
              
              <Button 
                onClick={resetGame} 
                variant="destructive" 
                size="lg"
                className="shadow-xl hover:shadow-2xl transition-shadow font-bold"
              >
                <X size={20} weight="bold" className="mr-2" />
                {language === 'da' ? 'Stop' : 'Quit'}
              </Button>
            </div>
          </div>

          <div
            ref={gameAreaRef}
            className="relative"
            style={{ 
              height: '600px',
              cursor: 'crosshair',
              background: `
                repeating-linear-gradient(
                  0deg,
                  transparent,
                  transparent 50px,
                  oklch(0.9 0.01 250 / 0.15) 50px,
                  oklch(0.9 0.01 250 / 0.15) 51px
                ),
                repeating-linear-gradient(
                  90deg,
                  transparent,
                  transparent 50px,
                  oklch(0.9 0.01 250 / 0.15) 50px,
                  oklch(0.9 0.01 250 / 0.15) 51px
                ),
                linear-gradient(
                  135deg,
                  oklch(0.98 0.02 250) 0%,
                  oklch(0.96 0.03 280) 25%,
                  oklch(0.97 0.02 210) 50%,
                  oklch(0.96 0.03 240) 75%,
                  oklch(0.98 0.02 250) 100%
                )
              `
            }}
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
          </div>
        </Card>
      )}

      {gameState === 'ended' && (
        <Card className="p-6 text-center bg-gradient-to-br from-primary/10 via-accent/10 to-background border-2 border-primary/20">
          <h3 className="text-2xl font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {language === 'da' ? 'Spil slut!' : 'Game Over!'}
          </h3>
          <div className="space-y-4">
            <div>
              <p className="text-muted-foreground">
                {language === 'da' ? 'Din sidste score' : 'Your final score'}
              </p>
              <p className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                {Math.floor(score / 10)}
              </p>
            </div>
          </div>
          {Math.floor(score / 10) > getCurrentHighScore() && Math.floor(score / 10) > 0 && (
            <p className="text-sm text-accent font-semibold mt-4 flex items-center gap-2 justify-center">
              <Trophy size={20} weight="fill" />
              {language === 'da' ? '🎉 Ny højeste score!' : '🎉 New high score!'}
            </p>
          )}
          <Button onClick={() => setGameState('menu')} className="mt-6" size="lg">
            {language === 'da' ? 'Tilbage til menu' : 'Back to Menu'}
          </Button>
        </Card>
      )}

      <Card className="p-6 bg-gradient-to-br from-accent/5 via-primary/5 to-card border-2 border-accent/20">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-full bg-gradient-to-br from-accent to-primary shadow-lg">
            <Crown size={28} weight="duotone" className="text-accent-foreground" />
          </div>
          <div>
            <h3 className="text-xl font-bold bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
              {language === 'da' ? 'Global resultattavle' : 'Global Leaderboard'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {language === 'da' ? 'Konkurer med andre medarbejdere!' : 'Compete with other employees!'}
            </p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-4 md:grid-cols-2">
          {(Object.keys(DIFFICULTY_SETTINGS) as Difficulty[]).map((diff) => {
            const setting = DIFFICULTY_SETTINGS[diff]
            const Icon = setting.icon
            const leaderboard = globalLeaderboard?.[diff] || []
            const topScore = getTopScoreForDifficulty(diff)
            const userRank = getUserRankForDifficulty(diff)
            const userEntry = leaderboard.find(entry => entry.email === userEmail)

            return (
              <div key={diff} className="space-y-3">
                <div className={`p-4 rounded-lg border-2 transition-all ${
                  userRank === 1
                    ? 'border-accent bg-gradient-to-br from-accent/10 to-primary/10 shadow-lg'
                    : 'border-border bg-gradient-to-br from-card to-muted/20'
                }`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`p-2 rounded-lg ${
                      diff === 'easy' ? 'bg-gradient-to-br from-green-500/20 to-green-600/20' :
                      diff === 'medium' ? 'bg-gradient-to-br from-yellow-500/20 to-yellow-600/20' :
                      diff === 'hard' ? 'bg-gradient-to-br from-red-500/20 to-red-600/20' :
                      'bg-gradient-to-br from-purple-500/20 to-purple-600/20'
                    }`}>
                      <Icon size={24} weight="duotone" className={setting.color} />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold">
                        {setting.label[language as 'en' | 'da']}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {setting.description[language as 'en' | 'da']}
                      </div>
                    </div>
                  </div>

                  {leaderboard.length > 0 ? (
                    <div className="space-y-2">
                      {leaderboard.slice(0, 10).map((entry, index) => {
                        const isCurrentUser = entry.email === userEmail
                        const rankColors = [
                          'text-yellow-500',
                          'text-gray-400',
                          'text-amber-600'
                        ]
                        const rankIcons = [Crown, Medal, Star]
                        const RankIcon = index < 3 ? rankIcons[index] : null

                        return (
                          <div
                            key={entry.email}
                            className={`flex items-center gap-3 p-2 rounded-lg transition-all ${
                              isCurrentUser
                                ? 'bg-primary/10 border border-primary/30 shadow-md'
                                : 'bg-muted/30'
                            }`}
                          >
                            <div className="flex items-center justify-center w-8 h-8">
                              {RankIcon ? (
                                <RankIcon 
                                  size={20} 
                                  weight="fill" 
                                  className={rankColors[index]} 
                                />
                              ) : (
                                <span className="text-sm font-bold text-muted-foreground">
                                  #{index + 1}
                                </span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className={`text-sm font-medium truncate ${
                                isCurrentUser ? 'text-primary font-bold' : 'text-foreground'
                              }`}>
                                {getDisplayName(entry.email)}
                              </div>
                            </div>
                            <div className={`text-lg font-bold ${
                              isCurrentUser ? 'text-primary' : 'text-muted-foreground'
                            }`}>
                              {entry.score}
                            </div>
                          </div>
                        )
                      })}

                      {userEntry && userRank && userRank > 10 && (
                        <>
                          <div className="text-center py-1">
                            <span className="text-xs text-muted-foreground">...</span>
                          </div>
                          <div className="flex items-center gap-3 p-2 rounded-lg bg-primary/10 border border-primary/30 shadow-md">
                            <div className="flex items-center justify-center w-8 h-8">
                              <span className="text-sm font-bold text-primary">
                                #{userRank}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-bold text-primary truncate">
                                {getDisplayName(userEmail)}
                              </div>
                            </div>
                            <div className="text-lg font-bold text-primary">
                              {userEntry.score}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <Trophy size={32} className="text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {language === 'da'
                          ? 'Ingen scores endnu'
                          : 'No scores yet'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {language === 'da'
                          ? 'Vær den første!'
                          : 'Be the first!'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {(globalLeaderboard?.easy?.length || 0) === 0 && 
         (globalLeaderboard?.medium?.length || 0) === 0 && 
         (globalLeaderboard?.hard?.length || 0) === 0 &&
         (globalLeaderboard?.expert?.length || 0) === 0 && (
          <div className="mt-6 text-center p-6 rounded-lg bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 border border-primary/10">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Crown size={24} weight="duotone" className="text-primary" />
              <h4 className="text-lg font-bold text-primary">
                {language === 'da' ? 'Start konkurrencen!' : 'Start the Competition!'}
              </h4>
            </div>
            <p className="text-sm text-muted-foreground">
              {language === 'da'
                ? 'Spil for at tilføje din score til resultattavlen og konkurrere med andre medarbejdere!'
                : 'Play to add your score to the leaderboard and compete with other employees!'}
            </p>
          </div>
        )}
      </Card>
    </div>
  )
}
