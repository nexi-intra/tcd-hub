import { useState, useEffect, useRef } from 'react'
import { Target, Trophy, X, Timer, GraduationCap, Lightning, Speedometer, Fire, Crown, Flame } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useKV } from '@github/spark/hooks'
import { useLanguage } from '@/contexts/LanguageContext'

interface Position {
  x: number
  y: number
}

interface TargetData {
  id: number
  position: Position
  spawnTime: number
}

type GameMode = 'practice' | 'timer'
type Difficulty = 'easy' | 'medium' | 'hard'
type GameState = 'menu' | 'countdown' | 'playing' | 'ended'

const DIFFICULTY_SETTINGS = {
  easy: {
    lifetime: 3000,
    targetSize: 280,
    label: { en: 'Easy', da: 'Let' },
    description: { en: '3s per target', da: '3s per mål' },
    icon: Speedometer,
    color: 'text-green-500'
  },
  medium: {
    lifetime: 2000,
    targetSize: 240,
    label: { en: 'Medium', da: 'Mellem' },
    description: { en: '2s per target', da: '2s per mål' },
    icon: Lightning,
    color: 'text-yellow-500'
  },
  hard: {
    lifetime: 1000,
    targetSize: 180,
    label: { en: 'Hard', da: 'Svær' },
    description: { en: '1s per target', da: '1s per mål' },
    icon: Fire,
    color: 'text-red-500'
  }
}

const MIN_DISTANCE_FROM_EDGE = 80
const TIMER_DURATION = 30
const COUNTDOWN_DURATION = 3

const STREAK_MILESTONES = [3, 5, 10, 15, 20]
const STREAK_BONUSES = [5, 10, 25, 50, 100]

export function HitNMiss() {
  const { language } = useLanguage()
  const [gameMode, setGameMode] = useState<GameMode>('practice')
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
  const [highScoreTimerEasy, setHighScoreTimerEasy] = useKV<number>('hit-n-miss-highscore-timer-easy', 0)
  const [highScoreTimerMedium, setHighScoreTimerMedium] = useKV<number>('hit-n-miss-highscore-timer-medium', 0)
  const [highScoreTimerHard, setHighScoreTimerHard] = useKV<number>('hit-n-miss-highscore-timer-hard', 0)
  const gameAreaRef = useRef<HTMLDivElement>(null)
  const targetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const getCurrentHighScore = () => {
    if (gameMode === 'timer') {
      if (difficulty === 'easy') return highScoreTimerEasy || 0
      if (difficulty === 'medium') return highScoreTimerMedium || 0
      return highScoreTimerHard || 0
    }
    return 0
  }

  const updateHighScore = (newScore: number) => {
    if (gameMode === 'timer') {
      if (difficulty === 'easy') setHighScoreTimerEasy(newScore)
      else if (difficulty === 'medium') setHighScoreTimerMedium(newScore)
      else setHighScoreTimerHard(newScore)
    }
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

    console.log('Spawn target at:', newTarget.position)
    setTarget(newTarget)

    const targetLifetime = DIFFICULTY_SETTINGS[difficulty].lifetime

    targetTimeoutRef.current = setTimeout(() => {
      console.log('Target expired - miss!')
      setMisses(prev => prev + 1)
      setScore(prev => Math.max(0, prev - 1))
      setHitStreak(0)
      spawnTarget()
    }, targetLifetime)
  }

  const handleTargetClick = () => {
    console.log('Target hit!')
    if (targetTimeoutRef.current) {
      clearTimeout(targetTimeoutRef.current)
    }
    
    const newStreak = hitStreak + 1
    setHitStreak(newStreak)
    
    if (newStreak > bestStreak) {
      setBestStreak(newStreak)
    }
    
    const basePoints = 10
    const streakBonus = checkStreakBonus(newStreak)
    const totalPoints = basePoints + streakBonus
    
    setScore(prev => prev + totalPoints)
    spawnTarget()
  }

  const handleMissClick = () => {
    console.log('Clicked outside target - miss!')
    setMisses(prev => prev + 1)
    setScore(prev => Math.max(0, prev - 1))
    setHitStreak(0)
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

    if (gameMode === 'timer') {
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
  }

  const endGame = () => {
    setGameState('ended')
    if (targetTimeoutRef.current) {
      clearTimeout(targetTimeoutRef.current)
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current)
    }
    setTarget(null)
    
    const currentHighScore = getCurrentHighScore()
    if (score > currentHighScore) {
      updateHighScore(score)
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
    }
  }, [])

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
          {gameMode === 'timer' && (
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
          )}
        </div>

        {gameState === 'menu' && (
          <div className="space-y-6">
            <div className="flex items-center justify-center gap-4">
              <Button 
                onClick={() => setGameMode('practice')}
                variant={gameMode === 'practice' ? 'default' : 'outline'}
                className="flex items-center gap-2 min-w-[140px]"
              >
                <GraduationCap size={20} weight="bold" />
                {language === 'da' ? 'Øvelse' : 'Practice'}
              </Button>
              <Button 
                onClick={() => setGameMode('timer')}
                variant={gameMode === 'timer' ? 'default' : 'outline'}
                className="flex items-center gap-2 min-w-[140px]"
              >
                <Timer size={20} weight="bold" />
                {language === 'da' ? '30 sekunder' : '30 seconds'}
              </Button>
            </div>

            <div className="space-y-3">
              <div className="text-center">
                <p className="text-sm font-semibold text-muted-foreground mb-3">
                  {language === 'da' ? 'Vælg sværhedsgrad' : 'Select Difficulty'}
                </p>
              </div>
              <div className="flex items-center justify-center gap-3">
                {(Object.keys(DIFFICULTY_SETTINGS) as Difficulty[]).map((diff) => {
                  const setting = DIFFICULTY_SETTINGS[diff]
                  const Icon = setting.icon
                  return (
                    <Button
                      key={diff}
                      onClick={() => setDifficulty(diff)}
                      variant={difficulty === diff ? 'default' : 'outline'}
                      className="flex flex-col items-center gap-2 h-auto py-3 px-4 min-w-[110px]"
                    >
                      <Icon size={24} weight="duotone" className={difficulty === diff ? '' : setting.color} />
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="font-semibold text-sm">
                          {setting.label[language as 'en' | 'da']}
                        </span>
                        <span className="text-xs opacity-80">
                          {setting.description[language as 'en' | 'da']}
                        </span>
                      </div>
                    </Button>
                  )
                })}
              </div>
            </div>
            
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-4">
                {gameMode === 'practice' 
                  ? (language === 'da' 
                    ? 'Øv dig uden tidspres. Ingen highscore, kun træning!' 
                    : 'Practice without time pressure. No highscore, just training!')
                  : (language === 'da' 
                    ? 'Du har 30 sekunder! Få den højeste score muligt.' 
                    : 'You have 30 seconds! Get the highest score possible.')}
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
        <Card className="p-0 overflow-hidden border-2 border-primary/20">
          <div className="bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 p-4 flex items-center justify-between border-b-2 border-primary/20">
            <div className="flex items-center gap-6">
              <div className="px-4 py-2 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30">
                <div className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
                  {language === 'da' ? 'Point' : 'Score'}
                </div>
                <div className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  {score}
                </div>
              </div>
              <div className="h-10 w-px bg-border" />
              <div className="px-4 py-2 rounded-lg bg-gradient-to-br from-destructive/10 to-destructive/20 border border-destructive/30">
                <div className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
                  {language === 'da' ? 'Forbiede' : 'Misses'}
                </div>
                <div className="text-3xl font-bold text-destructive">{misses}</div>
              </div>
              <div className="h-10 w-px bg-border" />
              <div className="px-4 py-2 rounded-lg bg-gradient-to-br from-accent/10 to-accent/20 border border-accent/30">
                <div className="text-xs text-muted-foreground uppercase tracking-wide font-semibold flex items-center gap-1">
                  <Flame size={14} weight="fill" />
                  {language === 'da' ? 'Serie' : 'Streak'}
                </div>
                <div className={`text-3xl font-bold ${hitStreak >= 5 ? 'text-accent animate-pulse' : 'text-accent'}`}>
                  {hitStreak}
                </div>
              </div>
              {gameMode === 'timer' && (
                <>
                  <div className="h-10 w-px bg-border" />
                  <div className="px-4 py-2 rounded-lg bg-gradient-to-br from-primary/10 to-primary/20 border border-primary/30">
                    <div className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
                      {language === 'da' ? 'Tid tilbage' : 'Time Left'}
                    </div>
                    <div className={`text-3xl font-bold ${timeLeft <= 5 ? 'text-destructive animate-pulse' : 'text-accent'}`}>
                      {timeLeft}s
                    </div>
                  </div>
                </>
              )}
            </div>
            <Button onClick={endGame} variant="destructive" size="sm">
              <X size={16} weight="bold" className="mr-2" />
              {language === 'da' ? 'Afslut spil' : 'End Game'}
            </Button>
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
            {showStreakBonus && (
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 animate-in zoom-in-50 fade-in duration-300">
                <div className="text-center px-8 py-4 rounded-2xl bg-gradient-to-r from-accent via-primary to-accent shadow-2xl border-4 border-accent/30">
                  <div className="text-sm font-bold text-accent-foreground uppercase tracking-wider flex items-center gap-2 justify-center">
                    <Flame size={20} weight="fill" />
                    {language === 'da' ? 'Serie bonus' : 'Streak Bonus'}
                  </div>
                  <div className="text-5xl font-bold text-accent-foreground mt-1">
                    +{showStreakBonus.amount}
                  </div>
                  <div className="text-sm text-accent-foreground/90 mt-1">
                    {showStreakBonus.milestone} {language === 'da' ? 'træffere i træk!' : 'hits in a row!'}
                  </div>
                </div>
              </div>
            )}
            
            {target && (
              <div
                onClick={(e) => {
                  e.stopPropagation()
                  handleTargetClick()
                }}
                className="absolute animate-in zoom-in-50 duration-300"
                style={{
                  left: `${target.position.x}px`,
                  top: `${target.position.y}px`,
                  width: `${DIFFICULTY_SETTINGS[difficulty].targetSize}px`,
                  height: `${DIFFICULTY_SETTINGS[difficulty].targetSize}px`,
                  cursor: 'pointer'
                }}
              >
                <div className="relative w-full h-full">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-destructive via-red-500 to-destructive/80 animate-ping opacity-30" />
                  <div className="absolute inset-0 rounded-full border-4 border-destructive bg-gradient-to-br from-card via-white to-card shadow-2xl flex items-center justify-center hover:scale-110 transition-transform">
                    <div className="absolute inset-2 rounded-full border-4 border-destructive/40" />
                    <div className="absolute inset-4 rounded-full border-4 border-destructive/60" />
                    <div className="absolute inset-6 rounded-full border-4 border-destructive/80 bg-gradient-to-br from-destructive/5 to-destructive/10" />
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-destructive to-red-600 shadow-lg" />
                  </div>
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
          {gameMode === 'timer' && score > getCurrentHighScore() && (
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
              {language === 'da' ? 'Resultattavle' : 'Leaderboard'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {language === 'da' ? 'Bedste scores gennem tiderne' : 'All-time best scores'}
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {(Object.keys(DIFFICULTY_SETTINGS) as Difficulty[]).map((diff) => {
            const setting = DIFFICULTY_SETTINGS[diff]
            const Icon = setting.icon
            let bestScore = 0
            if (diff === 'easy') bestScore = highScoreTimerEasy || 0
            else if (diff === 'medium') bestScore = highScoreTimerMedium || 0
            else bestScore = highScoreTimerHard || 0

            const isTopScore = bestScore > 0 && (
              (diff === 'easy' && bestScore >= (highScoreTimerMedium || 0) && bestScore >= (highScoreTimerHard || 0)) ||
              (diff === 'medium' && bestScore >= (highScoreTimerEasy || 0) && bestScore >= (highScoreTimerHard || 0)) ||
              (diff === 'hard' && bestScore >= (highScoreTimerEasy || 0) && bestScore >= (highScoreTimerMedium || 0))
            )

            return (
              <div 
                key={diff}
                className={`relative p-4 rounded-lg transition-all ${
                  isTopScore 
                    ? 'border-2 border-accent bg-gradient-to-br from-accent/10 to-primary/10 shadow-lg' 
                    : 'border-2 border-border bg-gradient-to-br from-card to-muted/20'
                }`}
              >
                {isTopScore && (
                  <div className="absolute -top-3 -right-3 p-2 rounded-full bg-gradient-to-br from-accent to-primary shadow-lg">
                    <Crown size={20} weight="fill" className="text-accent-foreground" />
                  </div>
                )}
                <div className="flex items-center gap-3 mb-3">
                  <div className={`p-2 rounded-lg ${
                    diff === 'easy' ? 'bg-gradient-to-br from-green-500/20 to-green-600/20' :
                    diff === 'medium' ? 'bg-gradient-to-br from-yellow-500/20 to-yellow-600/20' :
                    'bg-gradient-to-br from-red-500/20 to-red-600/20'
                  }`}>
                    <Icon size={24} weight="duotone" className={setting.color} />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-sm">
                      {setting.label[language as 'en' | 'da']}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {setting.description[language as 'en' | 'da']}
                    </div>
                  </div>
                </div>
                <div className="text-center py-3">
                  <div className="text-3xl font-bold text-primary flex items-center justify-center gap-2">
                    {bestScore > 0 ? (
                      <>
                        <Trophy size={24} weight="fill" className="text-accent" />
                        {bestScore}
                      </>
                    ) : (
                      <span className="text-muted-foreground text-xl">
                        {language === 'da' ? 'Ingen score endnu' : 'No score yet'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {(highScoreTimerEasy || 0) === 0 && (highScoreTimerMedium || 0) === 0 && (highScoreTimerHard || 0) === 0 && (
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              {language === 'da' 
                ? 'Spil et spil i timer-tilstand for at sætte din første rekord!' 
                : 'Play a game in timer mode to set your first record!'}
            </p>
          </div>
        )}
      </Card>
    </div>
  )
}
