import { useState, useEffect, useRef } from 'react'
import { Cube, Trophy, X, Lightning, Speedometer, Fire, Flame, Crown, Medal, Star, Play } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useKV } from '@github/spark/hooks'
import { useLanguage } from '@/contexts/LanguageContext'
import { toast } from 'sonner'

interface Brick {
  id: number
  x: number
  y: number
  width: number
  height: number
  color: string
  hits: number
  maxHits: number
  points: number
}

interface Ball {
  x: number
  y: number
  dx: number
  dy: number
  radius: number
}

interface Paddle {
  x: number
  y: number
  width: number
  height: number
}

interface PowerUp {
  id: number
  x: number
  y: number
  width: number
  height: number
  type: 'extraLife' | 'shield' | 'fireball' | 'multiBall' | 'shrinkPaddle' | 'enlargePaddle'
  dy: number
}

interface LeaderboardEntry {
  email: string
  score: number
  level: number
  timestamp: number
}

interface GlobalLeaderboard {
  easy: LeaderboardEntry[]
  medium: LeaderboardEntry[]
  hard: LeaderboardEntry[]
  expert: LeaderboardEntry[]
}

type Difficulty = 'easy' | 'medium' | 'hard' | 'expert'
type GameState = 'menu' | 'playing' | 'paused' | 'levelComplete' | 'gameOver' | 'waitingToLaunch'

const DIFFICULTY_SETTINGS = {
  easy: {
    ballSpeed: 7,
    label: { en: 'Easy', da: 'Let' },
    description: { en: 'Slow ball', da: 'Langsom bold' },
    icon: Speedometer,
    color: 'text-green-500',
    bgGradient: 'from-green-500/20 to-green-600/20',
    borderColor: 'border-green-500/30',
    glowColor: 'shadow-green-500/20',
  },
  medium: {
    ballSpeed: 9,
    label: { en: 'Medium', da: 'Mellem' },
    description: { en: 'Medium speed', da: 'Mellem hastighed' },
    icon: Lightning,
    color: 'text-yellow-500',
    bgGradient: 'from-yellow-500/20 to-yellow-600/20',
    borderColor: 'border-yellow-500/30',
    glowColor: 'shadow-yellow-500/20',
  },
  hard: {
    ballSpeed: 11,
    label: { en: 'Hard', da: 'Svær' },
    description: { en: 'Fast ball', da: 'Hurtig bold' },
    icon: Fire,
    color: 'text-red-500',
    bgGradient: 'from-red-500/20 to-red-600/20',
    borderColor: 'border-red-500/30',
    glowColor: 'shadow-red-500/20',
  },
  expert: {
    ballSpeed: 13,
    label: { en: 'Expert', da: 'Ekspert' },
    description: { en: 'Very fast!', da: 'Meget hurtigt!' },
    icon: Flame,
    color: 'text-purple-500',
    bgGradient: 'from-purple-500/20 to-purple-600/20',
    borderColor: 'border-purple-500/30',
    glowColor: 'shadow-purple-500/20',
  }
}

const GAME_WIDTH = 800
const GAME_HEIGHT = 600
const PADDLE_HEIGHT = 15
const INITIAL_PADDLE_WIDTH = 120
const BALL_RADIUS = 8
const BRICK_ROWS = 6
const BRICK_COLS = 10
const BRICK_PADDING = 5
const BRICK_OFFSET_TOP = 80
const BRICK_OFFSET_LEFT = 35
const DEFLECTOR_SIZE = 40
const POWERUP_SIZE = 30
const POWERUP_FALL_SPEED = 3
const POWERUP_SPAWN_CHANCE = 0.2

const BRICK_COLORS = [
  { color: '#FF6B9D', hits: 3, points: 30 },
  { color: '#C94EFF', hits: 3, points: 30 },
  { color: '#4ECFFF', hits: 2, points: 20 },
  { color: '#4EFF8B', hits: 2, points: 20 },
  { color: '#FFD84E', hits: 1, points: 10 },
  { color: '#FF8B4E', hits: 1, points: 10 },
]

const POWERUP_TYPES: PowerUp['type'][] = ['extraLife', 'shield', 'multiBall', 'shrinkPaddle', 'enlargePaddle', 'fireball']

const POWERUP_CONFIG = {
  extraLife: { color: '#4EFF8B', symbol: '♥', label: { en: 'Extra Life', da: 'Ekstra Liv' } },
  shield: { color: '#4ECFFF', symbol: '🛡', label: { en: 'Shield', da: 'Skjold' } },
  fireball: { color: '#FF8B4E', symbol: '🔥', label: { en: 'Fireball', da: 'Ildkugle' } },
  multiBall: { color: '#FF6B9D', symbol: '●●', label: { en: 'Multi Ball', da: 'Multi Bold' } },
  shrinkPaddle: { color: '#FFD84E', symbol: '━', label: { en: 'Shrink Paddle', da: 'Formindsk Bat' } },
  enlargePaddle: { color: '#C94EFF', symbol: '━━', label: { en: 'Enlarge Paddle', da: 'Forstør Bat' } }
}

interface User {
  email: string
  fullName: string
  role: string
  phone?: string
}

interface BrickBreakProps {
  userEmail?: string
}

export function BrickBreak({ userEmail = 'guest@example.com' }: BrickBreakProps = {}) {
  const { language } = useLanguage()
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [gameState, setGameState] = useState<GameState>('menu')
  const [score, setScore] = useState(0)
  const [level, setLevel] = useState(1)
  const [lives, setLives] = useState(3)
  const [bricks, setBricks] = useState<Brick[]>([])
  const [balls, setBalls] = useState<Ball[]>([])
  const [paddle, setPaddle] = useState<Paddle>({
    x: GAME_WIDTH / 2 - INITIAL_PADDLE_WIDTH / 2,
    y: GAME_HEIGHT - 40,
    width: INITIAL_PADDLE_WIDTH,
    height: PADDLE_HEIGHT
  })
  const [users, setUsers] = useState<User[]>([])
  const [ballAttachedToPaddle, setBallAttachedToPaddle] = useState(true)
  const [powerUps, setPowerUps] = useState<PowerUp[]>([])
  const [hasShield, setHasShield] = useState(false)
  const [isFireball, setIsFireball] = useState(false)
  const [fireballTimeLeft, setFireballTimeLeft] = useState(0)
  const [globalLeaderboard, setGlobalLeaderboard] = useKV<GlobalLeaderboard>('brickbreak-global-leaderboard', {
    easy: [],
    medium: [],
    hard: [],
    expert: []
  })

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameLoopRef = useRef<number>()
  const mouseXRef = useRef<number>(GAME_WIDTH / 2)
  const ballsRef = useRef<Ball[]>([])
  const bricksRef = useRef<Brick[]>([])
  const powerUpsRef = useRef<PowerUp[]>([])
  const paddleRef = useRef<Paddle>({
    x: GAME_WIDTH / 2 - INITIAL_PADDLE_WIDTH / 2,
    y: GAME_HEIGHT - 40,
    width: INITIAL_PADDLE_WIDTH,
    height: PADDLE_HEIGHT
  })
  const livesRef = useRef<number>(3)
  const scoreRef = useRef<number>(0)
  const ballAttachedRef = useRef<boolean>(true)
  const isFireballRef = useRef<boolean>(false)
  const hasShieldRef = useRef<boolean>(false)

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

  const getTopScoreForDifficulty = (diff: Difficulty): number => {
    const board = globalLeaderboard?.[diff] || []
    return board.length > 0 ? board[0].score : 0
  }

  const getUserRankForDifficulty = (diff: Difficulty): number | null => {
    const board = globalLeaderboard?.[diff] || []
    const index = board.findIndex(entry => entry.email === userEmail)
    return index !== -1 ? index + 1 : null
  }

  const createBricks = (levelNum: number) => {
    const newBricks: Brick[] = []
    const brickWidth = (GAME_WIDTH - BRICK_OFFSET_LEFT * 2 - BRICK_PADDING * (BRICK_COLS - 1)) / BRICK_COLS
    const brickHeight = 25

    const rows = Math.min(BRICK_ROWS + Math.floor(levelNum / 3), 10)

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < BRICK_COLS; col++) {
        const colorData = BRICK_COLORS[row % BRICK_COLORS.length]
        const maxHits = colorData.hits + Math.floor(levelNum / 5)

        newBricks.push({
          id: row * BRICK_COLS + col,
          x: BRICK_OFFSET_LEFT + col * (brickWidth + BRICK_PADDING),
          y: BRICK_OFFSET_TOP + row * (brickHeight + BRICK_PADDING),
          width: brickWidth,
          height: brickHeight,
          color: colorData.color,
          hits: 0,
          maxHits: maxHits,
          points: colorData.points * Math.floor(1 + levelNum * 0.5)
        })
      }
    }

    return newBricks
  }

  const startGame = () => {
    const newPaddle = {
      x: GAME_WIDTH / 2 - INITIAL_PADDLE_WIDTH / 2,
      y: GAME_HEIGHT - 40,
      width: INITIAL_PADDLE_WIDTH,
      height: PADDLE_HEIGHT
    }
    
    scoreRef.current = 0
    livesRef.current = 3
    paddleRef.current = newPaddle
    ballAttachedRef.current = true
    powerUpsRef.current = []
    
    const newBalls = [{
      x: newPaddle.x + newPaddle.width / 2,
      y: newPaddle.y - BALL_RADIUS,
      dx: 0,
      dy: 0,
      radius: BALL_RADIUS
    }]
    const newBricks = createBricks(1)
    
    ballsRef.current = newBalls
    bricksRef.current = newBricks
    
    setBallAttachedToPaddle(true)
    setBalls(newBalls)
    setBricks(newBricks)
    setPaddle(newPaddle)
    setScore(0)
    setLevel(1)
    setLives(3)
    setPowerUps([])
    setHasShield(false)
    setIsFireball(false)
    setFireballTimeLeft(0)
    isFireballRef.current = false
    hasShieldRef.current = false
    setGameState('waitingToLaunch')
  }

  const nextLevel = () => {
    const newLevel = level + 1
    const newPaddle = {
      ...paddleRef.current,
      x: GAME_WIDTH / 2 - INITIAL_PADDLE_WIDTH / 2,
      width: INITIAL_PADDLE_WIDTH
    }
    
    paddleRef.current = newPaddle
    ballAttachedRef.current = true
    powerUpsRef.current = []
    
    const newBalls = [{
      x: newPaddle.x + newPaddle.width / 2,
      y: newPaddle.y - BALL_RADIUS,
      dx: 0,
      dy: 0,
      radius: BALL_RADIUS
    }]
    const newBricks = createBricks(newLevel)
    
    ballsRef.current = newBalls
    bricksRef.current = newBricks
    
    setBallAttachedToPaddle(true)
    setBalls(newBalls)
    setBricks(newBricks)
    setPaddle(newPaddle)
    setLevel(newLevel)
    setPowerUps([])
    setGameState('waitingToLaunch')
  }

  const saveScore = async () => {
    if (!userEmail) {
      console.error('No user email for saving score')
      await trackGamePlay(difficulty)
      return
    }

    try {
      const currentLeaderboard = await window.spark.kv.get<GlobalLeaderboard>('brickbreak-global-leaderboard') || {
        easy: [],
        medium: [],
        hard: [],
        expert: []
      }
      
      const difficultyBoard = [...(currentLeaderboard[difficulty] || [])]
      
      const existingEntryIndex = difficultyBoard.findIndex(entry => entry.email === userEmail)
      
      if (existingEntryIndex !== -1) {
        if (score > difficultyBoard[existingEntryIndex].score) {
          difficultyBoard[existingEntryIndex] = {
            email: userEmail,
            score: score,
            level: level,
            timestamp: Date.now()
          }
        }
      } else {
        difficultyBoard.push({
          email: userEmail,
          score: score,
          level: level,
          timestamp: Date.now()
        })
      }
      
      difficultyBoard.sort((a, b) => b.score - a.score)
      
      const updatedLeaderboard = {
        ...currentLeaderboard,
        [difficulty]: difficultyBoard.slice(0, 10)
      }
      
      await window.spark.kv.set('brickbreak-global-leaderboard', updatedLeaderboard)
      
      setGlobalLeaderboard(updatedLeaderboard)
    } catch (error) {
      console.error('Error saving score to leaderboard:', error)
    }
    
    await trackGamePlay(difficulty)
  }

  const trackGamePlay = async (gameDifficulty: Difficulty) => {
    if (!userEmail) return

    try {
      const gameStats = await window.spark.kv.get<Record<string, Record<Difficulty, number>>>('brickbreak-play-counts') || {}
      
      if (!gameStats[userEmail]) {
        gameStats[userEmail] = { easy: 0, medium: 0, hard: 0, expert: 0 }
      }
      
      gameStats[userEmail][gameDifficulty] = (gameStats[userEmail][gameDifficulty] || 0) + 1
      
      await window.spark.kv.set('brickbreak-play-counts', gameStats)
    } catch (error) {
      console.error('Error tracking game play:', error)
    }
  }

  const launchBall = () => {
    if (!ballAttachedRef.current) return
    
    const baseSpeed = DIFFICULTY_SETTINGS[difficulty].ballSpeed
    const currentBall = ballsRef.current[0]
    if (!currentBall) return
    
    const launchedBall = {
      ...currentBall,
      dx: (Math.random() > 0.5 ? 1 : -1) * baseSpeed * 0.7,
      dy: -baseSpeed
    }
    
    ballsRef.current = [launchedBall]
    setBalls([launchedBall])
    setBallAttachedToPaddle(false)
    ballAttachedRef.current = false
    setGameState('playing')
  }

  const applyPowerUp = (type: PowerUp['type']) => {
    const message = POWERUP_CONFIG[type].label[language]
    
    switch (type) {
      case 'extraLife':
        if (livesRef.current < 3) {
          livesRef.current = livesRef.current + 1
          setLives(livesRef.current)
          toast.success(message)
        } else {
          const noEffectMsg = language === 'da' ? 'Max 3 liv!' : 'Max 3 lives!'
          toast.info(noEffectMsg)
        }
        break
        
      case 'shield':
        setHasShield(true)
        hasShieldRef.current = true
        toast.success(message)
        break
        
      case 'fireball':
        setIsFireball(true)
        isFireballRef.current = true
        setFireballTimeLeft(10)
        toast.success(message)
        
        const fireballInterval = setInterval(() => {
          setFireballTimeLeft(prev => {
            if (prev <= 1) {
              clearInterval(fireballInterval)
              setIsFireball(false)
              isFireballRef.current = false
              return 0
            }
            return prev - 1
          })
        }, 1000)
        break
        
      case 'multiBall':
        const currentBalls = ballsRef.current
        if (currentBalls.length > 0) {
          const newBalls: Ball[] = []
          currentBalls.forEach(ball => {
            const angle1 = Math.atan2(ball.dy, ball.dx) + 0.3
            const angle2 = Math.atan2(ball.dy, ball.dx) - 0.3
            const speed = Math.sqrt(ball.dx * ball.dx + ball.dy * ball.dy)
            
            newBalls.push({
              ...ball,
              dx: Math.cos(angle1) * speed,
              dy: Math.sin(angle1) * speed
            })
            newBalls.push({
              ...ball,
              dx: Math.cos(angle2) * speed,
              dy: Math.sin(angle2) * speed
            })
          })
          ballsRef.current = [...currentBalls, ...newBalls]
          setBalls([...currentBalls, ...newBalls])
          toast.success(message)
        }
        break
        
      case 'shrinkPaddle':
        const newSmallPaddle = {
          ...paddleRef.current,
          width: Math.max(INITIAL_PADDLE_WIDTH * 0.6, 60)
        }
        paddleRef.current = newSmallPaddle
        setPaddle(newSmallPaddle)
        toast.success(message)
        setTimeout(() => {
          const resetPaddle = {
            ...paddleRef.current,
            width: INITIAL_PADDLE_WIDTH
          }
          paddleRef.current = resetPaddle
          setPaddle(resetPaddle)
        }, 10000)
        break
        
      case 'enlargePaddle':
        const newWidePaddle = {
          ...paddleRef.current,
          width: Math.min(INITIAL_PADDLE_WIDTH * 1.5, 200)
        }
        paddleRef.current = newWidePaddle
        setPaddle(newWidePaddle)
        toast.success(message)
        setTimeout(() => {
          const resetPaddle = {
            ...paddleRef.current,
            width: INITIAL_PADDLE_WIDTH
          }
          paddleRef.current = resetPaddle
          setPaddle(resetPaddle)
        }, 10000)
        break
    }
  }

  const gameLoop = () => {
    const currentBalls = ballsRef.current
    const currentBricks = bricksRef.current
    const currentPaddle = paddleRef.current

    if (ballAttachedRef.current) {
      const attachedBall = {
        x: currentPaddle.x + currentPaddle.width / 2,
        y: currentPaddle.y - BALL_RADIUS,
        dx: 0,
        dy: 0,
        radius: BALL_RADIUS
      }
      ballsRef.current = [attachedBall]
      setBalls([attachedBall])
      return
    }

    if (currentBalls.length === 0 && livesRef.current <= 1) {
      return
    }

    const newBalls = currentBalls.map(ball => {
      let newBall = { ...ball }
      newBall.x += newBall.dx
      newBall.y += newBall.dy

      if (newBall.x - newBall.radius < 0 || newBall.x + newBall.radius > GAME_WIDTH) {
        newBall.dx = -newBall.dx
      }

      if (newBall.y - newBall.radius < 0) {
        newBall.dy = -newBall.dy
      }

      if (newBall.x <= DEFLECTOR_SIZE && newBall.y <= DEFLECTOR_SIZE) {
        if (newBall.x + newBall.y <= DEFLECTOR_SIZE) {
          const speed = Math.sqrt(newBall.dx * newBall.dx + newBall.dy * newBall.dy)
          
          const nx = 1 / Math.sqrt(2)
          const ny = 1 / Math.sqrt(2)
          
          const dot = newBall.dx * nx + newBall.dy * ny
          newBall.dx = newBall.dx - 2 * dot * nx
          newBall.dy = newBall.dy - 2 * dot * ny
          
          while (newBall.x + newBall.y <= DEFLECTOR_SIZE + newBall.radius) {
            newBall.x += 1
            newBall.y += 1
          }
        }
      }

      if (newBall.x >= GAME_WIDTH - DEFLECTOR_SIZE && newBall.y <= DEFLECTOR_SIZE) {
        if ((GAME_WIDTH - newBall.x) + newBall.y <= DEFLECTOR_SIZE) {
          const speed = Math.sqrt(newBall.dx * newBall.dx + newBall.dy * newBall.dy)
          
          const nx = -1 / Math.sqrt(2)
          const ny = 1 / Math.sqrt(2)
          
          const dot = newBall.dx * nx + newBall.dy * ny
          newBall.dx = newBall.dx - 2 * dot * nx
          newBall.dy = newBall.dy - 2 * dot * ny
          
          while ((GAME_WIDTH - newBall.x) + newBall.y <= DEFLECTOR_SIZE + newBall.radius) {
            newBall.x -= 1
            newBall.y += 1
          }
        }
      }

      if (
        newBall.y + newBall.radius > currentPaddle.y &&
        newBall.y - newBall.radius < currentPaddle.y + currentPaddle.height &&
        newBall.x > currentPaddle.x &&
        newBall.x < currentPaddle.x + currentPaddle.width
      ) {
        const hitPos = (newBall.x - currentPaddle.x) / currentPaddle.width
        const angle = (hitPos - 0.5) * Math.PI * 0.6
        const speed = Math.sqrt(newBall.dx * newBall.dx + newBall.dy * newBall.dy)
        newBall.dx = Math.sin(angle) * speed
        newBall.dy = -Math.abs(Math.cos(angle) * speed)
      }

      return newBall
    }).filter(ball => ball.y - ball.radius < GAME_HEIGHT)

    let newBricks = [...currentBricks]
    let scoreIncrease = 0

    const bricksToRemove: number[] = []
    
    newBalls.forEach(ball => {
      newBricks.forEach((brick, index) => {
        if (bricksToRemove.includes(index)) return
        
        const collision = 
          ball.x + ball.radius > brick.x &&
          ball.x - ball.radius < brick.x + brick.width &&
          ball.y + ball.radius > brick.y &&
          ball.y - ball.radius < brick.y + brick.height

        if (collision) {
          if (isFireballRef.current) {
            scoreIncrease += brick.points
            
            if (Math.random() < POWERUP_SPAWN_CHANCE) {
              const powerUpType = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)]
              const newPowerUp: PowerUp = {
                id: Date.now() + Math.random(),
                x: brick.x + brick.width / 2 - POWERUP_SIZE / 2,
                y: brick.y,
                width: POWERUP_SIZE,
                height: POWERUP_SIZE,
                type: powerUpType,
                dy: POWERUP_FALL_SPEED
              }
              powerUpsRef.current = [...powerUpsRef.current, newPowerUp]
              setPowerUps(prev => [...prev, newPowerUp])
            }
            
            bricksToRemove.push(index)
          } else {
            const overlapLeft = ball.x + ball.radius - brick.x
            const overlapRight = brick.x + brick.width - (ball.x - ball.radius)
            const overlapTop = ball.y + ball.radius - brick.y
            const overlapBottom = brick.y + brick.height - (ball.y - ball.radius)

            const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom)

            if (minOverlap === overlapTop || minOverlap === overlapBottom) {
              ball.dy = -ball.dy
            } else {
              ball.dx = -ball.dx
            }

            brick.hits++

            if (brick.hits >= brick.maxHits) {
              scoreIncrease += brick.points
              
              if (Math.random() < POWERUP_SPAWN_CHANCE) {
                const powerUpType = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)]
                const newPowerUp: PowerUp = {
                  id: Date.now() + Math.random(),
                  x: brick.x + brick.width / 2 - POWERUP_SIZE / 2,
                  y: brick.y,
                  width: POWERUP_SIZE,
                  height: POWERUP_SIZE,
                  type: powerUpType,
                  dy: POWERUP_FALL_SPEED
                }
                powerUpsRef.current = [...powerUpsRef.current, newPowerUp]
                setPowerUps(prev => [...prev, newPowerUp])
              }
              
              bricksToRemove.push(index)
            }
          }
        }
      })
    })
    
    newBricks = newBricks.filter((_, index) => !bricksToRemove.includes(index))

    if (scoreIncrease > 0) {
      scoreRef.current += scoreIncrease
      setScore(scoreRef.current)
    }

    const currentPowerUps = powerUpsRef.current
    const updatedPowerUps = currentPowerUps.map(powerUp => ({
      ...powerUp,
      y: powerUp.y + powerUp.dy
    })).filter(powerUp => {
      if (powerUp.y > GAME_HEIGHT) {
        return false
      }
      
      if (
        powerUp.y + powerUp.height > currentPaddle.y &&
        powerUp.y < currentPaddle.y + currentPaddle.height &&
        powerUp.x + powerUp.width > currentPaddle.x &&
        powerUp.x < currentPaddle.x + currentPaddle.width
      ) {
        applyPowerUp(powerUp.type)
        return false
      }
      
      return true
    })
    
    powerUpsRef.current = updatedPowerUps
    setPowerUps(updatedPowerUps)

    ballsRef.current = newBalls
    bricksRef.current = newBricks
    
    setBalls(newBalls)
    setBricks(newBricks)

    if (newBalls.length === 0 && currentBalls.length > 0) {
      if (hasShieldRef.current) {
        setHasShield(false)
        hasShieldRef.current = false
        const shieldMsg = language === 'da' ? 'Skjold brugt!' : 'Shield used!'
        toast.info(shieldMsg)
        
        const currentPaddle = paddleRef.current
        const newBall = {
          x: currentPaddle.x + currentPaddle.width / 2,
          y: currentPaddle.y - BALL_RADIUS,
          dx: 0,
          dy: 0,
          radius: BALL_RADIUS
        }
        ballsRef.current = [newBall]
        setBalls([newBall])
        setBallAttachedToPaddle(true)
        ballAttachedRef.current = true
        setGameState('waitingToLaunch')
      } else {
        livesRef.current -= 1
        setLives(livesRef.current)
        
        if (livesRef.current <= 0) {
          setGameState('gameOver')
          saveScore()
        } else {
          const currentPaddle = paddleRef.current
          const newBall = {
            x: currentPaddle.x + currentPaddle.width / 2,
            y: currentPaddle.y - BALL_RADIUS,
            dx: 0,
            dy: 0,
            radius: BALL_RADIUS
          }
          ballsRef.current = [newBall]
          setBalls([newBall])
          setBallAttachedToPaddle(true)
          ballAttachedRef.current = true
          setGameState('waitingToLaunch')
        }
      }
    }

    if (newBricks.length === 0) {
      setGameState('levelComplete')
    }
  }

  const draw = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT)

    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)'
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT)

    ctx.save()
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(DEFLECTOR_SIZE, 0)
    ctx.lineTo(0, DEFLECTOR_SIZE)
    ctx.closePath()
    ctx.fillStyle = 'rgba(255, 107, 157, 0.4)'
    ctx.fill()
    ctx.strokeStyle = 'rgba(255, 107, 157, 0.8)'
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.restore()

    ctx.save()
    ctx.beginPath()
    ctx.moveTo(GAME_WIDTH, 0)
    ctx.lineTo(GAME_WIDTH - DEFLECTOR_SIZE, 0)
    ctx.lineTo(GAME_WIDTH, DEFLECTOR_SIZE)
    ctx.closePath()
    ctx.fillStyle = 'rgba(78, 207, 255, 0.4)'
    ctx.fill()
    ctx.strokeStyle = 'rgba(78, 207, 255, 0.8)'
    ctx.lineWidth = 2
    ctx.stroke()
    ctx.restore()

    const currentBricks = bricksRef.current
    const currentBalls = ballsRef.current
    const currentPaddle = paddleRef.current

    currentBricks.forEach(brick => {
      const opacity = 1 - (brick.hits / brick.maxHits) * 0.5
      ctx.fillStyle = brick.color
      ctx.globalAlpha = opacity
      ctx.fillRect(brick.x, brick.y, brick.width, brick.height)
      
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
      ctx.lineWidth = 2
      ctx.strokeRect(brick.x, brick.y, brick.width, brick.height)
      
      ctx.shadowBlur = 10
      ctx.shadowColor = brick.color
      ctx.fillRect(brick.x, brick.y, brick.width, brick.height)
      ctx.shadowBlur = 0
      ctx.globalAlpha = 1
    })

    currentBalls.forEach(ball => {
      ctx.beginPath()
      ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2)
      if (isFireballRef.current) {
        const fireGradient = ctx.createRadialGradient(ball.x, ball.y, 0, ball.x, ball.y, ball.radius * 3)
        fireGradient.addColorStop(0, '#FFFF00')
        fireGradient.addColorStop(0.3, '#FF6B00')
        fireGradient.addColorStop(0.6, '#FF0000')
        fireGradient.addColorStop(1, 'rgba(255, 0, 0, 0)')
        
        ctx.fillStyle = fireGradient
        ctx.shadowBlur = 30
        ctx.shadowColor = '#FF0000'
        ctx.beginPath()
        ctx.arc(ball.x, ball.y, ball.radius * 3, 0, Math.PI * 2)
        ctx.fill()
        
        ctx.fillStyle = '#FF4400'
        ctx.shadowBlur = 25
        ctx.shadowColor = '#FF0000'
        ctx.beginPath()
        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2)
        ctx.fill()
        
        for (let i = 0; i < 3; i++) {
          ctx.fillStyle = `rgba(255, ${100 - i * 30}, 0, ${0.6 - i * 0.2})`
          ctx.shadowBlur = 15 - i * 5
          ctx.beginPath()
          ctx.arc(ball.x - ball.dx * i * 0.5, ball.y - ball.dy * i * 0.5, ball.radius * (1 - i * 0.2), 0, Math.PI * 2)
          ctx.fill()
        }
      } else {
        ctx.fillStyle = '#FFFFFF'
        ctx.shadowBlur = 15
        ctx.shadowColor = '#4ECFFF'
        ctx.fill()
      }
      ctx.shadowBlur = 0
    })

    const gradient = ctx.createLinearGradient(currentPaddle.x, 0, currentPaddle.x + currentPaddle.width, 0)
    gradient.addColorStop(0, '#FF6B9D')
    gradient.addColorStop(0.5, '#C94EFF')
    gradient.addColorStop(1, '#4ECFFF')
    ctx.fillStyle = gradient
    ctx.fillRect(currentPaddle.x, currentPaddle.y, currentPaddle.width, currentPaddle.height)
    ctx.shadowBlur = 10
    ctx.shadowColor = '#C94EFF'
    ctx.fillRect(currentPaddle.x, currentPaddle.y, currentPaddle.width, currentPaddle.height)
    ctx.shadowBlur = 0

    const currentPowerUps = powerUpsRef.current
    currentPowerUps.forEach(powerUp => {
      const config = POWERUP_CONFIG[powerUp.type]
      ctx.fillStyle = config.color
      ctx.fillRect(powerUp.x, powerUp.y, powerUp.width, powerUp.height)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
      ctx.lineWidth = 2
      ctx.strokeRect(powerUp.x, powerUp.y, powerUp.width, powerUp.height)
      ctx.shadowBlur = 8
      ctx.shadowColor = config.color
      ctx.fillRect(powerUp.x, powerUp.y, powerUp.width, powerUp.height)
      ctx.shadowBlur = 0
      
      ctx.fillStyle = '#FFFFFF'
      ctx.font = 'bold 18px Quicksand, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(config.symbol, powerUp.x + powerUp.width / 2, powerUp.y + powerUp.height / 2)
    })

    if (ballAttachedRef.current) {
      ctx.save()
      ctx.font = 'bold 24px Quicksand, sans-serif'
      ctx.fillStyle = '#FFFFFF'
      ctx.textAlign = 'center'
      ctx.shadowBlur = 10
      ctx.shadowColor = '#4ECFFF'
      const message = language === 'da' ? 'Klik eller tryk på mellemrum for at skyde' : 'Click or Press Space to Launch'
      ctx.fillText(message, GAME_WIDTH / 2, GAME_HEIGHT / 2)
      ctx.shadowBlur = 0
      ctx.restore()
    }
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (gameState !== 'playing' && gameState !== 'waitingToLaunch') return
      
      const canvas = canvasRef.current
      if (!canvas) return

      const rect = canvas.getBoundingClientRect()
      const scaleX = GAME_WIDTH / rect.width
      const mouseX = (e.clientX - rect.left) * scaleX
      mouseXRef.current = mouseX

      const currentPaddle = paddleRef.current
      const newX = Math.max(0, Math.min(GAME_WIDTH - currentPaddle.width, mouseX - currentPaddle.width / 2))
      
      paddleRef.current = { ...currentPaddle, x: newX }
      setPaddle({ ...currentPaddle, x: newX })
    }

    const handleClick = (e: MouseEvent) => {
      if (gameState === 'waitingToLaunch') {
        const canvas = canvasRef.current
        if (!canvas) return
        
        const rect = canvas.getBoundingClientRect()
        const isClickOnCanvas = 
          e.clientX >= rect.left && 
          e.clientX <= rect.right && 
          e.clientY >= rect.top && 
          e.clientY <= rect.bottom
        
        if (isClickOnCanvas) {
          launchBall()
        }
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('click', handleClick)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('click', handleClick)
    }
  }, [gameState])

  useEffect(() => {
    if (gameState !== 'playing' && gameState !== 'waitingToLaunch') return

    const pressedKeys = new Set<string>()
    const PADDLE_SPEED = 8

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' && gameState === 'waitingToLaunch') {
        e.preventDefault()
        launchBall()
        return
      }
      
      if (['ArrowLeft', 'ArrowRight', 'a', 'A', 'd', 'D'].includes(e.key)) {
        e.preventDefault()
        pressedKeys.add(e.key.toLowerCase())
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      pressedKeys.delete(e.key.toLowerCase())
    }

    const updatePaddleFromKeys = () => {
      if (gameState !== 'playing' && gameState !== 'waitingToLaunch') return

      const currentPaddle = paddleRef.current
      let newX = currentPaddle.x

      if (pressedKeys.has('arrowleft') || pressedKeys.has('a')) {
        newX -= PADDLE_SPEED
      }
      if (pressedKeys.has('arrowright') || pressedKeys.has('d')) {
        newX += PADDLE_SPEED
      }

      newX = Math.max(0, Math.min(GAME_WIDTH - currentPaddle.width, newX))

      if (newX !== currentPaddle.x) {
        paddleRef.current = { ...currentPaddle, x: newX }
        setPaddle({ ...currentPaddle, x: newX })
      }
    }

    const keyboardInterval = setInterval(updatePaddleFromKeys, 16)

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      clearInterval(keyboardInterval)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [gameState])

  useEffect(() => {
    if (gameState !== 'playing' && gameState !== 'waitingToLaunch') return

    let animationFrameId: number

    const combinedLoop = () => {
      if (gameState === 'playing' || gameState === 'waitingToLaunch') {
        gameLoop()
        draw()
        animationFrameId = requestAnimationFrame(combinedLoop)
      }
    }

    animationFrameId = requestAnimationFrame(combinedLoop)

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
      }
    }
  }, [gameState])

  if (gameState === 'menu') {
    return (
      <div className="space-y-6">
        <Card className="p-6 bg-gradient-to-br from-card via-primary/5 to-accent/5 border-2">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-gradient-to-br from-primary to-accent shadow-lg">
                <Cube size={32} weight="duotone" className="text-primary-foreground" />
              </div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Brick Break
                </h2>
                <p className="text-sm text-muted-foreground">
                  {language === 'da' 
                    ? 'Ødelæg alle brikker og klar så mange levels som muligt!' 
                    : 'Destroy all bricks and clear as many levels as possible!'}
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
                  ? 'Brug musen eller tasterne (pil venstre/højre eller A/D) til at styre paddlen. Ødelæg alle brikker!'
                  : 'Use your mouse or keys (arrow left/right or A/D) to control the paddle. Destroy all bricks!'}
              </p>
              <Button onClick={startGame} size="lg" className="px-8 bg-gradient-to-r from-primary to-accent hover:opacity-90 gap-2">
                <Play size={20} weight="fill" />
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
                                <div className="text-xs text-muted-foreground">
                                  {language === 'da' ? 'Level' : 'Level'} {entry.level}
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
                                <div className="text-xs text-muted-foreground">
                                  {language === 'da' ? 'Level' : 'Level'} {userEntry.level}
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

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            {language === 'da' ? 'Sådan Spiller Du' : 'How to Play'}
          </h3>
          <div className="text-sm space-y-2">
            <div>
              <h4 className="font-semibold mb-2">{language === 'da' ? 'Kontroller' : 'Controls'}</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• {language === 'da' ? 'Bevæg musen eller brug piletasterne/A/D for at styre paddle' : 'Move mouse or use arrow keys/A/D to control paddle'}</li>
                <li>• {language === 'da' ? 'Ødelæg alle brikker for at klare niveauet' : 'Destroy all bricks to clear the level'}</li>
                <li>• {language === 'da' ? 'Undgå at miste bolden' : 'Avoid losing the ball'}</li>
                <li>• {language === 'da' ? 'Du har 3 liv per spil' : 'You have 3 lives per game'}</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  if (gameState === 'levelComplete') {
    return (
      <Card className="p-8 text-center">
        <h2 className="text-3xl font-bold mb-4 text-green-500">
          {language === 'da' ? 'Level Fuldført!' : 'Level Complete!'}
        </h2>
        <div className="text-5xl font-bold mb-6">{score}</div>
        <div className="text-xl mb-6">
          {language === 'da' ? 'Level' : 'Level'} {level}
        </div>
        <Button onClick={nextLevel} size="lg">
          {language === 'da' ? 'Næste Level' : 'Next Level'}
        </Button>
      </Card>
    )
  }

  if (gameState === 'gameOver') {
    return (
      <Card className="p-8 text-center">
        <h2 className="text-3xl font-bold mb-4 text-red-500">
          {language === 'da' ? 'Spil Slut!' : 'Game Over!'}
        </h2>
        <div className="text-5xl font-bold mb-2">{score}</div>
        <div className="text-xl text-muted-foreground mb-6">
          {language === 'da' ? 'Level nået:' : 'Level reached:'} {level}
        </div>
        <div className="flex gap-4 justify-center">
          <Button onClick={startGame} size="lg">
            {language === 'da' ? 'Spil Igen' : 'Play Again'}
          </Button>
          <Button onClick={() => setGameState('menu')} variant="outline" size="lg">
            {language === 'da' ? 'Menu' : 'Menu'}
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex gap-6 text-lg font-semibold">
          <div>{language === 'da' ? 'Score:' : 'Score:'} {score}</div>
          <div>{language === 'da' ? 'Level:' : 'Level:'} {level}</div>
          <div className="flex items-center gap-2">
            {language === 'da' ? 'Liv:' : 'Lives:'}
            {Array.from({ length: lives }).map((_, i) => (
              <span key={i} className="text-red-500">♥</span>
            ))}
          </div>
          {hasShield && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-cyan-500/20 border border-cyan-500/50 text-cyan-500">
              🛡 {language === 'da' ? 'Skjold' : 'Shield'}
            </div>
          )}
          {isFireball && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-gradient-to-r from-red-500/20 to-orange-500/20 border-2 border-red-500/50 text-red-500 animate-pulse">
              <span className="text-xl">🔥</span>
              <span className="font-bold">{language === 'da' ? 'ILDKUGLE AKTIV' : 'FIREBALL ACTIVE'}</span>
              <span className="ml-2 px-2 py-0.5 rounded bg-red-500 text-white text-sm font-bold">{fireballTimeLeft}s</span>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setGameState('menu')} variant="outline" size="sm">
            {language === 'da' ? 'Menu' : 'Menu'}
          </Button>
        </div>
      </div>

      <Card className="p-4 flex justify-center">
        <canvas
          ref={canvasRef}
          width={GAME_WIDTH}
          height={GAME_HEIGHT}
          className="border-2 border-border rounded-lg bg-gradient-to-b from-gray-900 to-gray-800"
          style={{ maxWidth: '100%', height: 'auto' }}
        />
      </Card>
    </div>
  )
}
