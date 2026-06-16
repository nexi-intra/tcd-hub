import { useState, useEffect, useRef } from 'react'
import { RocketLaunch, Trophy, X, Timer, Lightning, Speedometer, Fire, Flame, Crown } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useKV } from '@github/spark/hooks'
import { useLanguage } from '@/contexts/LanguageContext'

interface Position {
  x: number
  y: number
}

interface FallingObject {
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
type GameState = 'menu' | 'countdown' | 'playing' | 'ended'

const DIFFICULTY_SETTINGS = {
  easy: {
    objectSpeed: 2,
    spawnRate: 1500,
    label: { en: 'Easy', da: 'Let' },
    description: { en: 'Slow objects', da: 'Langsomme objekter' },
    icon: Speedometer,
    color: 'text-green-500',
    bgGradient: 'from-green-500/20 to-green-600/20',
    borderColor: 'border-green-500/30',
    glowColor: 'shadow-green-500/20',
  },
  medium: {
    objectSpeed: 3.5,
    spawnRate: 1100,
    label: { en: 'Medium', da: 'Mellem' },
    description: { en: 'Medium speed', da: 'Mellem hastighed' },
    icon: Lightning,
    color: 'text-yellow-500',
    bgGradient: 'from-yellow-500/20 to-yellow-600/20',
    borderColor: 'border-yellow-500/30',
    glowColor: 'shadow-yellow-500/20',
  },
  hard: {
    objectSpeed: 5,
    spawnRate: 800,
    label: { en: 'Hard', da: 'Svær' },
    description: { en: 'Fast objects', da: 'Hurtige objekter' },
    icon: Fire,
    color: 'text-red-500',
    bgGradient: 'from-red-500/20 to-red-600/20',
    borderColor: 'border-red-500/30',
    glowColor: 'shadow-red-500/20',
  },
  expert: {
    objectSpeed: 7,
    spawnRate: 600,
    label: { en: 'Expert', da: 'Ekspert' },
    description: { en: 'Very fast!', da: 'Meget hurtigt!' },
    icon: Flame,
    color: 'text-purple-500',
    bgGradient: 'from-purple-500/20 to-purple-600/20',
    borderColor: 'border-purple-500/30',
    glowColor: 'shadow-purple-500/20',
  }
}

const PLAYER_SIZE = 50
const OBJECT_SIZE = 40
const COUNTDOWN_DURATION = 3

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
  const [playerX, setPlayerX] = useState(0)
  const [objects, setObjects] = useState<FallingObject[]>([])
  const [countdown, setCountdown] = useState(COUNTDOWN_DURATION)
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
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
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

  const spawnObject = () => {
    if (!gameAreaRef.current) return

    const rect = gameAreaRef.current.getBoundingClientRect()
    const x = Math.random() * (rect.width - OBJECT_SIZE)

    const newObject: FallingObject = {
      id: Date.now() + Math.random(),
      x,
      y: -OBJECT_SIZE,
      speed: DIFFICULTY_SETTINGS[difficulty].objectSpeed
    }

    setObjects(prev => [...prev, newObject])
  }

  const checkCollision = (objX: number, objY: number): boolean => {
    if (!gameAreaRef.current) return false

    const rect = gameAreaRef.current.getBoundingClientRect()
    const playerY = rect.height - PLAYER_SIZE - 20

    const collisionMargin = 5

    const playerLeft = playerX + collisionMargin
    const playerRight = playerX + PLAYER_SIZE - collisionMargin
    const playerTop = playerY + collisionMargin
    const playerBottom = playerY + PLAYER_SIZE - collisionMargin

    const objLeft = objX + collisionMargin
    const objRight = objX + OBJECT_SIZE - collisionMargin
    const objTop = objY + collisionMargin
    const objBottom = objY + OBJECT_SIZE - collisionMargin

    const xOverlap = playerRight >= objLeft && playerLeft <= objRight
    const yOverlap = playerBottom >= objTop && playerTop <= objBottom

    return xOverlap && yOverlap
  }

  const gameLoop = () => {
    if (!gameAreaRef.current) return

    const rect = gameAreaRef.current.getBoundingClientRect()

    setObjects(prev => {
      const updated = prev.map(obj => ({
        ...obj,
        y: obj.y + obj.speed
      })).filter(obj => obj.y < rect.height)

      for (const obj of updated) {
        if (checkCollision(obj.x, obj.y)) {
          endGame()
          return prev
        }
      }

      return updated
    })

    setScore(prev => prev + 1)

    const moveSpeed = 8
    if (keysPressed.current.has('ArrowLeft') || keysPressed.current.has('a')) {
      setPlayerX(prev => Math.max(0, prev - moveSpeed))
    }
    if (keysPressed.current.has('ArrowRight') || keysPressed.current.has('d')) {
      setPlayerX(prev => Math.min(rect.width - PLAYER_SIZE, prev + moveSpeed))
    }

    animationFrameRef.current = requestAnimationFrame(gameLoop)
  }

  const startCountdown = () => {
    setGameState('countdown')
    setScore(0)
    setObjects([])
    setCountdown(COUNTDOWN_DURATION)
    
    if (!gameAreaRef.current) return
    const rect = gameAreaRef.current.getBoundingClientRect()
    setPlayerX((rect.width - PLAYER_SIZE) / 2)
    
    let currentCount = COUNTDOWN_DURATION
    
    countdownIntervalRef.current = setInterval(() => {
      currentCount--
      
      if (currentCount <= 0) {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current)
          countdownIntervalRef.current = null
        }
        startGame()
      } else {
        setCountdown(currentCount)
      }
    }, 1000)
  }

  const startGame = () => {
    setGameState('playing')
    gameLoop()
    
    spawnIntervalRef.current = setInterval(() => {
      spawnObject()
    }, DIFFICULTY_SETTINGS[difficulty].spawnRate)
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
    setObjects([])
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    
    if (spawnIntervalRef.current) {
      clearInterval(spawnIntervalRef.current)
      spawnIntervalRef.current = null
    }

    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current)
      countdownIntervalRef.current = null
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', 'a', 'd'].includes(e.key)) {
        e.preventDefault()
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
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (spawnIntervalRef.current) {
        clearInterval(spawnIntervalRef.current)
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current)
      }
    }
  }, [])

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (spawnIntervalRef.current) {
        clearInterval(spawnIntervalRef.current)
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current)
      }
    }
  }, [difficulty])

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
              onClick={startCountdown}
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

  if (gameState === 'countdown') {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="text-center space-y-8">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary via-accent to-primary opacity-20 blur-3xl animate-pulse" />
            <div className="relative text-[200px] font-bold bg-gradient-to-br from-primary via-accent to-primary bg-clip-text text-transparent animate-bounce">
              {countdown}
            </div>
          </div>
          <p className="text-2xl text-muted-foreground animate-pulse">
            {language === 'da' ? 'Gør dig klar...' : 'Get ready...'}
          </p>
        </div>
      </div>
    )
  }

  if (gameState === 'playing') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 rounded-xl border-2 border-primary/20">
          <div className="flex items-center gap-4">
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
          className="relative h-[600px] bg-gradient-to-b from-background to-muted/30 rounded-xl border-2 border-primary/20 overflow-hidden shadow-2xl"
        >
          <div
            className="absolute bottom-5 bg-gradient-to-r from-primary via-accent to-primary rounded-full shadow-2xl transition-all duration-100"
            style={{
              left: `${playerX}px`,
              width: `${PLAYER_SIZE}px`,
              height: `${PLAYER_SIZE}px`,
            }}
          >
            <div className="w-full h-full flex items-center justify-center">
              <RocketLaunch size={32} weight="fill" className="text-white" />
            </div>
          </div>

          {objects.map(obj => (
            <div
              key={obj.id}
              className="absolute bg-gradient-to-br from-destructive to-destructive/70 rounded-lg shadow-xl"
              style={{
                left: `${obj.x}px`,
                top: `${obj.y}px`,
                width: `${OBJECT_SIZE}px`,
                height: `${OBJECT_SIZE}px`,
              }}
            >
              <div className="w-full h-full flex items-center justify-center">
                <X size={24} weight="bold" className="text-white" />
              </div>
            </div>
          ))}

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center text-xs text-muted-foreground bg-card/80 backdrop-blur px-4 py-2 rounded-full border">
            {language === 'da' ? '← → eller A D for at flytte' : '← → or A D to move'}
          </div>
        </div>
      </div>
    )
  }

  if (gameState === 'ended') {
    const finalScore = Math.floor(score / 10)
    const highScore = getCurrentHighScore()
    const isNewRecord = finalScore > highScore

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
                onClick={startCountdown}
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
