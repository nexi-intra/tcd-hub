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
  type: 'multi-ball' | 'large-paddle' | 'small-paddle' | 'slow-motion' | 'extra-life'
  x: number
  y: number
  speed: number
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
type GameState = 'menu' | 'playing' | 'paused' | 'levelComplete' | 'gameOver'

const DIFFICULTY_SETTINGS = {
  easy: {
    ballSpeed: 5,
    label: { en: 'Easy', da: 'Let' },
    description: { en: 'Slow ball', da: 'Langsom bold' },
    icon: Speedometer,
    color: 'text-green-500',
    bgGradient: 'from-green-500/20 to-green-600/20',
    borderColor: 'border-green-500/30',
    glowColor: 'shadow-green-500/20',
  },
  medium: {
    ballSpeed: 7,
    label: { en: 'Medium', da: 'Mellem' },
    description: { en: 'Medium speed', da: 'Mellem hastighed' },
    icon: Lightning,
    color: 'text-yellow-500',
    bgGradient: 'from-yellow-500/20 to-yellow-600/20',
    borderColor: 'border-yellow-500/30',
    glowColor: 'shadow-yellow-500/20',
  },
  hard: {
    ballSpeed: 9,
    label: { en: 'Hard', da: 'Svær' },
    description: { en: 'Fast ball', da: 'Hurtig bold' },
    icon: Fire,
    color: 'text-red-500',
    bgGradient: 'from-red-500/20 to-red-600/20',
    borderColor: 'border-red-500/30',
    glowColor: 'shadow-red-500/20',
  },
  expert: {
    ballSpeed: 11,
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
const POWER_UP_SIZE = 25
const POWER_UP_SPEED = 2

const BRICK_COLORS = [
  { color: '#FF6B9D', hits: 3, points: 30 },
  { color: '#C94EFF', hits: 3, points: 30 },
  { color: '#4ECFFF', hits: 2, points: 20 },
  { color: '#4EFF8B', hits: 2, points: 20 },
  { color: '#FFD84E', hits: 1, points: 10 },
  { color: '#FF8B4E', hits: 1, points: 10 },
]

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
  const [powerUps, setPowerUps] = useState<PowerUp[]>([])
  const [activePowerUps, setActivePowerUps] = useState<{ type: string; endTime: number }[]>([])
  const [particles, setParticles] = useState<{ x: number; y: number; color: string; id: number }[]>([])
  const [globalLeaderboard, setGlobalLeaderboard] = useKV<GlobalLeaderboard>('brickbreak-global-leaderboard', {
    easy: [],
    medium: [],
    hard: [],
    expert: []
  })
  const [showLeaderboard, setShowLeaderboard] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameLoopRef = useRef<number>()
  const mouseXRef = useRef<number>(GAME_WIDTH / 2)
  const powerUpTimersRef = useRef<{ type: string; endTime: number }[]>([])
  const slowMotionRef = useRef<boolean>(false)
  const ballsRef = useRef<Ball[]>([])
  const bricksRef = useRef<Brick[]>([])
  const paddleRef = useRef<Paddle>({
    x: GAME_WIDTH / 2 - INITIAL_PADDLE_WIDTH / 2,
    y: GAME_HEIGHT - 40,
    width: INITIAL_PADDLE_WIDTH,
    height: PADDLE_HEIGHT
  })
  const powerUpsRef = useRef<PowerUp[]>([])
  const livesRef = useRef<number>(3)
  const scoreRef = useRef<number>(0)

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

  const resetBall = () => {
    const baseSpeed = DIFFICULTY_SETTINGS[difficulty].ballSpeed
    return {
      x: GAME_WIDTH / 2,
      y: GAME_HEIGHT - 60,
      dx: (Math.random() > 0.5 ? 1 : -1) * baseSpeed * 0.7,
      dy: -baseSpeed,
      radius: BALL_RADIUS
    }
  }

  const startGame = () => {
    const newBricks = createBricks(1)
    const newBalls = [resetBall()]
    const newPaddle = {
      x: GAME_WIDTH / 2 - INITIAL_PADDLE_WIDTH / 2,
      y: GAME_HEIGHT - 40,
      width: INITIAL_PADDLE_WIDTH,
      height: PADDLE_HEIGHT
    }
    
    setScore(0)
    setLevel(1)
    setLives(3)
    setBricks(newBricks)
    setBalls(newBalls)
    setPaddle(newPaddle)
    setPowerUps([])
    setActivePowerUps([])
    powerUpTimersRef.current = []
    slowMotionRef.current = false
    setParticles([])
    
    scoreRef.current = 0
    livesRef.current = 3
    ballsRef.current = newBalls
    bricksRef.current = newBricks
    paddleRef.current = newPaddle
    powerUpsRef.current = []
    
    setGameState('playing')
  }

  const nextLevel = () => {
    const newLevel = level + 1
    const newBricks = createBricks(newLevel)
    const newBalls = [resetBall()]
    const newPaddle = {
      ...paddleRef.current,
      x: GAME_WIDTH / 2 - INITIAL_PADDLE_WIDTH / 2,
      width: INITIAL_PADDLE_WIDTH
    }
    
    setLevel(newLevel)
    setBricks(newBricks)
    setBalls(newBalls)
    setPaddle(newPaddle)
    setPowerUps([])
    setActivePowerUps([])
    powerUpTimersRef.current = []
    slowMotionRef.current = false
    setParticles([])
    
    ballsRef.current = newBalls
    bricksRef.current = newBricks
    paddleRef.current = newPaddle
    powerUpsRef.current = []
    
    setGameState('playing')
  }

  const spawnPowerUp = (x: number, y: number) => {
    if (Math.random() < 0.25) {
      const types: PowerUp['type'][] = ['multi-ball', 'large-paddle', 'small-paddle', 'slow-motion', 'extra-life']
      const type = types[Math.floor(Math.random() * types.length)]
      
      setPowerUps(prev => [...prev, {
        id: Date.now(),
        type,
        x: x,
        y: y,
        speed: POWER_UP_SPEED
      }])
    }
  }

  const activatePowerUp = (type: PowerUp['type']) => {
    const duration = 10000

    switch (type) {
      case 'multi-ball':
        if (ballsRef.current.length > 0) {
          const newBalls = ballsRef.current.map(ball => ({
            ...ball,
            x: ball.x + 10,
            dx: ball.dx * 1.1
          }))
          ballsRef.current = [...ballsRef.current, ...newBalls]
          setBalls(ballsRef.current)
        }
        toast.success(language === 'da' ? 'Multi-bold aktiveret!' : 'Multi-ball activated!')
        break

      case 'large-paddle':
        {
          const newPaddle = { ...paddleRef.current, width: Math.min(paddleRef.current.width * 1.5, 250) }
          paddleRef.current = newPaddle
          setPaddle(newPaddle)
          powerUpTimersRef.current.push({ type: 'large-paddle', endTime: Date.now() + duration })
          setActivePowerUps(prev => [...prev, { type: 'large-paddle', endTime: Date.now() + duration }])
          toast.success(language === 'da' ? 'Stor paddle aktiveret!' : 'Large paddle activated!')
        }
        break

      case 'small-paddle':
        {
          const newPaddle = { ...paddleRef.current, width: Math.max(paddleRef.current.width * 0.7, 60) }
          paddleRef.current = newPaddle
          setPaddle(newPaddle)
          powerUpTimersRef.current.push({ type: 'small-paddle', endTime: Date.now() + duration })
          setActivePowerUps(prev => [...prev, { type: 'small-paddle', endTime: Date.now() + duration }])
          toast.info(language === 'da' ? 'Lille paddle aktiveret!' : 'Small paddle activated!')
        }
        break

      case 'slow-motion':
        slowMotionRef.current = true
        powerUpTimersRef.current.push({ type: 'slow-motion', endTime: Date.now() + duration })
        setActivePowerUps(prev => [...prev, { type: 'slow-motion', endTime: Date.now() + duration }])
        toast.success(language === 'da' ? 'Slow motion aktiveret!' : 'Slow motion activated!')
        break

      case 'extra-life':
        livesRef.current = Math.min(livesRef.current + 1, 3)
        setLives(livesRef.current)
        toast.success(language === 'da' ? 'Ekstra liv!' : 'Extra life!')
        break
    }
  }

  const checkPowerUpExpiration = () => {
    const now = Date.now()
    const expiredPowerUps = powerUpTimersRef.current.filter(p => p.endTime <= now)
    
    expiredPowerUps.forEach(powerUp => {
      if (powerUp.type === 'large-paddle' || powerUp.type === 'small-paddle') {
        const newPaddle = { ...paddleRef.current, width: INITIAL_PADDLE_WIDTH }
        paddleRef.current = newPaddle
        setPaddle(newPaddle)
      } else if (powerUp.type === 'slow-motion') {
        slowMotionRef.current = false
      }
      
      toast.info(language === 'da' ? 'Power-up udløbet' : 'Power-up expired')
    })

    powerUpTimersRef.current = powerUpTimersRef.current.filter(p => p.endTime > now)
    setActivePowerUps(powerUpTimersRef.current)
  }

  const addParticles = (x: number, y: number, color: string) => {
    const newParticles = Array.from({ length: 8 }, (_, i) => ({
      x,
      y,
      color,
      id: Date.now() + i
    }))
    setParticles(prev => [...prev, ...newParticles])
    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)))
    }, 500)
  }

  const saveScore = async () => {
    if (!globalLeaderboard) return

    const newEntry: LeaderboardEntry = {
      email: userEmail,
      score: score,
      level: level,
      timestamp: Date.now()
    }

    const updatedLeaderboard = { ...globalLeaderboard }
    updatedLeaderboard[difficulty] = [...(updatedLeaderboard[difficulty] || []), newEntry]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)

    await setGlobalLeaderboard(updatedLeaderboard)

    const playCounts = await window.spark.kv.get<Record<string, Record<'easy' | 'medium' | 'hard' | 'expert', number>>>('brickbreak-play-counts') || {}
    
    if (!playCounts[userEmail]) {
      playCounts[userEmail] = { easy: 0, medium: 0, hard: 0, expert: 0 }
    }
    
    playCounts[userEmail][difficulty] = (playCounts[userEmail][difficulty] || 0) + 1
    
    await window.spark.kv.set('brickbreak-play-counts', playCounts)
  }

  const gameLoop = () => {
    const speedMultiplier = slowMotionRef.current ? 0.5 : 1

    checkPowerUpExpiration()

    const currentBalls = ballsRef.current
    const currentBricks = bricksRef.current
    const currentPaddle = paddleRef.current
    const currentPowerUps = powerUpsRef.current

    if (currentBalls.length === 0 && livesRef.current <= 1) {
      return
    }

    const newBalls = currentBalls.map(ball => {
      let newBall = { ...ball }
      newBall.x += newBall.dx * speedMultiplier
      newBall.y += newBall.dy * speedMultiplier

      if (newBall.x - newBall.radius < 0 || newBall.x + newBall.radius > GAME_WIDTH) {
        newBall.dx = -newBall.dx
      }

      if (newBall.y - newBall.radius < 0) {
        newBall.dy = -newBall.dy
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

    newBalls.forEach(ball => {
      newBricks = newBricks.filter(brick => {
        const collision = 
          ball.x + ball.radius > brick.x &&
          ball.x - ball.radius < brick.x + brick.width &&
          ball.y + ball.radius > brick.y &&
          ball.y - ball.radius < brick.y + brick.height

        if (collision) {
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
            addParticles(brick.x + brick.width / 2, brick.y + brick.height / 2, brick.color)
            spawnPowerUp(brick.x + brick.width / 2, brick.y + brick.height / 2)
            return false
          }
        }

        return true
      })
    })

    if (scoreIncrease > 0) {
      scoreRef.current += scoreIncrease
      setScore(scoreRef.current)
    }

    const newPowerUps = currentPowerUps.filter(powerUp => {
      powerUp.y += powerUp.speed

      if (
        powerUp.y + POWER_UP_SIZE > currentPaddle.y &&
        powerUp.y < currentPaddle.y + currentPaddle.height &&
        powerUp.x + POWER_UP_SIZE > currentPaddle.x &&
        powerUp.x < currentPaddle.x + currentPaddle.width
      ) {
        activatePowerUp(powerUp.type)
        return false
      }

      return powerUp.y < GAME_HEIGHT
    })

    ballsRef.current = newBalls
    bricksRef.current = newBricks
    powerUpsRef.current = newPowerUps
    
    setBalls(newBalls)
    setBricks(newBricks)
    setPowerUps(newPowerUps)

    if (newBalls.length === 0) {
      livesRef.current -= 1
      setLives(livesRef.current)
      
      if (livesRef.current <= 0) {
        setGameState('gameOver')
        saveScore()
      } else {
        const newBall = resetBall()
        ballsRef.current = [newBall]
        setBalls([newBall])
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

    const currentBricks = bricksRef.current
    const currentBalls = ballsRef.current
    const currentPaddle = paddleRef.current
    const currentPowerUps = powerUpsRef.current

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
      ctx.fillStyle = '#FFFFFF'
      ctx.fill()
      ctx.shadowBlur = 15
      ctx.shadowColor = '#4ECFFF'
      ctx.fill()
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

    currentPowerUps.forEach(powerUp => {
      ctx.fillStyle = getPowerUpColor(powerUp.type)
      ctx.fillRect(powerUp.x, powerUp.y, POWER_UP_SIZE, POWER_UP_SIZE)
      ctx.strokeStyle = '#FFFFFF'
      ctx.lineWidth = 2
      ctx.strokeRect(powerUp.x, powerUp.y, POWER_UP_SIZE, POWER_UP_SIZE)
      
      ctx.fillStyle = '#FFFFFF'
      ctx.font = '14px Arial'
      ctx.textAlign = 'center'
      ctx.fillText(getPowerUpSymbol(powerUp.type), powerUp.x + POWER_UP_SIZE / 2, powerUp.y + POWER_UP_SIZE / 2 + 5)
    })

    particles.forEach(particle => {
      ctx.fillStyle = particle.color
      ctx.globalAlpha = 0.6
      ctx.fillRect(particle.x + Math.random() * 20 - 10, particle.y + Math.random() * 20 - 10, 4, 4)
      ctx.globalAlpha = 1
    })
  }

  const getPowerUpColor = (type: PowerUp['type']) => {
    switch (type) {
      case 'multi-ball': return '#4ECFFF'
      case 'large-paddle': return '#4EFF8B'
      case 'small-paddle': return '#FF8B4E'
      case 'slow-motion': return '#C94EFF'
      case 'extra-life': return '#FF6B9D'
    }
  }

  const getPowerUpSymbol = (type: PowerUp['type']) => {
    switch (type) {
      case 'multi-ball': return '●●'
      case 'large-paddle': return '━━'
      case 'small-paddle': return '─'
      case 'slow-motion': return '◐'
      case 'extra-life': return '♥'
    }
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (gameState !== 'playing') return
      
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

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [gameState])

  useEffect(() => {
    if (gameState !== 'playing') return

    let animationFrameId: number

    const combinedLoop = () => {
      gameLoop()
      draw()
      animationFrameId = requestAnimationFrame(combinedLoop)
    }

    animationFrameId = requestAnimationFrame(combinedLoop)

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
      }
    }
  }, [gameState])

  if (showLeaderboard) {
    const leaderboard = globalLeaderboard?.[difficulty] || []

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Trophy size={32} weight="duotone" className="text-yellow-500" />
            {language === 'da' ? 'Global Topscorer' : 'Global Leaderboard'}
          </h2>
          <Button onClick={() => setShowLeaderboard(false)} variant="outline">
            <X size={20} />
            {language === 'da' ? 'Luk' : 'Close'}
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {(['easy', 'medium', 'hard', 'expert'] as Difficulty[]).map(diff => {
            const setting = DIFFICULTY_SETTINGS[diff]
            const Icon = setting.icon
            return (
              <button
                key={diff}
                onClick={() => setDifficulty(diff)}
                className={`p-4 rounded-xl border-2 transition-all ${
                  difficulty === diff
                    ? `${setting.borderColor} bg-gradient-to-br ${setting.bgGradient} shadow-lg`
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <Icon size={32} className={setting.color} weight="duotone" />
                <div className="mt-2 font-bold">{setting.label[language]}</div>
              </button>
            )
          })}
        </div>

        <Card className="p-6">
          <div className="space-y-2">
            {leaderboard.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {language === 'da' ? 'Ingen scores endnu' : 'No scores yet'}
              </p>
            ) : (
              leaderboard.map((entry, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-4 rounded-lg ${
                    entry.email === userEmail ? 'bg-primary/10 border-2 border-primary' : 'bg-muted/50'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="text-2xl font-bold w-8">
                      {index === 0 && <Crown className="text-yellow-500" size={28} weight="fill" />}
                      {index === 1 && <Medal className="text-gray-400" size={28} weight="fill" />}
                      {index === 2 && <Star className="text-amber-600" size={28} weight="fill" />}
                      {index > 2 && <span className="text-muted-foreground">#{index + 1}</span>}
                    </div>
                    <div>
                      <div className="font-semibold">{entry.email.split('@')[0]}</div>
                      <div className="text-sm text-muted-foreground">
                        {language === 'da' ? 'Level' : 'Level'} {entry.level}
                      </div>
                    </div>
                  </div>
                  <div className="text-xl font-bold">{entry.score}</div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    )
  }

  if (gameState === 'menu') {
    return (
      <div className="space-y-8">
        <Card className="p-8 text-center">
          <div className="mb-6">
            <Cube size={64} weight="duotone" className="mx-auto text-primary mb-4" />
            <h2 className="text-3xl font-bold mb-2">
              {language === 'da' ? 'Brick Break' : 'Brick Break'}
            </h2>
            <p className="text-muted-foreground">
              {language === 'da' 
                ? 'Ødelæg alle brikker og klar så mange levels som muligt!'
                : 'Destroy all bricks and clear as many levels as possible!'}
            </p>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">
                {language === 'da' ? 'Vælg Sværhedsgrad' : 'Select Difficulty'}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {(['easy', 'medium', 'hard', 'expert'] as Difficulty[]).map(diff => {
                  const setting = DIFFICULTY_SETTINGS[diff]
                  const Icon = setting.icon
                  return (
                    <button
                      key={diff}
                      onClick={() => setDifficulty(diff)}
                      className={`p-6 rounded-xl border-2 transition-all hover:scale-105 ${
                        difficulty === diff
                          ? `${setting.borderColor} bg-gradient-to-br ${setting.bgGradient} shadow-lg ${setting.glowColor}`
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <Icon size={40} className={setting.color} weight="duotone" />
                      <div className="mt-3 font-bold text-lg">{setting.label[language]}</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {setting.description[language]}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex gap-4 justify-center flex-wrap">
              <Button onClick={startGame} size="lg" className="gap-2">
                <Play size={20} weight="fill" />
                {language === 'da' ? 'Start Spil' : 'Start Game'}
              </Button>
              <Button onClick={() => setShowLeaderboard(true)} variant="outline" size="lg" className="gap-2">
                <Trophy size={20} weight="duotone" />
                {language === 'da' ? 'Topscorer' : 'Leaderboard'}
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            {language === 'da' ? 'Sådan Spiller Du' : 'How to Play'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-semibold mb-2">{language === 'da' ? 'Kontroller' : 'Controls'}</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• {language === 'da' ? 'Bevæg musen for at styre paddle' : 'Move mouse to control paddle'}</li>
                <li>• {language === 'da' ? 'Undgå at miste bolden' : 'Avoid losing the ball'}</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">{language === 'da' ? 'Power-ups' : 'Power-ups'}</h4>
              <ul className="space-y-1 text-muted-foreground">
                <li>• {language === 'da' ? 'Multi-bold (blå)' : 'Multi-ball (blue)'}</li>
                <li>• {language === 'da' ? 'Stor paddle (grøn)' : 'Large paddle (green)'}</li>
                <li>• {language === 'da' ? 'Lille paddle (orange)' : 'Small paddle (orange)'}</li>
                <li>• {language === 'da' ? 'Slow motion (lilla)' : 'Slow motion (purple)'}</li>
                <li>• {language === 'da' ? 'Ekstra liv (pink)' : 'Extra life (pink)'}</li>
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
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setGameState('menu')} variant="outline" size="sm">
            {language === 'da' ? 'Menu' : 'Menu'}
          </Button>
        </div>
      </div>

      {activePowerUps.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {activePowerUps.map((powerUp, index) => (
            <div key={index} className="px-3 py-1 rounded-full bg-primary/20 text-sm font-semibold">
              {powerUp.type.replace('-', ' ').toUpperCase()}
            </div>
          ))}
        </div>
      )}

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
