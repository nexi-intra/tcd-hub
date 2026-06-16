import { useState, useEffect, useRef } from 'react'
import { Target, Trophy, X, Timer, GraduationCap, Lightning, Speedometer, Fire } from '@phosphor-icons/react'
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

const DIFFICULTY_SETTINGS = {
  easy: {
    lifetime: 3000,
    label: { en: 'Easy', da: 'Let' },
    description: { en: '3s per target', da: '3s per mål' },
    icon: Speedometer,
    color: 'text-green-500'
  },
  medium: {
    lifetime: 2000,
    label: { en: 'Medium', da: 'Mellem' },
    description: { en: '2s per target', da: '2s per mål' },
    icon: Lightning,
    color: 'text-yellow-500'
  },
  hard: {
    lifetime: 1000,
    label: { en: 'Hard', da: 'Svær' },
    description: { en: '1s per target', da: '1s per mål' },
    icon: Fire,
    color: 'text-red-500'
  }
}

const MIN_DISTANCE_FROM_EDGE = 80
const TARGET_SIZE = 80
const TIMER_DURATION = 30

export function HitNMiss() {
  const { language } = useLanguage()
  const [gameMode, setGameMode] = useState<GameMode>('practice')
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [isPlaying, setIsPlaying] = useState(false)
  const [score, setScore] = useState(0)
  const [misses, setMisses] = useState(0)
  const [timeLeft, setTimeLeft] = useState(TIMER_DURATION)
  const [target, setTarget] = useState<TargetData | null>(null)
  const [highScoreTimerEasy, setHighScoreTimerEasy] = useKV<number>('hit-n-miss-highscore-timer-easy', 0)
  const [highScoreTimerMedium, setHighScoreTimerMedium] = useKV<number>('hit-n-miss-highscore-timer-medium', 0)
  const [highScoreTimerHard, setHighScoreTimerHard] = useKV<number>('hit-n-miss-highscore-timer-hard', 0)
  const gameAreaRef = useRef<HTMLDivElement>(null)
  const targetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

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

  const spawnTarget = () => {
    if (!gameAreaRef.current) return

    const rect = gameAreaRef.current.getBoundingClientRect()
    const maxX = rect.width - TARGET_SIZE - MIN_DISTANCE_FROM_EDGE
    const maxY = rect.height - TARGET_SIZE - MIN_DISTANCE_FROM_EDGE

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
      spawnTarget()
    }, targetLifetime)
  }

  const handleTargetClick = () => {
    console.log('Target hit!')
    if (targetTimeoutRef.current) {
      clearTimeout(targetTimeoutRef.current)
    }
    setScore(prev => prev + 10)
    spawnTarget()
  }

  const handleMissClick = () => {
    console.log('Clicked outside target - miss!')
    setMisses(prev => prev + 1)
    setScore(prev => Math.max(0, prev - 1))
  }

  const startGame = () => {
    setIsPlaying(true)
    setScore(0)
    setMisses(0)
    setTarget(null)
    setTimeLeft(TIMER_DURATION)
    
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
    setIsPlaying(false)
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
    }
  }, [])

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-primary/10">
              <Target size={32} weight="duotone" className="text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">
                {language === 'da' ? 'Træf N Fejl' : 'Hit N Miss'}
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
              <div className="text-center">
                <div className="text-sm text-muted-foreground">
                  {language === 'da' ? 'Højeste score' : 'High Score'}
                </div>
                <div className="text-2xl font-bold text-primary flex items-center gap-2">
                  <Trophy size={24} weight="fill" />
                  {getCurrentHighScore()}
                </div>
              </div>
            </div>
          )}
        </div>

        {!isPlaying && (
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
              <Button onClick={startGame} size="lg" className="px-8">
                {language === 'da' ? 'Start spil' : 'Start Game'}
              </Button>
            </div>
          </div>
        )}
      </Card>

      {isPlaying && (
        <Card className="p-0 overflow-hidden">
          <div className="bg-secondary/30 p-4 flex items-center justify-between border-b">
            <div className="flex items-center gap-6">
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">
                  {language === 'da' ? 'Point' : 'Score'}
                </div>
                <div className="text-3xl font-bold text-primary">{score}</div>
              </div>
              <div className="h-10 w-px bg-border" />
              <div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">
                  {language === 'da' ? 'Forbiede' : 'Misses'}
                </div>
                <div className="text-3xl font-bold text-destructive">{misses}</div>
              </div>
              {gameMode === 'timer' && (
                <>
                  <div className="h-10 w-px bg-border" />
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">
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
            className="relative bg-gradient-to-br from-background via-secondary/10 to-background"
            style={{ 
              height: '600px',
              cursor: 'crosshair',
              backgroundImage: `
                repeating-linear-gradient(
                  0deg,
                  transparent,
                  transparent 50px,
                  oklch(0.9 0.01 250 / 0.3) 50px,
                  oklch(0.9 0.01 250 / 0.3) 51px
                ),
                repeating-linear-gradient(
                  90deg,
                  transparent,
                  transparent 50px,
                  oklch(0.9 0.01 250 / 0.3) 50px,
                  oklch(0.9 0.01 250 / 0.3) 51px
                )
              `
            }}
          >
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
                  width: `${TARGET_SIZE}px`,
                  height: `${TARGET_SIZE}px`,
                  cursor: 'pointer'
                }}
              >
                <div className="relative w-full h-full">
                  <div className="absolute inset-0 rounded-full bg-destructive/20 animate-ping" />
                  <div className="absolute inset-0 rounded-full border-4 border-destructive bg-card shadow-lg flex items-center justify-center hover:scale-110 transition-transform">
                    <div className="absolute inset-2 rounded-full border-4 border-destructive/40" />
                    <div className="absolute inset-4 rounded-full border-4 border-destructive/60" />
                    <div className="absolute inset-6 rounded-full border-4 border-destructive/80" />
                    <div className="w-4 h-4 rounded-full bg-destructive" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {!isPlaying && score > 0 && (
        <Card className="p-6 text-center">
          <h3 className="text-xl font-bold mb-2">
            {language === 'da' ? 'Spil slut!' : 'Game Over!'}
          </h3>
          <p className="text-muted-foreground mb-4">
            {language === 'da' ? 'Din sidste score' : 'Your final score'}: <span className="text-2xl font-bold text-primary">{score}</span>
          </p>
          {gameMode === 'timer' && score > getCurrentHighScore() && (
            <p className="text-sm text-accent font-semibold">
              {language === 'da' ? '🎉 Ny højeste score!' : '🎉 New high score!'}
            </p>
          )}
        </Card>
      )}
    </div>
  )
}
