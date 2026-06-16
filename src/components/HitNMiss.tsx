import { useState, useEffect, useRef } from 'react'
import { Target, Trophy, X } from '@phosphor-icons/react'
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

const TARGET_LIFETIME = 2000
const MIN_DISTANCE_FROM_EDGE = 80
const TARGET_SIZE = 80

export function HitNMiss() {
  const { language } = useLanguage()
  const [isPlaying, setIsPlaying] = useState(false)
  const [score, setScore] = useState(0)
  const [misses, setMisses] = useState(0)
  const [target, setTarget] = useState<TargetData | null>(null)
  const [highScore, setHighScore] = useKV<number>('hit-n-miss-highscore', 0)
  const gameAreaRef = useRef<HTMLDivElement>(null)
  const targetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

    targetTimeoutRef.current = setTimeout(() => {
      console.log('Target expired - miss!')
      setMisses(prev => prev + 1)
      setScore(prev => Math.max(0, prev - 1))
      spawnTarget()
    }, TARGET_LIFETIME)
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
    setTimeout(() => spawnTarget(), 500)
  }

  const endGame = () => {
    setIsPlaying(false)
    if (targetTimeoutRef.current) {
      clearTimeout(targetTimeoutRef.current)
    }
    setTarget(null)
    
    if (score > (highScore || 0)) {
      setHighScore(score)
    }
  }

  useEffect(() => {
    return () => {
      if (targetTimeoutRef.current) {
        clearTimeout(targetTimeoutRef.current)
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
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-sm text-muted-foreground">
                {language === 'da' ? 'Højeste score' : 'High Score'}
              </div>
              <div className="text-2xl font-bold text-primary flex items-center gap-2">
                <Trophy size={24} weight="fill" />
                {highScore || 0}
              </div>
            </div>
          </div>
        </div>

        {!isPlaying && (
          <div className="text-center py-8">
            <Button onClick={startGame} size="lg" className="px-8">
              {language === 'da' ? 'Start spil' : 'Start Game'}
            </Button>
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
          {score > (highScore || 0) && (
            <p className="text-sm text-accent font-semibold">
              {language === 'da' ? '🎉 Ny højeste score!' : '🎉 New high score!'}
            </p>
          )}
        </Card>
      )}
    </div>
  )
}
