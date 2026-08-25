import { useState, useEffect, useRef } from 'react'
import { Target, Trophy, X, Timer, Lightning, Speedometer, Fire, Crown, Flame, Medal, Star } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useKV } from '@/hooks/useKV'
import { useLanguage } from '@/contexts/LanguageContext'
import { motion, AnimatePresence } from 'framer-motion'

interface Position {
  x: number
  y: number
}

interface TargetData {
  id: number
  position: Position
  spawnTime: number
}

interface HitParticle {
  id: number
  x: number
  y: number
  angle: number
  color: string
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
    lifetime: 2000,
    targetSize: 100,
    label: { en: 'Easy', da: 'Let' },
    description: { en: '2s per target', da: '2s per mål' },
    icon: Speedometer,
    color: 'text-green-500',
    bgGradient: 'from-green-500/20 to-green-600/20',
    borderColor: 'border-green-500/30',
    glowColor: 'shadow-green-500/20',
    missPenalty: 20,
    moving: false,
    moveSpeed: 0
  },
  medium: {
    lifetime: 1400,
    targetSize: 70,
    label: { en: 'Medium', da: 'Mellem' },
    description: { en: '1.4s per target', da: '1.4s per mål' },
    icon: Lightning,
    color: 'text-yellow-500',
    bgGradient: 'from-yellow-500/20 to-yellow-600/20',
    borderColor: 'border-yellow-500/30',
    glowColor: 'shadow-yellow-500/20',
    missPenalty: 30,
    moving: false,
    moveSpeed: 0
  },
  hard: {
    lifetime: 800,
    targetSize: 40,
    label: { en: 'Hard', da: 'Svær' },
    description: { en: '0.8s per target', da: '0.8s per mål' },
    icon: Fire,
    color: 'text-red-500',
    bgGradient: 'from-red-500/20 to-red-600/20',
    borderColor: 'border-red-500/30',
    glowColor: 'shadow-red-500/20',
    missPenalty: 50,
    moving: true,
    moveSpeed: 2.5
  },
  expert: {
    lifetime: 500,
    targetSize: 28,
    label: { en: 'Expert', da: 'Ekspert' },
    description: { en: '0.5s per target', da: '0.5s per mål' },
    icon: Flame,
    color: 'text-purple-500',
    bgGradient: 'from-purple-500/20 to-purple-600/20',
    borderColor: 'border-purple-500/30',
    glowColor: 'shadow-purple-500/20',
    missPenalty: 75,
    moving: true,
    moveSpeed: 3.5
  }
}

const MIN_DISTANCE_FROM_EDGE = 80
const TIMER_DURATION = 30
const COUNTDOWN_DURATION = 3

const STREAK_MILESTONES = [3, 5, 10, 15, 20]
const STREAK_BONUSES = [5, 10, 25, 50, 100]

interface User {
  email: string
  fullName: string
  role: string
  phone?: string
}

interface HitNMissProps {
  userEmail?: string
}

export function HitNMiss({ userEmail = 'guest@example.com' }: HitNMissProps = {}) {
  const { language } = useLanguage()
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [gameState, setGameState] = useState<GameState>('menu')
  const [score, setScore] = useState(0)
  const [misses, setMisses] = useState(0)
  const [hitStreak, setHitStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION)
  const [countdown, setCountdown] = useState(COUNTDOWN_DURATION)
  const [target, setTarget] = useState<TargetData | null>(null)
  const [showStreakBonus, setShowStreakBonus] = useState<{ amount: number; milestone: number } | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [hitParticles, setHitParticles] = useState<HitParticle[]>([])
  const [isShaking, setIsShaking] = useState(false)
  const [globalLeaderboard, setGlobalLeaderboard] = useKV<GlobalLeaderboard>('hit-n-miss-global-leaderboard', {
    easy: [],
    medium: [],
    hard: [],
    expert: []
  })
  const gameAreaRef = useRef<HTMLDivElement>(null)
  const targetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const targetVelocityRef = useRef<{ vx: number; vy: number }>({ vx: 0, vy: 0 })
  const moveAnimationRef = useRef<number | null>(null)

  useEffect(() => {
    const loadUsers = async () => {
      const usersData = await window.kv.get<Record<string, { email: string; password: string; fullName: string; role: string; phone?: string }>>('users')
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

  const checkStreakBonus = (streak: number) => {
    const milestoneIndex = STREAK_MILESTONES.indexOf(streak)
    if (milestoneIndex !== -1) {
      const bonus = STREAK_BONUSES[milestoneIndex]
      setShowStreakBonus({ amount: bonus, milestone: streak })
      setTimeout(() => setShowStreakBonus(null), 2000)
      return bonus
    }
    return 0
  }

  const spawnTarget = () => {
    if (!gameAreaRef.current) return

    const currentTargetSize = DIFFICULTY_SETTINGS[difficulty].targetSize
    const rect = gameAreaRef.current.getBoundingClientRect()
    const maxX = rect.width - currentTargetSize - MIN_DISTANCE_FROM_EDGE
    const maxY = rect.height - currentTargetSize - MIN_DISTANCE_FROM_EDGE

    const x = Math.random() * maxX + MIN_DISTANCE_FROM_EDGE
    const y = Math.random() * maxY + MIN_DISTANCE_FROM_EDGE

    const newTarget: TargetData = {
      id: Date.now(),
      position: { x, y },
      spawnTime: Date.now()
    }

    if (DIFFICULTY_SETTINGS[difficulty].moving) {
      const angle = Math.random() * Math.PI * 2
      const speed = DIFFICULTY_SETTINGS[difficulty].moveSpeed
      targetVelocityRef.current = { vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed }
    }

    setTarget(newTarget)

    const targetLifetime = DIFFICULTY_SETTINGS[difficulty].lifetime

    targetTimeoutRef.current = setTimeout(() => {
      setHitStreak(0)
      spawnTarget()
    }, targetLifetime)
  }

  const calculateComboMultiplier = (streak: number): number => {
    if (streak < 3) return 1
    if (streak < 5) return 1.5
    if (streak < 10) return 2
    if (streak < 15) return 2.5
    if (streak < 20) return 3
    return 3.5
  }

  const handleTargetClick = () => {
    if (targetTimeoutRef.current) {
      clearTimeout(targetTimeoutRef.current)
    }

    if (target) {
      const size = DIFFICULTY_SETTINGS[difficulty].targetSize
      spawnHitParticles(target.position.x + size / 2, target.position.y + size / 2)
    }

    const newStreak = hitStreak + 1
    setHitStreak(newStreak)
    
    if (newStreak > bestStreak) {
      setBestStreak(newStreak)
    }
    
    const basePoints = 10
    const multiplier = calculateComboMultiplier(newStreak)
    const pointsWithMultiplier = Math.round(basePoints * multiplier)
    const streakBonus = checkStreakBonus(newStreak)
    const totalPoints = pointsWithMultiplier + streakBonus
    
    setScore(prev => prev + totalPoints)
    spawnTarget()
  }

  const spawnHitParticles = (x: number, y: number) => {
    const colors = ['#fbbf24', '#ef4444', '#f97316', '#ffffff']
    const burstId = Date.now()
    const newParticles: HitParticle[] = Array.from({ length: 12 }, (_, i) => ({
      id: burstId + i,
      x,
      y,
      angle: (i / 12) * 360,
      color: colors[i % colors.length]
    }))
    setHitParticles(prev => [...prev, ...newParticles])
    setTimeout(() => {
      setHitParticles(prev => prev.filter(p => !newParticles.some(np => np.id === p.id)))
    }, 600)
  }

  const handleMissClick = () => {
    setMisses(prev => prev + 1)
    const penalty = DIFFICULTY_SETTINGS[difficulty].missPenalty
    setScore(prev => Math.max(0, prev - penalty))
    setHitStreak(0)
    setIsShaking(true)
    setTimeout(() => setIsShaking(false), 300)
  }

  const startCountdown = () => {
    setGameState('countdown')
    setScore(0)
    setMisses(0)
    setHitStreak(0)
    setBestStreak(0)
    setTarget(null)
    setTimeLeft(TIMER_DURATION)
    setCountdown(COUNTDOWN_DURATION)
    
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
    
    setTimeout(() => spawnTarget(), 500)

    timerIntervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          endGame()
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const endGame = async () => {
    if (targetTimeoutRef.current) {
      clearTimeout(targetTimeoutRef.current)
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current)
    }
    setTarget(null)
    
    setScore((finalScore) => {
      updateGlobalLeaderboard(finalScore)
      return finalScore
    })
    
    await trackGamePlay(difficulty)
    
    setGameState('ended')
  }

  const trackGamePlay = async (gameDifficulty: Difficulty) => {
    if (!userEmail) return

    try {
      const gameStats = await window.kv.get<Record<string, Record<Difficulty, number>>>('hit-n-miss-play-counts') || {}
      
      if (!gameStats[userEmail]) {
        gameStats[userEmail] = { easy: 0, medium: 0, hard: 0, expert: 0 }
      }
      
      gameStats[userEmail][gameDifficulty] = (gameStats[userEmail][gameDifficulty] || 0) + 1
      
      await window.kv.set('hit-n-miss-play-counts', gameStats)
    } catch (error) {
      console.error('Error tracking game play:', error)
    }
  }

  useEffect(() => {
    return () => {
      if (targetTimeoutRef.current) {
        clearTimeout(targetTimeoutRef.current)
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current)
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current)
      }
      if (moveAnimationRef.current) {
        cancelAnimationFrame(moveAnimationRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (gameState !== 'playing' || !target || !DIFFICULTY_SETTINGS[difficulty].moving || !gameAreaRef.current) {
      return
    }

    const rect = gameAreaRef.current.getBoundingClientRect()
    const targetSize = DIFFICULTY_SETTINGS[difficulty].targetSize
    const margin = MIN_DISTANCE_FROM_EDGE / 2

    const animate = () => {
      setTarget(prev => {
        if (!prev) return prev
        let { x, y } = prev.position
        let { vx, vy } = targetVelocityRef.current
        x += vx
        y += vy

        if (x <= margin || x >= rect.width - targetSize - margin) {
          vx = -vx
          x = Math.max(margin, Math.min(x, rect.width - targetSize - margin))
        }
        if (y <= margin || y >= rect.height - targetSize - margin) {
          vy = -vy
          y = Math.max(margin, Math.min(y, rect.height - targetSize - margin))
        }

        targetVelocityRef.current = { vx, vy }
        return { ...prev, position: { x, y } }
      })
      moveAnimationRef.current = requestAnimationFrame(animate)
    }

    moveAnimationRef.current = requestAnimationFrame(animate)
    return () => {
      if (moveAnimationRef.current) {
        cancelAnimationFrame(moveAnimationRef.current)
        moveAnimationRef.current = null
      }
    }
  }, [gameState, target?.id, difficulty])

  return (
    <div className="space-y-6">
      <Card className="p-6 bg-gradient-to-br from-card via-primary/5 to-accent/5 border-2">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-gradient-to-br from-primary to-accent shadow-lg">
              <Target size={32} weight="duotone" className="text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Hit N Miss
              </h2>
              <p className="text-sm text-muted-foreground">
                {language === 'da' 
                  ? 'Klik på skydeskiverne så hurtigt som muligt!' 
                  : 'Click the shooting discs as fast as you can!'}
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
                  const actualTargetSize = setting.targetSize
                  const scaleFactor = 0.35
                  const displaySize = actualTargetSize * scaleFactor
                  
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
                        
                        <div className="flex items-center justify-center mt-2 h-[60px]">
                          <div 
                            className={`rounded-full transition-all duration-300 ${
                              isSelected 
                                ? `bg-gradient-to-br from-destructive via-red-500 to-destructive/90 shadow-lg ${setting.glowColor}` 
                                : 'bg-gradient-to-br from-destructive/60 via-red-400/60 to-destructive/50'
                            } flex items-center justify-center`}
                            style={{
                              width: `${displaySize}px`,
                              height: `${displaySize}px`
                            }}
                          >
                            <div 
                              className="rounded-full bg-white"
                              style={{
                                width: `${displaySize * 0.12}px`,
                                height: `${displaySize * 0.12}px`
                              }}
                            />
                          </div>
                        </div>
                        
                        <div className="text-[10px] text-muted-foreground font-medium mt-1">
                          {language === 'da' ? 'Målstørrelse' : 'Target Size'}
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
                  ? 'Du har 30 sekunder! Få den højeste score muligt.' 
                  : 'You have 30 seconds! Get the highest score possible.'}
              </p>
              <Button onClick={startCountdown} size="lg" className="px-8 bg-gradient-to-r from-primary to-accent hover:opacity-90">
                {language === 'da' ? 'Start spil' : 'Start Game'}
              </Button>
            </div>
          </div>
        )}
      </Card>

      {gameState === 'countdown' && (
        <Card className="p-0 overflow-hidden bg-gradient-to-br from-primary/10 via-accent/10 to-background">
          <div className="h-[600px] flex items-center justify-center">
            <div className="text-center">
              <div className="text-[200px] font-bold bg-gradient-to-br from-primary via-accent to-destructive bg-clip-text text-transparent animate-pulse leading-none">
                {countdown}
              </div>
              <div className="text-2xl font-semibold text-muted-foreground mt-4">
                {language === 'da' ? 'Gør dig klar...' : 'Get ready...'}
              </div>
            </div>
          </div>
        </Card>
      )}

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
                      {score}
                    </div>
                  </div>
                </div>
                
                <div className="h-14 w-[2px] bg-gradient-to-b from-transparent via-border to-transparent" />
                
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-br from-destructive to-red-600 blur-lg opacity-20 group-hover:opacity-40 transition-opacity" />
                  <div className="relative px-5 py-3 rounded-xl bg-gradient-to-br from-destructive/20 to-red-500/20 border-2 border-destructive/40 backdrop-blur-sm">
                    <div className="text-[10px] text-destructive-foreground/70 uppercase tracking-widest font-bold mb-1 flex items-center gap-1">
                      <X size={12} weight="bold" />
                      {language === 'da' ? 'Fejl' : 'Misses'}
                    </div>
                    <div className="text-4xl font-black text-red-400 drop-shadow-lg">
                      {misses}
                    </div>
                  </div>
                </div>
                
                <div className="h-14 w-[2px] bg-gradient-to-b from-transparent via-border to-transparent" />
                
                <div className="relative group">
                  <div className={`absolute inset-0 bg-gradient-to-br from-accent to-yellow-500 blur-lg transition-opacity ${hitStreak >= 5 ? 'opacity-60 animate-pulse' : 'opacity-20'}`} />
                  <div className={`relative px-5 py-3 rounded-xl bg-gradient-to-br from-accent/20 to-yellow-500/20 border-2 ${hitStreak >= 5 ? 'border-accent shadow-lg shadow-accent/30' : 'border-accent/40'} backdrop-blur-sm transition-all`}>
                    <div className="text-[10px] text-accent-foreground/70 uppercase tracking-widest font-bold mb-1 flex items-center gap-1">
                      <Flame size={12} weight="fill" className={hitStreak >= 5 ? 'animate-pulse' : ''} />
                      {language === 'da' ? 'Serie' : 'Combo'}
                    </div>
                    <div className={`text-4xl font-black drop-shadow-lg transition-all ${hitStreak >= 10 ? 'text-yellow-300 scale-110' : hitStreak >= 5 ? 'text-yellow-400' : 'text-yellow-500'}`}>
                      {hitStreak}x
                    </div>
                    {hitStreak >= 3 && (
                      <div className="text-[10px] text-accent font-bold mt-1 text-center">
                        {calculateComboMultiplier(hitStreak)}x {language === 'da' ? 'point' : 'points'}
                      </div>
                    )}
                  </div>
                </div>
                
                <>
                  <div className="h-14 w-[2px] bg-gradient-to-b from-transparent via-border to-transparent" />
                  
                  <div className="relative group">
                    <div className={`absolute inset-0 blur-lg transition-opacity ${timeLeft <= 5 ? 'bg-destructive opacity-40' : 'bg-primary/20 opacity-20'}`} />
                    <div className={`relative px-5 py-3 rounded-xl backdrop-blur-sm transition-all ${timeLeft <= 5 ? 'bg-gradient-to-br from-destructive/30 to-red-600/30 border-2 border-destructive shadow-lg shadow-destructive/30' : 'bg-gradient-to-br from-primary/20 to-primary/30 border-2 border-primary/40'}`}>
                      <div className={`text-[10px] uppercase tracking-widest font-bold mb-1 flex items-center gap-1 ${timeLeft <= 5 ? 'text-destructive-foreground/90' : 'text-primary-foreground/70'}`}>
                          <Timer size={12} weight="fill" className={timeLeft <= 5 ? 'animate-pulse' : ''} />
                          {language === 'da' ? 'Tid' : 'Time'}
                        </div>
                        <div className={`text-4xl font-black drop-shadow-lg ${timeLeft <= 5 ? 'text-red-400 animate-pulse' : 'text-blue-400'}`}>
                          {timeLeft}s
                        </div>
                      </div>
                    </div>
                  </>
              </div>
              
              <Button 
                onClick={endGame} 
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
            onClick={handleMissClick}
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

            <AnimatePresence>
              {isShaking && (
                <motion.div
                  className="absolute inset-0 bg-destructive/20 pointer-events-none z-20"
                  initial={{ opacity: 0.7 }}
                  animate={{ opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                />
              )}
            </AnimatePresence>

            <AnimatePresence>
              {hitParticles.map(p => (
                <motion.div
                  key={p.id}
                  className="absolute rounded-full pointer-events-none z-20"
                  style={{ left: p.x, top: p.y, width: 8, height: 8, backgroundColor: p.color, marginLeft: -4, marginTop: -4 }}
                  initial={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                  animate={{
                    opacity: 0,
                    scale: 0.3,
                    x: Math.cos((p.angle * Math.PI) / 180) * 70,
                    y: Math.sin((p.angle * Math.PI) / 180) * 70,
                  }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                />
              ))}
            </AnimatePresence>
            
            {target && (
              <div
                onClick={(e) => {
                  e.stopPropagation()
                  handleTargetClick()
                }}
                className="absolute animate-in zoom-in-50 duration-200"
                style={{
                  left: `${target.position.x}px`,
                  top: `${target.position.y}px`,
                  width: `${DIFFICULTY_SETTINGS[difficulty].targetSize}px`,
                  height: `${DIFFICULTY_SETTINGS[difficulty].targetSize}px`,
                  cursor: 'pointer'
                }}
              >
                <div className="relative w-full h-full rounded-full bg-gradient-to-br from-destructive via-red-500 to-destructive/90 shadow-2xl hover:scale-110 transition-transform flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-2 border-destructive/50 animate-ping" />
                  <div 
                    className="rounded-full bg-white shadow-lg"
                    style={{
                      width: `${DIFFICULTY_SETTINGS[difficulty].targetSize * 0.12}px`,
                      height: `${DIFFICULTY_SETTINGS[difficulty].targetSize * 0.12}px`
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {gameState === 'ended' && score > 0 && (
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
            </div>
            {bestStreak > 0 && (
              <div className="p-3 rounded-lg bg-gradient-to-r from-accent/10 to-primary/10 border border-accent/20">
                <p className="text-sm text-muted-foreground flex items-center gap-2 justify-center">
                  <Flame size={16} weight="fill" className="text-accent" />
                  {language === 'da' ? 'Bedste serie' : 'Best Streak'}
                </p>
                <p className="text-2xl font-bold text-accent">{bestStreak}</p>
              </div>
            )}
          </div>
          {score > getCurrentHighScore() && (
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
                      'bg-gradient-to-br from-red-500/20 to-red-600/20'
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
                                {getDisplayName(userEmail)} (You)
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
                ? 'Spil i timer-tilstand for at tilføje din score til resultattavlen og konkurrere med andre medarbejdere!'
                : 'Play in timer mode to add your score to the leaderboard and compete with other employees!'}
            </p>
          </div>
        )}
      </Card>
    </div>
  )
}
