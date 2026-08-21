import { useState, useEffect, useRef, useCallback } from 'react'
import { SquaresFour, Trophy, X, Lightning, Speedometer, Fire, Flame, Crown, Medal, Star, ArrowLeft, ArrowRight, ArrowClockwise, ArrowLineDown, CaretDown } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useKV } from '@/hooks/useKV'
import { useLanguage } from '@/contexts/LanguageContext'

type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L'
type Difficulty = 'easy' | 'medium' | 'hard' | 'expert'
type GameState = 'menu' | 'playing' | 'ended'
type Cell = string | null

interface ActivePiece {
  type: PieceType
  rotation: number
  x: number
  y: number
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

const BOARD_COLS = 10
const BOARD_ROWS = 20
const CELL_SIZE = 26
const BOARD_WIDTH = BOARD_COLS * CELL_SIZE
const BOARD_HEIGHT = BOARD_ROWS * CELL_SIZE

const TETROMINOES: Record<PieceType, { color: string; rotations: number[][][] }> = {
  I: {
    color: '#22d3ee',
    rotations: [
      [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
      [[0, 0, 1, 0], [0, 0, 1, 0], [0, 0, 1, 0], [0, 0, 1, 0]],
      [[0, 0, 0, 0], [0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0]],
      [[0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0]],
    ],
  },
  O: {
    color: '#facc15',
    rotations: [
      [[0, 0, 0, 0], [0, 1, 1, 0], [0, 1, 1, 0], [0, 0, 0, 0]],
      [[0, 0, 0, 0], [0, 1, 1, 0], [0, 1, 1, 0], [0, 0, 0, 0]],
      [[0, 0, 0, 0], [0, 1, 1, 0], [0, 1, 1, 0], [0, 0, 0, 0]],
      [[0, 0, 0, 0], [0, 1, 1, 0], [0, 1, 1, 0], [0, 0, 0, 0]],
    ],
  },
  T: {
    color: '#c084fc',
    rotations: [
      [[0, 1, 0, 0], [1, 1, 1, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
      [[0, 1, 0, 0], [0, 1, 1, 0], [0, 1, 0, 0], [0, 0, 0, 0]],
      [[0, 0, 0, 0], [1, 1, 1, 0], [0, 1, 0, 0], [0, 0, 0, 0]],
      [[0, 1, 0, 0], [1, 1, 0, 0], [0, 1, 0, 0], [0, 0, 0, 0]],
    ],
  },
  S: {
    color: '#4ade80',
    rotations: [
      [[0, 1, 1, 0], [1, 1, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
      [[0, 1, 0, 0], [0, 1, 1, 0], [0, 0, 1, 0], [0, 0, 0, 0]],
      [[0, 0, 0, 0], [0, 1, 1, 0], [1, 1, 0, 0], [0, 0, 0, 0]],
      [[1, 0, 0, 0], [1, 1, 0, 0], [0, 1, 0, 0], [0, 0, 0, 0]],
    ],
  },
  Z: {
    color: '#f87171',
    rotations: [
      [[1, 1, 0, 0], [0, 1, 1, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
      [[0, 0, 1, 0], [0, 1, 1, 0], [0, 1, 0, 0], [0, 0, 0, 0]],
      [[0, 0, 0, 0], [1, 1, 0, 0], [0, 1, 1, 0], [0, 0, 0, 0]],
      [[0, 1, 0, 0], [1, 1, 0, 0], [1, 0, 0, 0], [0, 0, 0, 0]],
    ],
  },
  J: {
    color: '#60a5fa',
    rotations: [
      [[1, 0, 0, 0], [1, 1, 1, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
      [[0, 1, 1, 0], [0, 1, 0, 0], [0, 1, 0, 0], [0, 0, 0, 0]],
      [[0, 0, 0, 0], [1, 1, 1, 0], [0, 0, 1, 0], [0, 0, 0, 0]],
      [[0, 1, 0, 0], [0, 1, 0, 0], [1, 1, 0, 0], [0, 0, 0, 0]],
    ],
  },
  L: {
    color: '#fb923c',
    rotations: [
      [[0, 0, 1, 0], [1, 1, 1, 0], [0, 0, 0, 0], [0, 0, 0, 0]],
      [[0, 1, 0, 0], [0, 1, 0, 0], [0, 1, 1, 0], [0, 0, 0, 0]],
      [[0, 0, 0, 0], [1, 1, 1, 0], [1, 0, 0, 0], [0, 0, 0, 0]],
      [[1, 1, 0, 0], [0, 1, 0, 0], [0, 1, 0, 0], [0, 0, 0, 0]],
    ],
  },
}

const PIECE_TYPES: PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L']

const DIFFICULTY_SETTINGS = {
  easy: {
    startLevel: 0,
    label: { en: 'Easy', da: 'Let' },
    description: { en: 'Slow start', da: 'Langsom start' },
    icon: Speedometer,
    color: 'text-green-500',
    bgGradient: 'from-green-500/20 to-green-600/20',
    borderColor: 'border-green-500/30',
    glowColor: 'shadow-green-500/20',
  },
  medium: {
    startLevel: 3,
    label: { en: 'Medium', da: 'Mellem' },
    description: { en: 'Balanced', da: 'Afbalanceret' },
    icon: Lightning,
    color: 'text-yellow-500',
    bgGradient: 'from-yellow-500/20 to-yellow-600/20',
    borderColor: 'border-yellow-500/30',
    glowColor: 'shadow-yellow-500/20',
  },
  hard: {
    startLevel: 6,
    label: { en: 'Hard', da: 'Svær' },
    description: { en: 'Fast drop', da: 'Hurtigt fald' },
    icon: Fire,
    color: 'text-red-500',
    bgGradient: 'from-red-500/20 to-red-600/20',
    borderColor: 'border-red-500/30',
    glowColor: 'shadow-red-500/20',
  },
  expert: {
    startLevel: 9,
    label: { en: 'Expert', da: 'Ekspert' },
    description: { en: 'Blazing speed!', da: 'Lynhurtigt!' },
    icon: Flame,
    color: 'text-purple-500',
    bgGradient: 'from-purple-500/20 to-purple-600/20',
    borderColor: 'border-purple-500/30',
    glowColor: 'shadow-purple-500/20',
  },
}

interface User {
  email: string
  fullName: string
  role: string
  phone?: string
}

interface TetrisProps {
  userEmail?: string
}

function createEmptyBoard(): Cell[][] {
  return Array.from({ length: BOARD_ROWS }, () => Array<Cell>(BOARD_COLS).fill(null))
}

function shuffleBag(): PieceType[] {
  const bag = [...PIECE_TYPES]
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[bag[i], bag[j]] = [bag[j], bag[i]]
  }
  return bag
}

function getDropIntervalMs(level: number): number {
  return Math.max(80, 800 - level * 60)
}

export function Tetris({ userEmail = 'guest@example.com' }: TetrisProps = {}) {
  const { language } = useLanguage()
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [gameState, setGameState] = useState<GameState>('menu')
  const [score, setScore] = useState(0)
  const [level, setLevel] = useState(0)
  const [lines, setLines] = useState(0)
  const [users, setUsers] = useState<User[]>([])
  const [globalLeaderboard, setGlobalLeaderboard] = useKV<GlobalLeaderboard>('tetris-global-leaderboard', {
    easy: [],
    medium: [],
    hard: [],
    expert: [],
  })

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const nextCanvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number | null>(null)
  const lastTimeRef = useRef<number>(0)

  const gameStateRef = useRef<GameState>('menu')
  const difficultyRef = useRef<Difficulty>('medium')
  const boardRef = useRef<Cell[][]>(createEmptyBoard())
  const bagRef = useRef<PieceType[]>([])
  const currentPieceRef = useRef<ActivePiece | null>(null)
  const nextPieceTypeRef = useRef<PieceType>('I')
  const dropAccRef = useRef(0)
  const levelRef = useRef(0)
  const linesRef = useRef(0)
  const scoreRef = useRef(0)
  const softDropRef = useRef(false)

  useEffect(() => {
    const loadUsers = async () => {
      const usersData = await window.spark.kv.get<Record<string, { email: string; password: string; fullName: string; role: string; phone?: string }>>('users')
      if (usersData) {
        setUsers(Object.values(usersData).map(u => ({ email: u.email, fullName: u.fullName, role: u.role || 'user', phone: u.phone })))
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

  const getUserRankForDifficulty = (diff: Difficulty): number | null => {
    const board = globalLeaderboard?.[diff] || []
    const index = board.findIndex(entry => entry.email === userEmail)
    return index !== -1 ? index + 1 : null
  }

  const drawNextPiece = useCallback(() => {
    const canvas = nextCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const size = 20
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const piece = TETROMINOES[nextPieceTypeRef.current]
    const matrix = piece.rotations[0]
    ctx.fillStyle = piece.color
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        if (matrix[row][col]) {
          ctx.fillRect(col * size, row * size, size - 2, size - 2)
        }
      }
    }
  }, [])

  const canPlace = (piece: ActivePiece, offsetX: number, offsetY: number, rotation: number): boolean => {
    const matrix = TETROMINOES[piece.type].rotations[rotation]
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        if (!matrix[row][col]) continue
        const boardX = piece.x + col + offsetX
        const boardY = piece.y + row + offsetY
        if (boardX < 0 || boardX >= BOARD_COLS || boardY >= BOARD_ROWS) return false
        if (boardY >= 0 && boardRef.current[boardY][boardX]) return false
      }
    }
    return true
  }

  const spawnPiece = (): boolean => {
    if (bagRef.current.length === 0) bagRef.current = shuffleBag()
    const type = nextPieceTypeRef.current
    if (bagRef.current.length === 0) bagRef.current = shuffleBag()
    const upcoming = bagRef.current.pop() as PieceType
    nextPieceTypeRef.current = upcoming
    drawNextPiece()

    const piece: ActivePiece = { type, rotation: 0, x: 3, y: 0 }
    if (!canPlace(piece, 0, 0, 0)) {
      currentPieceRef.current = piece
      return false
    }
    currentPieceRef.current = piece
    return true
  }

  const lockPiece = () => {
    const piece = currentPieceRef.current
    if (!piece) return
    const matrix = TETROMINOES[piece.type].rotations[piece.rotation]
    const color = TETROMINOES[piece.type].color
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        if (!matrix[row][col]) continue
        const boardY = piece.y + row
        const boardX = piece.x + col
        if (boardY >= 0 && boardY < BOARD_ROWS && boardX >= 0 && boardX < BOARD_COLS) {
          boardRef.current[boardY][boardX] = color
        }
      }
    }

    let cleared = 0
    boardRef.current = boardRef.current.filter(row => {
      const full = row.every(cell => cell !== null)
      if (full) cleared++
      return !full
    })
    while (boardRef.current.length < BOARD_ROWS) {
      boardRef.current.unshift(Array<Cell>(BOARD_COLS).fill(null))
    }

    if (cleared > 0) {
      const points = [0, 100, 300, 500, 800][cleared] * (levelRef.current + 1)
      scoreRef.current += points
      setScore(scoreRef.current)
      linesRef.current += cleared
      setLines(linesRef.current)
      const newLevel = DIFFICULTY_SETTINGS[difficultyRef.current].startLevel + Math.floor(linesRef.current / 10)
      if (newLevel !== levelRef.current) {
        levelRef.current = newLevel
        setLevel(newLevel)
      }
    }
  }

  const endGame = useCallback(async (finalScore: number, finalLevel: number) => {
    setGameState('ended')
    gameStateRef.current = 'ended'
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    if (!userEmail) return

    try {
      const currentLeaderboard = await window.spark.kv.get<GlobalLeaderboard>('tetris-global-leaderboard') || {
        easy: [], medium: [], hard: [], expert: []
      }

      const diff = difficultyRef.current
      const board = [...(currentLeaderboard[diff] || [])]
      const existingIndex = board.findIndex(entry => entry.email === userEmail)

      if (existingIndex !== -1) {
        if (finalScore > board[existingIndex].score) {
          board[existingIndex] = { email: userEmail, score: finalScore, level: finalLevel, timestamp: Date.now() }
        }
      } else {
        board.push({ email: userEmail, score: finalScore, level: finalLevel, timestamp: Date.now() })
      }

      board.sort((a, b) => b.score - a.score)

      const updated = { ...currentLeaderboard, [diff]: board.slice(0, 10) }
      await window.spark.kv.set('tetris-global-leaderboard', updated)
      setGlobalLeaderboard(updated)
    } catch (error) {
      console.error('Error saving Tetris score:', error)
    }

    try {
      const gameStats = await window.spark.kv.get<Record<string, Record<Difficulty, number>>>('tetris-play-counts') || {}
      if (!gameStats[userEmail]) {
        gameStats[userEmail] = { easy: 0, medium: 0, hard: 0, expert: 0 }
      }
      gameStats[userEmail][difficultyRef.current] = (gameStats[userEmail][difficultyRef.current] || 0) + 1
      await window.spark.kv.set('tetris-play-counts', gameStats)
    } catch (error) {
      console.error('Error tracking Tetris play count:', error)
    }
  }, [userEmail, setGlobalLeaderboard])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = '#0f172a'
    ctx.fillRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT)

    ctx.strokeStyle = 'rgba(255,255,255,0.05)'
    ctx.lineWidth = 1
    for (let col = 0; col <= BOARD_COLS; col++) {
      ctx.beginPath()
      ctx.moveTo(col * CELL_SIZE, 0)
      ctx.lineTo(col * CELL_SIZE, BOARD_HEIGHT)
      ctx.stroke()
    }
    for (let row = 0; row <= BOARD_ROWS; row++) {
      ctx.beginPath()
      ctx.moveTo(0, row * CELL_SIZE)
      ctx.lineTo(BOARD_WIDTH, row * CELL_SIZE)
      ctx.stroke()
    }

    for (let row = 0; row < BOARD_ROWS; row++) {
      for (let col = 0; col < BOARD_COLS; col++) {
        const cell = boardRef.current[row][col]
        if (cell) {
          ctx.fillStyle = cell
          ctx.fillRect(col * CELL_SIZE + 1, row * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2)
        }
      }
    }

    const piece = currentPieceRef.current
    if (piece && gameStateRef.current === 'playing') {
      const matrix = TETROMINOES[piece.type].rotations[piece.rotation]

      let ghostY = piece.y
      while (canPlace(piece, 0, ghostY - piece.y + 1, piece.rotation)) {
        ghostY++
      }
      ctx.fillStyle = 'rgba(255,255,255,0.12)'
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 4; col++) {
          if (!matrix[row][col]) continue
          const boardY = ghostY + row
          const boardX = piece.x + col
          if (boardY >= 0) {
            ctx.fillRect(boardX * CELL_SIZE + 1, boardY * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2)
          }
        }
      }

      ctx.fillStyle = TETROMINOES[piece.type].color
      for (let row = 0; row < 4; row++) {
        for (let col = 0; col < 4; col++) {
          if (!matrix[row][col]) continue
          const boardY = piece.y + row
          const boardX = piece.x + col
          if (boardY >= 0) {
            ctx.fillRect(boardX * CELL_SIZE + 1, boardY * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2)
          }
        }
      }
    }
  }, [])

  const step = useCallback((timestamp: number) => {
    if (gameStateRef.current !== 'playing') return

    if (!lastTimeRef.current) lastTimeRef.current = timestamp
    const delta = timestamp - lastTimeRef.current
    lastTimeRef.current = timestamp

    const interval = softDropRef.current ? Math.min(50, getDropIntervalMs(levelRef.current)) : getDropIntervalMs(levelRef.current)
    dropAccRef.current += delta

    if (dropAccRef.current >= interval) {
      dropAccRef.current = 0
      const piece = currentPieceRef.current
      if (piece) {
        if (canPlace(piece, 0, 1, piece.rotation)) {
          piece.y += 1
        } else {
          lockPiece()
          const spawned = spawnPiece()
          if (!spawned) {
            endGame(scoreRef.current, levelRef.current)
            return
          }
        }
      }
    }

    draw()
    animationFrameRef.current = requestAnimationFrame(step)
  }, [draw, endGame])

  const moveLeft = useCallback(() => {
    if (gameStateRef.current !== 'playing' || !currentPieceRef.current) return
    const piece = currentPieceRef.current
    if (canPlace(piece, -1, 0, piece.rotation)) piece.x -= 1
    draw()
  }, [draw])

  const moveRight = useCallback(() => {
    if (gameStateRef.current !== 'playing' || !currentPieceRef.current) return
    const piece = currentPieceRef.current
    if (canPlace(piece, 1, 0, piece.rotation)) piece.x += 1
    draw()
  }, [draw])

  const rotatePiece = useCallback(() => {
    if (gameStateRef.current !== 'playing' || !currentPieceRef.current) return
    const piece = currentPieceRef.current
    const nextRotation = (piece.rotation + 1) % 4
    const kicks = [0, -1, 1, -2, 2]
    for (const kick of kicks) {
      if (canPlace(piece, kick, 0, nextRotation)) {
        piece.x += kick
        piece.rotation = nextRotation
        draw()
        return
      }
    }
  }, [draw])

  const softDropStep = useCallback(() => {
    if (gameStateRef.current !== 'playing' || !currentPieceRef.current) return
    const piece = currentPieceRef.current
    if (canPlace(piece, 0, 1, piece.rotation)) {
      piece.y += 1
      scoreRef.current += 1
      setScore(scoreRef.current)
    }
    draw()
  }, [draw])

  const hardDrop = useCallback(() => {
    if (gameStateRef.current !== 'playing' || !currentPieceRef.current) return
    const piece = currentPieceRef.current
    let cells = 0
    while (canPlace(piece, 0, 1, piece.rotation)) {
      piece.y += 1
      cells++
    }
    scoreRef.current += cells * 2
    setScore(scoreRef.current)
    lockPiece()
    const spawned = spawnPiece()
    if (!spawned) {
      endGame(scoreRef.current, levelRef.current)
      return
    }
    dropAccRef.current = 0
    draw()
  }, [draw, endGame])

  const startGame = () => {
    difficultyRef.current = difficulty
    boardRef.current = createEmptyBoard()
    bagRef.current = shuffleBag()
    nextPieceTypeRef.current = bagRef.current.pop() as PieceType
    scoreRef.current = 0
    linesRef.current = 0
    levelRef.current = DIFFICULTY_SETTINGS[difficulty].startLevel
    dropAccRef.current = 0
    lastTimeRef.current = 0
    softDropRef.current = false
    setScore(0)
    setLines(0)
    setLevel(levelRef.current)
    gameStateRef.current = 'playing'
    setGameState('playing')
    spawnPiece()
    draw()

    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current)
    animationFrameRef.current = requestAnimationFrame(step)
  }

  const quitGame = () => {
    gameStateRef.current = 'menu'
    setGameState('menu')
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameStateRef.current !== 'playing') return
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) {
        e.preventDefault()
      }
      switch (e.code) {
        case 'ArrowLeft':
          moveLeft()
          break
        case 'ArrowRight':
          moveRight()
          break
        case 'ArrowUp':
          rotatePiece()
          break
        case 'ArrowDown':
          if (!softDropRef.current) {
            softDropRef.current = true
            softDropStep()
          }
          break
        case 'Space':
          hardDrop()
          break
      }
    }
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'ArrowDown') softDropRef.current = false
    }
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [moveLeft, moveRight, rotatePiece, softDropStep, hardDrop])

  return (
    <div className="space-y-6">
      <Card className="p-6 bg-gradient-to-br from-card via-primary/5 to-accent/5 border-2">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-gradient-to-br from-primary to-accent shadow-lg">
              <SquaresFour size={32} weight="duotone" className="text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Tetris
              </h2>
              <p className="text-sm text-muted-foreground">
                {language === 'da'
                  ? 'Klassisk klodsespil - ryd så mange linjer som muligt!'
                  : 'Classic block game - clear as many lines as possible!'}
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
              <div className="flex items-center justify-center gap-4 flex-wrap">
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
                  ? 'Piletaster til at flytte/rotere, mellemrum for hurtigt fald.'
                  : 'Arrow keys to move/rotate, space for hard drop.'}
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
            <div className="relative flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-6 flex-wrap">
                <div className="relative px-5 py-3 rounded-xl bg-gradient-to-br from-primary/20 to-accent/30 border-2 border-primary/40 backdrop-blur-sm">
                  <div className="text-[10px] text-primary-foreground/70 uppercase tracking-widest font-bold mb-1 flex items-center gap-1">
                    <Trophy size={12} weight="fill" />
                    {language === 'da' ? 'Point' : 'Score'}
                  </div>
                  <div className="text-3xl font-black bg-gradient-to-br from-white to-primary-foreground bg-clip-text text-transparent drop-shadow-lg">
                    {score}
                  </div>
                </div>
                <div className="relative px-5 py-3 rounded-xl bg-gradient-to-br from-accent/20 to-yellow-500/20 border-2 border-accent/40 backdrop-blur-sm">
                  <div className="text-[10px] text-accent-foreground/70 uppercase tracking-widest font-bold mb-1">
                    {language === 'da' ? 'Level' : 'Level'}
                  </div>
                  <div className="text-3xl font-black text-yellow-400 drop-shadow-lg">
                    {level}
                  </div>
                </div>
                <div className="relative px-5 py-3 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 border-2 border-primary/40 backdrop-blur-sm">
                  <div className="text-[10px] text-primary-foreground/70 uppercase tracking-widest font-bold mb-1">
                    {language === 'da' ? 'Linjer' : 'Lines'}
                  </div>
                  <div className="text-3xl font-black text-white drop-shadow-lg">
                    {lines}
                  </div>
                </div>
                <div className="px-3 py-2 rounded-xl bg-slate-950/60 border-2 border-primary/30">
                  <div className="text-[10px] text-primary-foreground/70 uppercase tracking-widest font-bold mb-1 text-center">
                    {language === 'da' ? 'Næste' : 'Next'}
                  </div>
                  <canvas ref={nextCanvasRef} width={80} height={80} className="block" />
                </div>
              </div>

              <Button
                onClick={quitGame}
                variant="destructive"
                size="lg"
                className="shadow-xl hover:shadow-2xl transition-shadow font-bold"
              >
                <X size={20} weight="bold" className="mr-2" />
                {language === 'da' ? 'Stop' : 'Quit'}
              </Button>
            </div>
          </div>

          <div className="flex flex-col items-center gap-4 bg-slate-950 py-6">
            <canvas
              ref={canvasRef}
              width={BOARD_WIDTH}
              height={BOARD_HEIGHT}
              className="rounded-lg shadow-2xl border-2 border-primary/20"
              style={{ maxWidth: '100%', height: 'auto' }}
            />

            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={moveLeft} className="bg-background/80">
                <ArrowLeft size={20} weight="bold" />
              </Button>
              <Button variant="outline" size="icon" onClick={rotatePiece} className="bg-background/80">
                <ArrowClockwise size={20} weight="bold" />
              </Button>
              <Button variant="outline" size="icon" onClick={moveRight} className="bg-background/80">
                <ArrowRight size={20} weight="bold" />
              </Button>
              <Button variant="outline" size="icon" onClick={softDropStep} className="bg-background/80">
                <CaretDown size={20} weight="bold" />
              </Button>
              <Button variant="outline" size="icon" onClick={hardDrop} className="bg-background/80">
                <ArrowLineDown size={20} weight="bold" />
              </Button>
            </div>
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
                {score}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {language === 'da' ? `Level ${level} · ${lines} linjer` : `Level ${level} · ${lines} lines`}
              </p>
            </div>
          </div>
          {score > 0 && score >= getCurrentHighScore() && (
            <p className="text-sm text-accent font-semibold mt-4 flex items-center gap-2 justify-center">
              <Trophy size={20} weight="fill" />
              {language === 'da' ? '🎉 Ny højeste score!' : '🎉 New high score!'}
            </p>
          )}
          <div className="flex items-center justify-center gap-3 mt-6">
            <Button onClick={startGame} size="lg" className="bg-gradient-to-r from-primary to-accent hover:opacity-90">
              {language === 'da' ? 'Prøv igen' : 'Play Again'}
            </Button>
            <Button onClick={() => setGameState('menu')} variant="outline" size="lg">
              {language === 'da' ? 'Tilbage til menu' : 'Back to Menu'}
            </Button>
          </div>
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
                        const rankColors = ['text-yellow-500', 'text-gray-400', 'text-amber-600']
                        const rankIcons = [Crown, Medal, Star]
                        const RankIcon = index < 3 ? rankIcons[index] : null

                        return (
                          <div
                            key={entry.email}
                            className={`flex items-center gap-3 p-2 rounded-lg transition-all ${
                              isCurrentUser ? 'bg-primary/10 border border-primary/30 shadow-md' : 'bg-muted/30'
                            }`}
                          >
                            <div className="flex items-center justify-center w-8 h-8">
                              {RankIcon ? (
                                <RankIcon size={20} weight="fill" className={rankColors[index]} />
                              ) : (
                                <span className="text-sm font-bold text-muted-foreground">#{index + 1}</span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className={`text-sm font-medium truncate ${isCurrentUser ? 'text-primary font-bold' : 'text-foreground'}`}>
                                {getDisplayName(entry.email)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {language === 'da' ? `Level ${entry.level}` : `Level ${entry.level}`}
                              </div>
                            </div>
                            <div className={`text-lg font-bold ${isCurrentUser ? 'text-primary' : 'text-muted-foreground'}`}>
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
                              <span className="text-sm font-bold text-primary">#{userRank}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-bold text-primary truncate">
                                {getDisplayName(userEmail)}
                              </div>
                            </div>
                            <div className="text-lg font-bold text-primary">{userEntry.score}</div>
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <Trophy size={32} className="text-muted-foreground/30 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {language === 'da' ? 'Ingen scores endnu' : 'No scores yet'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {language === 'da' ? 'Vær den første!' : 'Be the first!'}
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
