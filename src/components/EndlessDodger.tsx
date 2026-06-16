import { useState, useEffect, useRef } from 'react'
import { Trophy, ArrowLeft, ArrowRight, User, Crown, X, Timer, Lightning, Speedometer, Fire, Flame, Medal, Star } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useKV } from '@github/spark/hooks'
import { useLanguage } from '@/contexts/LanguageContext'

interface FallingObject {
  id: number
  x: number
  y: number
  speed: number
  size: number
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

interface User {
  email: string
  fullName: string
  role: string
  phone?: string
}

type Difficulty = 'easy' | 'medium' | 'hard' | 'expert'
type GameState = 'menu' | 'countdown' | 'playing' | 'gameover'

const DIFFICULTY_SETTINGS = {
  easy: {
    spawnRate: 1200,
    initialSpeed: 2,
    maxSpeed: 5,
    label: { en: 'Easy', da: 'Let' },
    description: { en: 'Relaxed pace', da: 'Roligt tempo' },
    icon: Speedometer,
    color: 'text-green-500',
    bgGradient: 'from-green-500/20 to-green-600/20',
    borderColor: 'border-green-500/30',
    glowColor: 'shadow-green-500/20'
  },
  medium: {
    spawnRate: 900,
    initialSpeed: 3,
    maxSpeed: 7,
    label: { en: 'Medium', da: 'Mellem' },
    description: { en: 'Moderate challenge', da: 'Moderat udfordring' },
    icon: Lightning,
    color: 'text-yellow-500',
    bgGradient: 'from-yellow-500/20 to-yellow-600/20',
    borderColor: 'border-yellow-500/30',
    glowColor: 'shadow-yellow-500/20'
  },
  hard: {
    spawnRate: 600,
    initialSpeed: 4,
    maxSpeed: 9,
    label: { en: 'Hard', da: 'Svær' },
    description: { en: 'Fast & furious', da: 'Hurtigt & rasende' },
    icon: Fire,
    color: 'text-red-500',
    bgGradient: 'from-red-500/20 to-red-600/20',
    borderColor: 'border-red-500/30',
    glowColor: 'shadow-red-500/20'
  },
  expert: {
    spawnRate: 400,
    initialSpeed: 5,
    maxSpeed: 12,
    label: { en: 'Expert', da: 'Ekspert' },
    description: { en: 'Extreme difficulty', da: 'Ekstrem sværhedsgrad' },
    icon: Flame,
    color: 'text-purple-500',
    bgGradient: 'from-purple-500/20 to-purple-600/20',
    borderColor: 'border-purple-500/30',
    glowColor: 'shadow-purple-500/20'
  }
}

const PLAYER_WIDTH = 50
const PLAYER_HEIGHT = 50
const GAME_WIDTH = 600
const GAME_HEIGHT = 500
const COLLISION_MARGIN = 8
const TIMER_DURATION = 30
const COUNTDOWN_DURATION = 3
const SPEED_INCREASE_INTERVAL = 5000

export function EndlessDodger({ userEmail }: { userEmail?: string }) {
  const { language } = useLanguage()
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [gameState, setGameState] = useState<GameState>('menu')
  const [playerX, setPlayerX] = useState(GAME_WIDTH / 2 - PLAYER_WIDTH / 2)
  const [fallingObjects, setFallingObjects] = useState<FallingObject[]>([])
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION)
  const [countdown, setCountdown] = useState(COUNTDOWN_DURATION)
  const [currentSpeed, setCurrentSpeed] = useState(DIFFICULTY_SETTINGS.medium.initialSpeed)
  const [spawnRate, setSpawnRate] = useState(DIFFICULTY_SETTINGS.medium.spawnRate)
  const [users, setUsers] = useState<User[]>([])
  const [globalLeaderboard, setGlobalLeaderboard] = useKV<GlobalLeaderboard>('endless-dodger-global-leaderboard', {
    easy: [],
    medium: [],
    hard: [],
    expert: []
  })

  const gameLoopRef = useRef<number | undefined>(undefined)
  const spawnTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const speedIncreaseTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
  const keysPressed = useRef<Set<string>>(new Set())
  const lastUpdateRef = useRef<number>(Date.now())
  const startTimeRef = useRef<number>(0)

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
      
      timerIntervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleGameOver()
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } else if (gameState === 'menu' || gameState === 'gameover') {
      stopGame()
    }

    return () => {
      if (gameState === 'menu' || gameState === 'gameover') {
        stopGame()
      }
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
      setCurrentSpeed(prev => Math.min(DIFFICULTY_SETTINGS[difficulty].maxSpeed, prev + 0.5))
      speedIncreaseTimerRef.current = setTimeout(increase, SPEED_INCREASE_INTERVAL)
    }
    speedIncreaseTimerRef.current = setTimeout(increase, SPEED_INCREASE_INTERVAL)
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
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current)
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current)
    }
    keysPressed.current.clear()
  }

  const handleGameOver = async () => {
    setGameState('gameover')
    
    setScore((finalScore) => {
      updateGlobalLeaderboard(finalScore)
      return finalScore
    })
    
    await trackGamePlay(difficulty)
  }

  const startCountdown = () => {
    stopGame()
    
    const settings = DIFFICULTY_SETTINGS[difficulty]
    setCurrentSpeed(settings.initialSpeed)
    setSpawnRate(settings.spawnRate)
    
    setScore(0)
    setFallingObjects([])
    setPlayerX(GAME_WIDTH / 2 - PLAYER_WIDTH / 2)
    setTimeLeft(TIMER_DURATION)
    setCountdown(COUNTDOWN_DURATION)
    
    setGameState('countdown')
    
    countdownIntervalRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current)
          }
          startPlaying()
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const startPlaying = () => {
    setGameState('playing')
  }

  const handleRestart = () => {
    startCountdown()
  }

  const handleBackToMenu = () => {
    setGameState('menu')
  }

  useEffect(() => {
    return () => {
      stopGame()
    }
  }, [])

  const getTopScoreForDifficulty = (diff: Difficulty): number => {
    const board = globalLeaderboard?.[diff] || []
    return board.length > 0 ? board[0].score : 0
  }

  const getUserRankForDifficulty = (diff: Difficulty): number | null => {
    const board = globalLeaderboard?.[diff] || []
    const index = board.findIndex(entry => entry.email === userEmail)
    return index !== -1 ? index + 1 : null
  }

  if (gameState === 'menu') {
    return (
      <div className="space-y-6">
        <Card className="p-6 bg-gradient-to-br from-card via-primary/5 to-accent/5 border-2">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-gradient-to-br from-[oklch(0.65_0.25_30)] via-[oklch(0.60_0.22_15)] to-[oklch(0.65_0.25_30)] shadow-lg">
                <Lightning size={32} weight="duotone" className="text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-[oklch(0.65_0.25_30)] to-[oklch(0.60_0.22_15)] bg-clip-text text-transparent">
                  Endless Dodger
                </h2>
                <p className="text-sm text-muted-foreground">
                  {language === 'da' 
                    ? 'Undgå faldende objekter så længe som muligt!' 
                    : 'Avoid falling objects as long as possible!'}
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
                  ? 'Du har 30 sekunder! Undgå alle objekter.' 
                  : 'You have 30 seconds! Avoid all objects.'}
              </p>
              <Button onClick={startCountdown} size="lg" className="px-8 bg-gradient-to-r from-[oklch(0.65_0.25_30)] to-[oklch(0.60_0.22_15)] hover:opacity-90">
                {language === 'da' ? 'Start spil' : 'Start Game'}
              </Button>
            </div>
          </div>
        </Card>

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
                                  {getDisplayName(userEmail || '')}
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
        </Card>
      </div>
    )
  }

  if (gameState === 'countdown') {
    return (
      <Card className="p-0 overflow-hidden bg-gradient-to-br from-primary/10 via-accent/10 to-background">
        <div className="h-[600px] flex items-center justify-center">
          <div className="text-center">
            <div className="text-[200px] font-bold bg-gradient-to-br from-[oklch(0.65_0.25_30)] via-[oklch(0.60_0.22_15)] to-[oklch(0.65_0.25_30)] bg-clip-text text-transparent animate-pulse leading-none">
              {countdown}
            </div>
            <div className="text-2xl font-semibold text-muted-foreground mt-4">
              {language === 'da' ? 'Gør dig klar...' : 'Get ready...'}
            </div>
          </div>
        </div>
      </Card>
    )
  }

  if (gameState === 'playing') {
    return (
      <Card className="p-0 overflow-hidden border-2 border-primary/30 shadow-2xl">
        <div className="relative bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-6 border-b-2 border-primary/30">
          <div className="absolute inset-0 bg-gradient-to-r from-[oklch(0.65_0.25_30)]/5 via-[oklch(0.60_0.22_15)]/10 to-[oklch(0.65_0.25_30)]/5" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-8">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-[oklch(0.65_0.25_30)] to-[oklch(0.60_0.22_15)] blur-xl opacity-30 group-hover:opacity-50 transition-opacity" />
                <div className="relative px-6 py-3 rounded-xl bg-gradient-to-br from-[oklch(0.65_0.25_30)]/20 to-[oklch(0.60_0.22_15)]/30 border-2 border-[oklch(0.65_0.25_30)]/40 backdrop-blur-sm">
                  <div className="text-[10px] text-primary-foreground/70 uppercase tracking-widest font-bold mb-1 flex items-center gap-1">
                    <Trophy size={12} weight="fill" />
                    {language === 'da' ? 'Point' : 'Score'}
                  </div>
                  <div className="text-4xl font-black bg-gradient-to-br from-white to-primary-foreground bg-clip-text text-transparent drop-shadow-lg">
                    {score}
                  </div>
                </div>
              </div>
              
              <div className="h-14 w-[2px] bg-gradient-to-b from-transparent via-border to-transparent" />
              
              <div className="relative group">
                <div className={`absolute inset-0 blur-lg transition-opacity ${timeLeft <= 5 ? 'bg-destructive opacity-40' : 'bg-[oklch(0.65_0.25_30)]/20 opacity-20'}`} />
                <div className={`relative px-5 py-3 rounded-xl backdrop-blur-sm transition-all ${timeLeft <= 5 ? 'bg-gradient-to-br from-destructive/30 to-red-600/30 border-2 border-destructive shadow-lg shadow-destructive/30' : 'bg-gradient-to-br from-[oklch(0.65_0.25_30)]/20 to-[oklch(0.65_0.25_30)]/30 border-2 border-[oklch(0.65_0.25_30)]/40'}`}>
                  <div className={`text-[10px] uppercase tracking-widest font-bold mb-1 flex items-center gap-1 ${timeLeft <= 5 ? 'text-destructive-foreground/90' : 'text-primary-foreground/70'}`}>
                    <Timer size={12} weight="fill" className={timeLeft <= 5 ? 'animate-pulse' : ''} />
                    {language === 'da' ? 'Tid' : 'Time'}
                  </div>
                  <div className={`text-4xl font-black drop-shadow-lg ${timeLeft <= 5 ? 'text-red-400 animate-pulse' : 'text-blue-400'}`}>
                    {timeLeft}s
                  </div>
                </div>
              </div>
            </div>
            
            <Button 
              onClick={handleGameOver} 
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
          className="relative"
          style={{ 
            height: '600px',
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
      </Card>
    )
  }

  if (gameState === 'gameover') {
    const isTopScore = score > getCurrentHighScore()

    return (
      <div className="space-y-6">
        <Card className="p-6 text-center bg-gradient-to-br from-primary/10 via-accent/10 to-background border-2 border-primary/20">
          <div className="flex justify-center mb-6">
            <div className="p-6 rounded-3xl bg-gradient-to-br from-red-500 via-orange-500 to-red-500 shadow-2xl">
              <X size={64} weight="duotone" className="text-white" />
            </div>
          </div>
          <h3 className="text-2xl font-bold mb-2 bg-gradient-to-r from-[oklch(0.65_0.25_30)] to-[oklch(0.60_0.22_15)] bg-clip-text text-transparent">
            {language === 'da' ? 'Spil slut!' : 'Game Over!'}
          </h3>
          <div className="space-y-4">
            <div>
              <p className="text-muted-foreground">
                {language === 'da' ? 'Din sidste score' : 'Your final score'}
              </p>
              <p className="text-4xl font-bold bg-gradient-to-r from-[oklch(0.65_0.25_30)] to-[oklch(0.60_0.22_15)] bg-clip-text text-transparent">
                {score}
              </p>
            </div>
          </div>
          {isTopScore && (
            <p className="text-sm text-accent font-semibold mt-4 flex items-center gap-2 justify-center">
              <Trophy size={20} weight="fill" />
              {language === 'da' ? '🎉 Ny højeste score!' : '🎉 New high score!'}
            </p>
          )}
          <div className="flex gap-4 mt-6">
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
        </Card>
      </div>
    )
  }

  return null
}
