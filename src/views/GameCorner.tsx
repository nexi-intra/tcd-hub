import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'
import { X, Trophy, Target, Lightning, Crown, Medal, Star, Fire, Sparkle, ShieldCheck, Flame, Rocket, Crosshair } from '@phosphor-icons/react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { useKV } from '@github/spark/hooks'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/contexts/LanguageContext'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { toast } from 'sonner'

interface GameCornerProps {
  onNavigateBack: () => void
  userEmail: string
}

interface HighScore {
  id: string
  playerName: string
  score: number
  timestamp: number
  playerEmail: string
  difficulty: Difficulty
}

interface Achievement {
  id: string
  name: { da: string; en: string }
  description: { da: string; en: string }
  condition: (stats: PlayerStats) => boolean
  border: AvatarBorder
  icon: typeof Trophy
}

interface AvatarBorder {
  id: string
  name: { da: string; en: string }
  gradient: string
  glow?: string
  pattern?: 'solid' | 'dashed' | 'dotted' | 'double'
  animation?: 'pulse' | 'spin' | 'rainbow' | 'glow'
  thickness?: number
}

interface PlayerStats {
  totalGames: number
  totalScore: number
  highestScore: number
  highestCombo: number
  averageScore: number
  gamesWonEasy: number
  gamesWonMedium: number
  gamesWonHard: number
}

interface PlayerAchievements {
  [email: string]: {
    unlockedAchievements: string[]
    selectedBorder: string
    stats: PlayerStats
  }
}

interface Target {
  id: string
  x: number
  y: number
}

type Difficulty = 'easy' | 'medium' | 'hard'

interface DifficultySettings {
  timeLimit: number
  targetLifetime: number
  pointsPerTarget: number
  penaltyPoints: number
  label: { da: string; en: string }
  description: { da: string; en: string }
  color: string
}

const DIFFICULTY_SETTINGS: Record<Difficulty, DifficultySettings> = {
  easy: {
    timeLimit: 45,
    targetLifetime: 2000,
    pointsPerTarget: 10,
    penaltyPoints: 5,
    label: { da: 'Let', en: 'Easy' },
    description: { da: '45 sekunder, langsomme mål', en: '45 seconds, slow targets' },
    color: 'oklch(0.65 0.15 140)',
  },
  medium: {
    timeLimit: 30,
    targetLifetime: 1500,
    pointsPerTarget: 15,
    penaltyPoints: 10,
    label: { da: 'Medium', en: 'Medium' },
    description: { da: '30 sekunder, normale mål', en: '30 seconds, normal targets' },
    color: 'oklch(0.70 0.18 90)',
  },
  hard: {
    timeLimit: 20,
    targetLifetime: 1000,
    pointsPerTarget: 25,
    penaltyPoints: 15,
    label: { da: 'Svær', en: 'Hard' },
    description: { da: '20 sekunder, hurtige mål', en: '20 seconds, fast targets' },
    color: 'oklch(0.65 0.26 340)',
  },
}

const AVATAR_BORDERS: AvatarBorder[] = [
  {
    id: 'default',
    name: { da: 'Standard', en: 'Default' },
    gradient: 'linear-gradient(135deg, oklch(0.70 0.08 250), oklch(0.60 0.08 250))',
    thickness: 2,
  },
  {
    id: 'bronze',
    name: { da: 'Bronze Begynder', en: 'Bronze Beginner' },
    gradient: 'linear-gradient(135deg, oklch(0.60 0.15 50), oklch(0.50 0.12 40))',
    glow: 'oklch(0.60 0.15 50 / 0.5)',
    thickness: 3,
  },
  {
    id: 'silver',
    name: { da: 'Sølv Skytte', en: 'Silver Shooter' },
    gradient: 'linear-gradient(135deg, oklch(0.85 0.02 250), oklch(0.70 0.03 250))',
    glow: 'oklch(0.85 0.02 250 / 0.5)',
    thickness: 3,
  },
  {
    id: 'gold',
    name: { da: 'Guld Mester', en: 'Gold Master' },
    gradient: 'linear-gradient(135deg, oklch(0.85 0.18 90), oklch(0.75 0.20 70))',
    glow: 'oklch(0.85 0.18 90 / 0.6)',
    animation: 'pulse',
    thickness: 4,
  },
  {
    id: 'combo-king',
    name: { da: 'Combo Konge', en: 'Combo King' },
    gradient: 'linear-gradient(135deg, oklch(0.70 0.26 340), oklch(0.60 0.20 320))',
    glow: 'oklch(0.70 0.26 340 / 0.6)',
    animation: 'pulse',
    thickness: 4,
  },
  {
    id: 'speed-demon',
    name: { da: 'Hastighedsdæmon', en: 'Speed Demon' },
    gradient: 'linear-gradient(90deg, oklch(0.65 0.26 340), oklch(0.70 0.18 20), oklch(0.75 0.20 60))',
    glow: 'oklch(0.70 0.18 20 / 0.6)',
    animation: 'rainbow',
    thickness: 4,
  },
  {
    id: 'legendary',
    name: { da: 'Legendarisk', en: 'Legendary' },
    gradient: 'linear-gradient(135deg, oklch(0.75 0.28 320), oklch(0.70 0.25 280), oklch(0.75 0.22 240))',
    glow: 'oklch(0.75 0.28 320 / 0.7)',
    animation: 'rainbow',
    pattern: 'double',
    thickness: 5,
  },
]

const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-game',
    name: { da: 'Første Forsøg', en: 'First Try' },
    description: { da: 'Spil dit første spil', en: 'Play your first game' },
    condition: (stats) => stats.totalGames >= 1,
    border: AVATAR_BORDERS[1],
    icon: Target,
  },
  {
    id: 'score-100',
    name: { da: 'Hundrede Klub', en: 'Century Club' },
    description: { da: 'Få 100+ point i ét spil', en: 'Score 100+ points in a single game' },
    condition: (stats) => stats.highestScore >= 100,
    border: AVATAR_BORDERS[2],
    icon: Trophy,
  },
  {
    id: 'score-300',
    name: { da: 'Høj Skyder', en: 'High Scorer' },
    description: { da: 'Få 300+ point i ét spil', en: 'Score 300+ points in a single game' },
    condition: (stats) => stats.highestScore >= 300,
    border: AVATAR_BORDERS[3],
    icon: Star,
  },
  {
    id: 'combo-master',
    name: { da: 'Combo Mester', en: 'Combo Master' },
    description: { da: 'Få en 15x combo', en: 'Achieve a 15x combo' },
    condition: (stats) => stats.highestCombo >= 15,
    border: AVATAR_BORDERS[4],
    icon: Lightning,
  },
  {
    id: 'hard-mode',
    name: { da: 'Svær Modus Mester', en: 'Hard Mode Master' },
    description: { da: 'Vind 5 spil på svær', en: 'Win 5 games on hard difficulty' },
    condition: (stats) => stats.gamesWonHard >= 5,
    border: AVATAR_BORDERS[5],
    icon: Fire,
  },
  {
    id: 'dedication',
    name: { da: 'Dedikation', en: 'Dedication' },
    description: { da: 'Spil 50 spil', en: 'Play 50 games' },
    condition: (stats) => stats.totalGames >= 50,
    border: AVATAR_BORDERS[5],
    icon: ShieldCheck,
  },
  {
    id: 'legendary-player',
    name: { da: 'Legendarisk Spiller', en: 'Legendary Player' },
    description: { da: 'Få 500+ point i ét spil', en: 'Score 500+ points in a single game' },
    condition: (stats) => stats.highestScore >= 500,
    border: AVATAR_BORDERS[6],
    icon: Crown,
  },
]

const getAvatarUrl = (email: string, userAvatarUrl?: string, currentUserEmail?: string) => {
  if (userAvatarUrl && email === currentUserEmail) {
    return userAvatarUrl
  }
  const hash = email.toLowerCase().split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc)
  }, 0)
  const id = Math.abs(hash) % 100
  return `https://i.pravatar.cc/150?img=${id}`
}

const getInitials = (name: string) => {
  const parts = name.trim().split(' ')
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

const getPlayerBorder = (email: string, playerAchievements: PlayerAchievements | undefined): AvatarBorder => {
  const playerData = playerAchievements?.[email]
  if (!playerData) return AVATAR_BORDERS[0]
  
  const selectedBorderId = playerData.selectedBorder || 'default'
  return AVATAR_BORDERS.find(b => b.id === selectedBorderId) || AVATAR_BORDERS[0]
}

const getAnimationStyle = (animation?: string) => {
  switch (animation) {
    case 'pulse':
      return 'animate-pulse'
    case 'spin':
      return 'animate-spin'
    case 'rainbow':
      return 'animate-rainbow'
    case 'glow':
      return 'animate-glow'
    default:
      return ''
  }
}

const getAchievementProgress = (achievement: Achievement, stats: PlayerStats): { current: number; target: number; progress: number } => {
  switch (achievement.id) {
    case 'first-game':
      return { current: stats.totalGames, target: 1, progress: Math.min((stats.totalGames / 1) * 100, 100) }
    case 'score-100':
      return { current: stats.highestScore, target: 100, progress: Math.min((stats.highestScore / 100) * 100, 100) }
    case 'score-300':
      return { current: stats.highestScore, target: 300, progress: Math.min((stats.highestScore / 300) * 100, 100) }
    case 'combo-master':
      return { current: stats.highestCombo, target: 15, progress: Math.min((stats.highestCombo / 15) * 100, 100) }
    case 'hard-mode':
      return { current: stats.gamesWonHard, target: 5, progress: Math.min((stats.gamesWonHard / 5) * 100, 100) }
    case 'dedication':
      return { current: stats.totalGames, target: 50, progress: Math.min((stats.totalGames / 50) * 100, 100) }
    case 'legendary-player':
      return { current: stats.highestScore, target: 500, progress: Math.min((stats.highestScore / 500) * 100, 100) }
    default:
      return { current: 0, target: 1, progress: 0 }
  }
}

const formatProgressText = (achievement: Achievement, stats: PlayerStats, language: 'da' | 'en'): string => {
  const { current, target } = getAchievementProgress(achievement, stats)
  
  switch (achievement.id) {
    case 'first-game':
      return language === 'da' ? `${current}/${target} spil` : `${current}/${target} game`
    case 'score-100':
    case 'score-300':
    case 'legendary-player':
      return language === 'da' ? `${current}/${target} point` : `${current}/${target} points`
    case 'combo-master':
      return `${current}/${target}x combo`
    case 'hard-mode':
      return language === 'da' ? `${current}/${target} spil på svær` : `${current}/${target} games on hard`
    case 'dedication':
      return language === 'da' ? `${current}/${target} spil` : `${current}/${target} games`
    default:
      return `${current}/${target}`
  }
}

export function GameCorner({ onNavigateBack, userEmail }: GameCornerProps) {
  const { t, language } = useLanguage()
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover'>('menu')
  const [playerName, setPlayerName] = useState('')
  const [currentScore, setCurrentScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(30)
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [targets, setTargets] = useState<Target[]>([])
  const [combo, setCombo] = useState(0)
  const [highestCombo, setHighestCombo] = useState(0)
  const [highScores, setHighScores] = useKV<HighScore[]>('game-corner-highscores', [])
  const [playerAchievements, setPlayerAchievements] = useKV<PlayerAchievements>('game-corner-achievements', {})
  const [newlyUnlockedAchievements, setNewlyUnlockedAchievements] = useState<Achievement[]>([])
  const gameAreaRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<number | null>(null)
  const targetSpawnRef = useRef<number | null>(null)
  const isPlayingRef = useRef(false)
  
  const [usersData] = useKV<Record<string, { fullName: string }>>('users', {})
  const [userAvatarUrl, setUserAvatarUrl] = useState<string>('')
  
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userData = await window.spark.user()
        if (userData && userData.avatarUrl) {
          setUserAvatarUrl(userData.avatarUrl)
        }
      } catch (error) {
        console.error('Failed to fetch user data:', error)
      }
    }
    
    fetchUserData()
  }, [])
  
  useEffect(() => {
    if (usersData) {
      const currentUser = usersData[userEmail]
      if (currentUser?.fullName) {
        setPlayerName(currentUser.fullName)
      }
    }
  }, [usersData, userEmail])

  const spawnTarget = () => {
    if (!isPlayingRef.current || !gameAreaRef.current) return
    
    const rect = gameAreaRef.current.getBoundingClientRect()
    const padding = 60
    const settings = DIFFICULTY_SETTINGS[difficulty]
    
    const newTarget: Target = {
      id: Date.now().toString() + Math.random(),
      x: Math.random() * (rect.width - padding * 2) + padding,
      y: Math.random() * (rect.height - padding * 2) + padding,
    }
    
    setTargets([newTarget])
    
    targetSpawnRef.current = window.setTimeout(() => {
      if (isPlayingRef.current) {
        setTargets([])
        targetSpawnRef.current = window.setTimeout(() => {
          if (isPlayingRef.current) {
            spawnTarget()
          }
        }, 200)
      }
    }, settings.targetLifetime)
  }

  const getComboMultiplier = (comboCount: number): number => {
    if (comboCount < 3) return 1
    if (comboCount < 5) return 1.5
    if (comboCount < 10) return 2
    if (comboCount < 15) return 2.5
    return 3
  }

  const startGame = () => {
    const settings = DIFFICULTY_SETTINGS[difficulty]
    
    isPlayingRef.current = true
    setGameState('playing')
    setCurrentScore(0)
    setCombo(0)
    setHighestCombo(0)
    setTimeLeft(settings.timeLimit)
    setTargets([])
    
    timerRef.current = window.setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          endGame()
          return 0
        }
        return prev - 1
      })
    }, 1000)
    
    setTimeout(() => spawnTarget(), 500)
  }

  const hitTarget = (targetId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const settings = DIFFICULTY_SETTINGS[difficulty]
    
    setTargets(prev => prev.filter(t => t.id !== targetId))
    
    setCombo(prevCombo => {
      const newCombo = prevCombo + 1
      setHighestCombo(prev => Math.max(prev, newCombo))
      
      const multiplier = getComboMultiplier(newCombo)
      const pointsEarned = Math.round(settings.pointsPerTarget * multiplier)
      setCurrentScore(prev => prev + pointsEarned)
      
      return newCombo
    })
    
    if (targetSpawnRef.current) {
      clearTimeout(targetSpawnRef.current)
    }
    
    setTimeout(() => {
      if (isPlayingRef.current) {
        spawnTarget()
      }
    }, 100)
  }

  const handleGameAreaClick = () => {
    if (targets.length > 0) {
      const settings = DIFFICULTY_SETTINGS[difficulty]
      setCurrentScore(score => Math.max(0, score - settings.penaltyPoints))
      setCombo(0)
    }
  }

  const calculatePlayerStats = (email: string): PlayerStats => {
    const playerScores = (highScores || []).filter(hs => hs.playerEmail === email)
    const totalScore = playerScores.reduce((sum, hs) => sum + hs.score, 0)
    const highestScore = playerScores.length > 0 ? Math.max(...playerScores.map(hs => hs.score)) : 0
    
    return {
      totalGames: playerScores.length,
      totalScore,
      highestScore,
      highestCombo: highestCombo,
      averageScore: playerScores.length > 0 ? Math.round(totalScore / playerScores.length) : 0,
      gamesWonEasy: playerScores.filter(hs => hs.difficulty === 'easy').length,
      gamesWonMedium: playerScores.filter(hs => hs.difficulty === 'medium').length,
      gamesWonHard: playerScores.filter(hs => hs.difficulty === 'hard').length,
    }
  }

  const checkAndUnlockAchievements = (stats: PlayerStats) => {
    const currentAchievements = playerAchievements?.[userEmail] || {
      unlockedAchievements: [],
      selectedBorder: 'default',
      stats: stats,
    }

    const newlyUnlocked: Achievement[] = []

    ACHIEVEMENTS.forEach(achievement => {
      const isUnlocked = currentAchievements.unlockedAchievements.includes(achievement.id)
      const meetsCondition = achievement.condition(stats)

      if (!isUnlocked && meetsCondition) {
        newlyUnlocked.push(achievement)
      }
    })

    if (newlyUnlocked.length > 0) {
      setPlayerAchievements(current => ({
        ...current,
        [userEmail]: {
          ...currentAchievements,
          unlockedAchievements: [
            ...currentAchievements.unlockedAchievements,
            ...newlyUnlocked.map(a => a.id),
          ],
          stats,
        },
      }))

      setNewlyUnlockedAchievements(newlyUnlocked)
      
      newlyUnlocked.forEach(achievement => {
        const Icon = achievement.icon
        toast.success(
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Icon size={20} weight="fill" className="text-primary" />
            </div>
            <div>
              <div className="font-bold">{language === 'da' ? 'Præstation Låst Op!' : 'Achievement Unlocked!'}</div>
              <div className="text-sm">{achievement.name[language]}</div>
              <div className="text-xs text-muted-foreground">{language === 'da' ? '🎁 Ny avatar ramme!' : '🎁 New avatar frame!'}</div>
            </div>
          </div>,
          { duration: 5000 }
        )
      })
    }
  }

  const endGame = () => {
    isPlayingRef.current = false
    
    if (timerRef.current) {
      clearInterval(timerRef.current)
    }
    if (targetSpawnRef.current) {
      clearTimeout(targetSpawnRef.current)
    }
    
    setTargets([])
    
    setCurrentScore(finalScore => {
      const newHighScore: HighScore = {
        id: Date.now().toString(),
        playerName: playerName.trim(),
        score: finalScore,
        timestamp: Date.now(),
        playerEmail: userEmail,
        difficulty: difficulty,
      }
      
      setHighScores(currentScores => {
        const updated = [...(currentScores || []), newHighScore]
        return updated.sort((a, b) => b.score - a.score).slice(0, 150)
      })
      
      setTimeout(() => {
        const updatedStats = calculatePlayerStats(userEmail)
        updatedStats.highestCombo = Math.max(updatedStats.highestCombo || 0, highestCombo)
        updatedStats.highestScore = Math.max(updatedStats.highestScore || 0, finalScore)
        checkAndUnlockAchievements(updatedStats)
      }, 100)
      
      return finalScore
    })
    
    setGameState('gameover')
  }

  const resetGame = () => {
    isPlayingRef.current = false
    setGameState('menu')
    setCurrentScore(0)
    setTimeLeft(DIFFICULTY_SETTINGS[difficulty].timeLimit)
    setTargets([])
  }

  const sortedHighScores = (highScores || [])
    .slice()
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)

  const getScoresByDifficulty = (diff: Difficulty) => {
    return (highScores || [])
      .filter(score => score.difficulty === diff)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
  }

  const currentPlayerBestScore = (highScores || [])
    .filter(hs => hs.playerEmail === userEmail && hs.difficulty === difficulty)
    .sort((a, b) => b.score - a.score)[0]

  const currentPlayerStats = calculatePlayerStats(userEmail)
  const currentPlayerAchievements = playerAchievements?.[userEmail] || {
    unlockedAchievements: [],
    selectedBorder: 'default',
    stats: currentPlayerStats,
  }

  const unlockedBorders = ACHIEVEMENTS
    .filter(achievement => currentPlayerAchievements.unlockedAchievements.includes(achievement.id))
    .map(achievement => achievement.border)

  const availableBorders = [AVATAR_BORDERS[0], ...unlockedBorders]

  const nextAchievementToUnlock = ACHIEVEMENTS.find(achievement => {
    const isUnlocked = currentPlayerAchievements.unlockedAchievements.includes(achievement.id)
    return !isUnlocked
  })

  const nextAchievementProgress = nextAchievementToUnlock 
    ? getAchievementProgress(nextAchievementToUnlock, currentPlayerStats)
    : null

  const selectBorder = (borderId: string) => {
    setPlayerAchievements(current => ({
      ...current,
      [userEmail]: {
        ...currentPlayerAchievements,
        selectedBorder: borderId,
      },
    }))
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (targetSpawnRef.current) clearTimeout(targetSpawnRef.current)
    }
  }, [])

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute top-6 right-6 left-6 z-20">
        <div className="hidden sm:flex flex-row items-center justify-end gap-4 pb-12">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.05 }}
          >
            <Button
              onClick={onNavigateBack}
              variant="outline"
              size="lg"
              className="bg-background/80 backdrop-blur-sm hover:bg-background shadow-lg hover:shadow-xl transition-all duration-300 gap-2 font-semibold"
            >
              <X size={20} />
              {language === 'da' ? 'Luk' : 'Close'}
            </Button>
          </motion.div>
        </div>

        <div className="flex sm:hidden items-center justify-between gap-2 pb-12">
          <div className="flex items-center gap-2">
          </div>
          
          <div className="flex items-center gap-2">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 }}
            >
              <Button
                onClick={onNavigateBack}
                variant="outline"
                size="lg"
                className="bg-background/80 backdrop-blur-sm hover:bg-background shadow-lg hover:shadow-xl transition-all duration-300 gap-2 font-semibold px-4"
              >
                <X size={20} />
              </Button>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 pt-24 sm:pt-32 pb-12 sm:pb-20 max-w-7xl relative z-10">
        <motion.header 
          className="text-center mb-10 sm:mb-12"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex justify-center mb-4"
          >
            <Trophy size={64} weight="duotone" className="text-[oklch(0.70_0.18_90)]" />
          </motion.div>
          <motion.h1 
            className="text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-br from-[oklch(0.70_0.18_90)] via-[oklch(0.65_0.15_45)] to-[oklch(0.60_0.12_25)] bg-clip-text text-transparent mb-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            {language === 'da' ? 'Spil Hjørne' : 'Game Corner'}
          </motion.h1>
          <motion.p
            className="text-muted-foreground text-sm sm:text-base"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            {language === 'da' ? 'Konkurrér med dine kollegaer!' : 'Compete with your colleagues!'}
          </motion.p>
        </motion.header>

        <div className="flex items-center justify-center mb-8">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2 flex-col h-auto py-2">
                <div className="flex items-center gap-2">
                  <Medal size={20} weight="fill" />
                  {language === 'da' ? 'Præstationer' : 'Achievements'}
                  {currentPlayerAchievements.unlockedAchievements.length > 0 && (
                    <Badge variant="secondary" className="ml-1">
                      {currentPlayerAchievements.unlockedAchievements.length}
                    </Badge>
                  )}
                </div>
                {nextAchievementProgress && nextAchievementProgress.progress > 0 && nextAchievementProgress.progress < 100 && (
                  <div className="w-full mt-1">
                    <Progress value={nextAchievementProgress.progress} className="h-1" />
                  </div>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3 text-2xl">
                  <Medal size={28} weight="duotone" className="text-[oklch(0.70_0.18_90)]" />
                  {language === 'da' ? 'Præstationer & Avatar Rammer' : 'Achievements & Avatar Frames'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-6 mt-4">
                <div className="bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 p-4 rounded-lg border border-primary/20">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-sm">
                      {language === 'da' ? 'Samlet Fremskridt' : 'Overall Progress'}
                    </h4>
                    <div className="flex items-center gap-2">
                      <Badge variant="default" className="text-sm font-bold">
                        {currentPlayerAchievements.unlockedAchievements.length} / {ACHIEVEMENTS.length}
                      </Badge>
                      <Badge variant="secondary" className="text-sm">
                        {Math.round((currentPlayerAchievements.unlockedAchievements.length / ACHIEVEMENTS.length) * 100)}%
                      </Badge>
                    </div>
                  </div>
                  <Progress 
                    value={(currentPlayerAchievements.unlockedAchievements.length / ACHIEVEMENTS.length) * 100} 
                    className="h-3"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    {language === 'da' 
                      ? `${ACHIEVEMENTS.length - currentPlayerAchievements.unlockedAchievements.length} præstationer tilbage at låse op`
                      : `${ACHIEVEMENTS.length - currentPlayerAchievements.unlockedAchievements.length} achievements left to unlock`}
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Sparkle size={20} weight="fill" className="text-[oklch(0.70_0.18_90)]" />
                    {language === 'da' ? 'Vælg Din Avatar Ramme' : 'Select Your Avatar Frame'}
                  </h3>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                    {availableBorders.map(border => {
                      const isSelected = currentPlayerAchievements.selectedBorder === border.id
                      return (
                        <motion.button
                          key={border.id}
                          onClick={() => selectBorder(border.id)}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className={cn(
                            "p-4 rounded-lg border-2 transition-all flex flex-col items-center gap-2",
                            isSelected 
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-muted-foreground"
                          )}
                        >
                          <div className="relative">
                            <Avatar 
                              className={cn(
                                "w-16 h-16",
                                getAnimationStyle(border.animation)
                              )}
                              style={{
                                borderWidth: `${border.thickness}px`,
                                borderStyle: border.pattern || 'solid',
                                borderImage: border.gradient,
                                borderImageSlice: 1,
                                boxShadow: border.glow 
                                  ? `0 0 20px ${border.glow}`
                                  : undefined
                              }}
                            >
                              <AvatarImage src={getAvatarUrl(userEmail, userAvatarUrl, userEmail)} alt={playerName} />
                              <AvatarFallback className="text-sm font-bold">
                                {getInitials(playerName)}
                              </AvatarFallback>
                            </Avatar>
                          </div>
                          <div className="text-xs font-medium text-center">{border.name[language]}</div>
                          {isSelected && (
                            <Badge variant="default" className="text-xs">
                              {language === 'da' ? 'Valgt' : 'Selected'}
                            </Badge>
                          )}
                        </motion.button>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Trophy size={20} weight="fill" className="text-[oklch(0.70_0.18_90)]" />
                    {language === 'da' ? 'Dine Præstationer' : 'Your Achievements'}
                  </h3>
                  <div className="space-y-2">
                    {ACHIEVEMENTS.map(achievement => {
                      const isUnlocked = currentPlayerAchievements.unlockedAchievements.includes(achievement.id)
                      const Icon = achievement.icon
                      const progressData = getAchievementProgress(achievement, currentPlayerStats)
                      const progressText = formatProgressText(achievement, currentPlayerStats, language)
                      
                      return (
                        <div
                          key={achievement.id}
                          className={cn(
                            "p-4 rounded-lg border transition-all",
                            isUnlocked 
                              ? "border-primary/30 bg-gradient-to-r from-primary/5 to-transparent" 
                              : "border-border bg-muted/30"
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <div 
                              className={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                                isUnlocked ? "bg-primary/20" : "bg-muted"
                              )}
                            >
                              <Icon 
                                size={20} 
                                weight={isUnlocked ? "fill" : "regular"}
                                className={isUnlocked ? "text-primary" : "text-muted-foreground"}
                              />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <h4 className="font-semibold">{achievement.name[language]}</h4>
                                {isUnlocked ? (
                                  <Badge variant="outline" className="text-xs">
                                    ✓ {language === 'da' ? 'Låst op' : 'Unlocked'}
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="text-xs font-bold">
                                    {Math.round(progressData.progress)}%
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                {achievement.description[language]}
                              </p>
                              {!isUnlocked && (
                                <div className="mt-3 space-y-1">
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground font-medium">
                                      {language === 'da' ? 'Fremskridt' : 'Progress'}
                                    </span>
                                    <span className="font-bold text-foreground">
                                      {progressText}
                                    </span>
                                  </div>
                                  <Progress 
                                    value={progressData.progress} 
                                    className="h-2"
                                  />
                                  <div className="text-xs text-muted-foreground">
                                    {language === 'da' ? '🎁 Lås op: ' : '🎁 Unlock: '}
                                    {achievement.border.name[language]}
                                  </div>
                                </div>
                              )}
                              {isUnlocked && (
                                <div className="mt-2 text-xs text-primary font-medium">
                                  {language === 'da' ? '🎁 Ramme låst op: ' : '🎁 Frame unlocked: '}
                                  {achievement.border.name[language]}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div className="bg-muted/30 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2">{language === 'da' ? 'Din Statistik' : 'Your Stats'}</h4>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">{language === 'da' ? 'Spil Spillet:' : 'Games Played:'}</span>
                      <div className="font-bold">{currentPlayerStats.totalGames}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">{language === 'da' ? 'Højeste Score:' : 'Highest Score:'}</span>
                      <div className="font-bold">{currentPlayerStats.highestScore}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">{language === 'da' ? 'Højeste Combo:' : 'Highest Combo:'}</span>
                      <div className="font-bold">{currentPlayerStats.highestCombo}x</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">{language === 'da' ? 'Gennemsnit:' : 'Average:'}</span>
                      <div className="font-bold">{currentPlayerStats.averageScore}</div>
                    </div>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="p-8">
              {gameState === 'menu' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center space-y-6"
                >
                  <div className="flex justify-center">
                    <div 
                      className="w-24 h-24 rounded-full flex items-center justify-center"
                      style={{ 
                        background: `linear-gradient(135deg, ${DIFFICULTY_SETTINGS[difficulty].color}, oklch(0.65 0.26 340))` 
                      }}
                    >
                      <Target size={48} weight="duotone" className="text-white" />
                    </div>
                  </div>
                  
                  <div>
                    <h2 className="text-2xl font-bold mb-2">
                      {language === 'da' ? 'Hurtig Kliks' : 'Fast Clicks'}
                    </h2>
                    <p className="text-muted-foreground">
                      {language === 'da' 
                        ? 'Klik på målene så hurtigt som muligt!' 
                        : 'Click the targets as fast as you can!'}
                    </p>
                  </div>

                  <div className="max-w-sm mx-auto space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-3 block">
                        {language === 'da' ? 'Vælg sværhedsgrad' : 'Select difficulty'}
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['easy', 'medium', 'hard'] as Difficulty[]).map((level) => {
                          const settings = DIFFICULTY_SETTINGS[level]
                          return (
                            <motion.button
                              key={level}
                              onClick={() => setDifficulty(level)}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              className={cn(
                                "p-3 rounded-lg border-2 transition-all",
                                difficulty === level
                                  ? "border-current shadow-lg"
                                  : "border-border hover:border-muted-foreground"
                              )}
                              style={difficulty === level ? { 
                                borderColor: settings.color,
                                backgroundColor: `color-mix(in oklch, ${settings.color} 10%, transparent)`
                              } : {}}
                            >
                              <div className="font-bold text-sm mb-1">{settings.label[language]}</div>
                              <div className="text-xs text-muted-foreground">{settings.description[language]}</div>
                            </motion.button>
                          )
                        })}
                      </div>
                    </div>

                    {currentPlayerBestScore && (
                      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <Star size={16} weight="fill" style={{ color: DIFFICULTY_SETTINGS[difficulty].color }} />
                        {language === 'da' ? 'Din bedste: ' : 'Your best: '}
                        <span className="font-bold text-foreground">{currentPlayerBestScore.score}</span>
                      </div>
                    )}

                    <Button
                      onClick={startGame}
                      size="lg"
                      className="w-full hover:opacity-90"
                      style={{ 
                        background: `linear-gradient(90deg, ${DIFFICULTY_SETTINGS[difficulty].color}, oklch(0.65 0.26 340))` 
                      }}
                    >
                      <Lightning size={20} weight="fill" className="mr-2" />
                      {language === 'da' ? 'Start Spil' : 'Start Game'}
                    </Button>
                  </div>

                  <div className="pt-4 border-t space-y-2 text-sm text-muted-foreground">
                    <p className="font-medium">
                      {language === 'da' ? 'Sådan spiller du:' : 'How to play:'}
                    </p>
                    <ul className="text-left max-w-md mx-auto space-y-1">
                      <li>• {language === 'da' ? 'Klik på de farvede mål så hurtigt du kan' : 'Click the colored targets as fast as you can'}</li>
                      <li>• {language === 'da' 
                        ? `Hvert mål giver ${DIFFICULTY_SETTINGS[difficulty].pointsPerTarget} point` 
                        : `Each target gives ${DIFFICULTY_SETTINGS[difficulty].pointsPerTarget} points`}</li>
                      <li className="text-[oklch(0.65_0.15_140)] font-medium">• {language === 'da' 
                        ? 'Byg combo ved at ramme mål uden at fejle - få op til 3x point!' 
                        : 'Build combo by hitting targets without missing - get up to 3x points!'}</li>
                      <li>• {language === 'da' 
                        ? `Mål forsvinder efter ${DIFFICULTY_SETTINGS[difficulty].targetLifetime / 1000} sekunder (ingen straf)` 
                        : `Targets disappear after ${DIFFICULTY_SETTINGS[difficulty].targetLifetime / 1000} seconds (no penalty)`}</li>
                      <li className="text-destructive font-medium">• {language === 'da' 
                        ? `Klik ved siden af et mål: ${DIFFICULTY_SETTINGS[difficulty].penaltyPoints} point i straf & mister combo!` 
                        : `Click outside a target: ${DIFFICULTY_SETTINGS[difficulty].penaltyPoints} point penalty & lose combo!`}</li>
                      <li>• {language === 'da' 
                        ? `Du har ${DIFFICULTY_SETTINGS[difficulty].timeLimit} sekunder total` 
                        : `You have ${DIFFICULTY_SETTINGS[difficulty].timeLimit} seconds total`}</li>
                    </ul>
                  </div>
                </motion.div>
              )}

              {gameState === 'playing' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <div>
                        <div className="text-sm text-muted-foreground">
                          {language === 'da' ? 'Point' : 'Score'}
                        </div>
                        <div className="text-4xl font-bold text-[oklch(0.70_0.18_90)]">
                          {currentScore}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">
                          {language === 'da' ? 'Tid' : 'Time'}
                        </div>
                        <div className={cn(
                          "text-4xl font-bold",
                          timeLeft <= 5 ? "text-destructive animate-pulse" : "text-foreground"
                        )}>
                          {timeLeft}s
                        </div>
                      </div>
                      {combo > 0 && (
                        <motion.div
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          key={combo}
                          className="relative"
                        >
                          <div className="text-sm text-muted-foreground">
                            {language === 'da' ? 'Combo' : 'Combo'}
                          </div>
                          <div className="flex items-baseline gap-2">
                            <div 
                              className="text-4xl font-bold"
                              style={{ 
                                color: combo >= 15 ? 'oklch(0.65 0.26 340)' :
                                       combo >= 10 ? 'oklch(0.70 0.18 90)' :
                                       combo >= 5 ? 'oklch(0.65 0.15 140)' :
                                       combo >= 3 ? 'oklch(0.70 0.18 60)' :
                                       'var(--foreground)'
                              }}
                            >
                              {combo}x
                            </div>
                            <div className="text-xs font-medium text-muted-foreground">
                              {getComboMultiplier(combo).toFixed(1)}x {language === 'da' ? 'point' : 'pts'}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </div>
                    <Badge variant="outline" className="text-lg px-4 py-2">
                      {playerName}
                    </Badge>
                  </div>

                  <div
                    ref={gameAreaRef}
                    onClick={handleGameAreaClick}
                    className="relative w-full h-[500px] bg-gradient-to-br from-muted/30 to-muted/10 rounded-lg border-2 border-dashed border-border overflow-hidden"
                    style={{ cursor: 'crosshair' }}
                  >
                    <AnimatePresence>
                      {targets.map((target) => (
                        <motion.button
                          key={target.id}
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          exit={{ scale: 0, rotate: 180 }}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => hitTarget(target.id, e)}
                          className="absolute w-16 h-16 rounded-full shadow-lg flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2 hover:shadow-xl transition-shadow"
                          style={{
                            left: `${target.x}px`,
                            top: `${target.y}px`,
                            background: `linear-gradient(135deg, ${DIFFICULTY_SETTINGS[difficulty].color}, oklch(0.65 0.26 340))`,
                          }}
                        >
                          <Target size={32} weight="fill" className="text-white" />
                        </motion.button>
                      ))}
                    </AnimatePresence>

                    {targets.length === 0 && (
                      <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                        {language === 'da' ? 'Vent på næste mål...' : 'Waiting for next target...'}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {gameState === 'gameover' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center space-y-6"
                >
                  <div className="flex justify-center">
                    <motion.div
                      initial={{ rotate: -180, scale: 0 }}
                      animate={{ rotate: 0, scale: 1 }}
                      transition={{ type: 'spring', duration: 0.6 }}
                      className="w-32 h-32 rounded-full flex items-center justify-center"
                      style={{ 
                        background: `linear-gradient(135deg, ${DIFFICULTY_SETTINGS[difficulty].color}, oklch(0.65 0.26 340))` 
                      }}
                    >
                      <Trophy size={64} weight="duotone" className="text-white" />
                    </motion.div>
                  </div>

                  <div>
                    <h2 className="text-3xl font-bold mb-2">
                      {language === 'da' ? 'Spil Slut!' : 'Game Over!'}
                    </h2>
                    <p className="text-muted-foreground mb-4">
                      {language === 'da' ? 'Godt gået, ' : 'Well done, '}{playerName}!
                    </p>
                    <div className="text-6xl font-bold mb-2" style={{ color: DIFFICULTY_SETTINGS[difficulty].color }}>
                      {currentScore}
                    </div>
                    <div className="text-sm text-muted-foreground mb-4">
                      {language === 'da' ? 'point' : 'points'} • {DIFFICULTY_SETTINGS[difficulty].label[language]}
                    </div>
                    {highestCombo > 0 && (
                      <div className="flex items-center justify-center gap-2 text-sm">
                        <Lightning size={16} weight="fill" className="text-[oklch(0.70_0.18_90)]" />
                        <span className="text-muted-foreground">
                          {language === 'da' ? 'Højeste combo:' : 'Highest combo:'}
                        </span>
                        <span className="font-bold text-foreground">{highestCombo}x</span>
                      </div>
                    )}
                  </div>

                  {currentPlayerBestScore && currentScore > currentPlayerBestScore.score && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-full font-medium"
                      style={{ 
                        backgroundColor: `color-mix(in oklch, ${DIFFICULTY_SETTINGS[difficulty].color} 10%, transparent)`,
                        color: DIFFICULTY_SETTINGS[difficulty].color 
                      }}
                    >
                      <Crown size={20} weight="fill" />
                      {language === 'da' ? 'Ny personlig rekord!' : 'New personal record!'}
                    </motion.div>
                  )}

                  <div className="flex gap-3 justify-center pt-4">
                    <Button
                      onClick={resetGame}
                      size="lg"
                      className="hover:opacity-90"
                      style={{ 
                        background: `linear-gradient(90deg, ${DIFFICULTY_SETTINGS[difficulty].color}, oklch(0.65 0.26 340))` 
                      }}
                    >
                      <Lightning size={20} weight="fill" className="mr-2" />
                      {language === 'da' ? 'Spil Igen' : 'Play Again'}
                    </Button>
                    <Button
                      onClick={onNavigateBack}
                      size="lg"
                      variant="outline"
                    >
                      {language === 'da' ? 'Tilbage til Hub' : 'Back to Hub'}
                    </Button>
                  </div>
                </motion.div>
              )}
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[oklch(0.70_0.18_90)] to-[oklch(0.65_0.26_340)] flex items-center justify-center">
                  <Trophy size={20} weight="fill" className="text-white" />
                </div>
                <h3 className="text-xl font-bold">
                  {language === 'da' ? 'Topscorer' : 'Leaderboard'}
                </h3>
              </div>

              <Tabs defaultValue="easy" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-4">
                  {(['easy', 'medium', 'hard'] as Difficulty[]).map((level) => (
                    <TabsTrigger 
                      key={level} 
                      value={level}
                      className="text-xs"
                    >
                      {DIFFICULTY_SETTINGS[level].label[language]}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {(['easy', 'medium', 'hard'] as Difficulty[]).map((level) => {
                  const levelScores = getScoresByDifficulty(level)
                  const settings = DIFFICULTY_SETTINGS[level]

                  return (
                    <TabsContent key={level} value={level} className="mt-0">
                      {levelScores.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Medal size={48} weight="duotone" className="mx-auto mb-3 opacity-50" />
                          <p className="text-sm">
                            {language === 'da' 
                              ? 'Ingen scores endnu. Vær den første!' 
                              : 'No scores yet. Be the first!'}
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {levelScores.map((score, index) => {
                            const isCurrentPlayer = score.playerEmail === userEmail
                            const getRankIcon = () => {
                              if (index === 0) return <Crown size={20} weight="fill" style={{ color: settings.color }} />
                              if (index === 1) return <Medal size={20} weight="fill" className="text-[oklch(0.60_0.15_30)]" />
                              if (index === 2) return <Medal size={20} weight="fill" className="text-[oklch(0.50_0.10_50)]" />
                              return null
                            }

                            return (
                              <motion.div
                                key={score.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className={cn(
                                  "flex items-center gap-3 p-3 rounded-lg transition-colors",
                                  isCurrentPlayer 
                                    ? "border" 
                                    : "bg-muted/30 hover:bg-muted/50"
                                )}
                                style={isCurrentPlayer ? {
                                  backgroundColor: `color-mix(in oklch, ${settings.color} 10%, transparent)`,
                                  borderColor: `color-mix(in oklch, ${settings.color} 30%, transparent)`
                                } : {}}
                              >
                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-background text-sm font-bold shrink-0">
                                  {getRankIcon() || `#${index + 1}`}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className={cn(
                                    "font-medium truncate",
                                    isCurrentPlayer && "font-bold"
                                  )}
                                  style={isCurrentPlayer ? { color: settings.color } : {}}
                                  >
                                    {score.playerName}
                                    {isCurrentPlayer && (
                                      <span className="text-xs ml-2 opacity-70">
                                        ({language === 'da' ? 'dig' : 'you'})
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {new Date(score.timestamp).toLocaleDateString(language === 'da' ? 'da-DK' : 'en-US')}
                                  </div>
                                </div>
                                <div className="text-xl font-bold">
                                  {score.score}
                                </div>
                              </motion.div>
                            )
                          })}
                        </div>
                      )}
                    </TabsContent>
                  )
                })}
              </Tabs>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
