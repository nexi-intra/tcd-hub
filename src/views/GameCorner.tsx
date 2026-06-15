import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'
import { X, Trophy, Target, Lightning, Crown, Medal, Star } from '@phosphor-icons/react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useKV } from '@github/spark/hooks'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/contexts/LanguageContext'

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
}

interface Target {
  id: string
  x: number
  y: number
}

export function GameCorner({ onNavigateBack, userEmail }: GameCornerProps) {
  const { t, language } = useLanguage()
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover'>('menu')
  const [playerName, setPlayerName] = useState('')
  const [currentScore, setCurrentScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(30)
  const [targets, setTargets] = useState<Target[]>([])
  const [highScores, setHighScores] = useKV<HighScore[]>('game-corner-highscores', [])
  const gameAreaRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<number | null>(null)
  const targetSpawnRef = useRef<number | null>(null)
  const isPlayingRef = useRef(false)
  
  const [usersData] = useKV<Record<string, { fullName: string }>>('users', {})
  
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
    }, 1500)
  }

  const startGame = () => {
    if (!playerName.trim()) return
    
    isPlayingRef.current = true
    setGameState('playing')
    setCurrentScore(0)
    setTimeLeft(30)
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

  const hitTarget = (targetId: string) => {
    setTargets(prev => prev.filter(t => t.id !== targetId))
    setCurrentScore(prev => prev + 10)
    
    if (targetSpawnRef.current) {
      clearTimeout(targetSpawnRef.current)
    }
    
    setTimeout(() => {
      if (isPlayingRef.current) {
        spawnTarget()
      }
    }, 100)
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
      }
      
      setHighScores(currentScores => {
        const updated = [...(currentScores || []), newHighScore]
        return updated.sort((a, b) => b.score - a.score).slice(0, 50)
      })
      
      return finalScore
    })
    
    setGameState('gameover')
  }

  const resetGame = () => {
    isPlayingRef.current = false
    setGameState('menu')
    setCurrentScore(0)
    setTimeLeft(30)
    setTargets([])
  }

  const sortedHighScores = (highScores || [])
    .slice()
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)

  const currentPlayerBestScore = (highScores || [])
    .filter(hs => hs.playerEmail === userEmail)
    .sort((a, b) => b.score - a.score)[0]

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (targetSpawnRef.current) clearTimeout(targetSpawnRef.current)
    }
  }, [])

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Button
                onClick={onNavigateBack}
                variant="ghost"
                size="icon"
                className="rounded-full"
              >
                <X size={24} />
              </Button>
            </motion.div>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <Trophy size={32} weight="duotone" className="text-[oklch(0.70_0.18_90)]" />
                {language === 'da' ? 'Spil Hjørne' : 'Game Corner'}
              </h1>
              <p className="text-muted-foreground mt-1">
                {language === 'da' ? 'Konkurrér med dine kollegaer!' : 'Compete with your colleagues!'}
              </p>
            </div>
          </div>
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
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[oklch(0.70_0.18_90)] to-[oklch(0.65_0.26_340)] flex items-center justify-center">
                      <Target size={48} weight="duotone" className="text-white" />
                    </div>
                  </div>
                  
                  <div>
                    <h2 className="text-2xl font-bold mb-2">
                      {language === 'da' ? 'Hurtig Kliks' : 'Fast Clicks'}
                    </h2>
                    <p className="text-muted-foreground">
                      {language === 'da' 
                        ? 'Klik på målene så hurtigt som muligt! Du har 30 sekunder.' 
                        : 'Click the targets as fast as you can! You have 30 seconds.'}
                    </p>
                  </div>

                  <div className="max-w-sm mx-auto space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        {language === 'da' ? 'Dit navn' : 'Your name'}
                      </label>
                      <Input
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                        placeholder={language === 'da' ? 'Indtast dit navn' : 'Enter your name'}
                        onKeyDown={(e) => e.key === 'Enter' && startGame()}
                      />
                    </div>

                    {currentPlayerBestScore && (
                      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <Star size={16} weight="fill" className="text-[oklch(0.70_0.18_90)]" />
                        {language === 'da' ? 'Din bedste: ' : 'Your best: '}
                        <span className="font-bold text-foreground">{currentPlayerBestScore.score}</span>
                      </div>
                    )}

                    <Button
                      onClick={startGame}
                      disabled={!playerName.trim()}
                      size="lg"
                      className="w-full bg-gradient-to-r from-[oklch(0.70_0.18_90)] to-[oklch(0.65_0.26_340)] hover:opacity-90"
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
                      <li>• {language === 'da' ? 'Klik på de orange mål så hurtigt du kan' : 'Click the orange targets as fast as you can'}</li>
                      <li>• {language === 'da' ? 'Hvert mål giver 10 point' : 'Each target gives 10 points'}</li>
                      <li>• {language === 'da' ? 'Mål forsvinder efter 1,5 sekunder' : 'Targets disappear after 1.5 seconds'}</li>
                      <li>• {language === 'da' ? 'Du har 30 sekunder total' : 'You have 30 seconds total'}</li>
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
                    </div>
                    <Badge variant="outline" className="text-lg px-4 py-2">
                      {playerName}
                    </Badge>
                  </div>

                  <div
                    ref={gameAreaRef}
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
                          onClick={() => hitTarget(target.id)}
                          className="absolute w-16 h-16 rounded-full bg-gradient-to-br from-[oklch(0.70_0.18_90)] to-[oklch(0.65_0.26_340)] shadow-lg flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2 hover:shadow-xl transition-shadow"
                          style={{
                            left: `${target.x}px`,
                            top: `${target.y}px`,
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
                      className="w-32 h-32 rounded-full bg-gradient-to-br from-[oklch(0.70_0.18_90)] to-[oklch(0.65_0.26_340)] flex items-center justify-center"
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
                    <div className="text-6xl font-bold text-[oklch(0.70_0.18_90)] mb-2">
                      {currentScore}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {language === 'da' ? 'point' : 'points'}
                    </div>
                  </div>

                  {currentPlayerBestScore && currentScore > currentPlayerBestScore.score && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[oklch(0.70_0.18_90)]/10 text-[oklch(0.70_0.18_90)] font-medium"
                    >
                      <Crown size={20} weight="fill" />
                      {language === 'da' ? 'Ny personlig rekord!' : 'New personal record!'}
                    </motion.div>
                  )}

                  <div className="flex gap-3 justify-center pt-4">
                    <Button
                      onClick={resetGame}
                      size="lg"
                      className="bg-gradient-to-r from-[oklch(0.70_0.18_90)] to-[oklch(0.65_0.26_340)] hover:opacity-90"
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

              {sortedHighScores.length === 0 ? (
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
                  {sortedHighScores.map((score, index) => {
                    const isCurrentPlayer = score.playerEmail === userEmail
                    const getRankIcon = () => {
                      if (index === 0) return <Crown size={20} weight="fill" className="text-[oklch(0.70_0.18_90)]" />
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
                            ? "bg-[oklch(0.70_0.18_90)]/10 border border-[oklch(0.70_0.18_90)]/30" 
                            : "bg-muted/30 hover:bg-muted/50"
                        )}
                      >
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-background text-sm font-bold">
                          {getRankIcon() || `#${index + 1}`}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={cn(
                            "font-medium truncate",
                            isCurrentPlayer && "text-[oklch(0.70_0.18_90)]"
                          )}>
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
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
