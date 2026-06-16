import { motion } from 'framer-motion'
import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Lightning, Target } from '@phosphor-icons/react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useKV } from '@github/spark/hooks'
import { Badge } from '@/components/ui/badge'

interface GameCornerProps {
  onNavigateBack: () => void
}

type Difficulty = 'easy' | 'medium' | 'hard' | 'expert'

interface FastClicksScore {
  score: number
  timestamp: number
  playerName: string
  difficulty: Difficulty
  hits: number
  misses: number
}

interface TargetPosition {
  x: number
  y: number
  id: number
}

export function GameCorner({ onNavigateBack }: GameCornerProps) {
  const [selectedGame, setSelectedGame] = useState<string | null>(null)

  if (selectedGame === 'fast-clicks') {
    return <FastClicksGame onBack={() => setSelectedGame(null)} onNavigateBack={onNavigateBack} />
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8 max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Button
            onClick={onNavigateBack}
            variant="outline"
            className="mb-6 gap-2 hover:gap-3 transition-all"
          >
            <ArrowLeft size={20} weight="bold" />
            Tilbage til Hub
          </Button>

          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-br from-[oklch(0.72_0.20_310)] via-[oklch(0.68_0.22_280)] to-[oklch(0.72_0.20_310)] bg-clip-text text-transparent">
            Spil Hjørnet
          </h1>
          <p className="text-lg text-muted-foreground">
            Tag en pause og nyd nogle sjove spil!
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            whileHover={{ y: -8, transition: { duration: 0.2 } }}
          >
            <Card
              className="p-6 cursor-pointer border-2 hover:border-primary/50 transition-all bg-gradient-to-br from-card to-[oklch(0.72_0.20_310/0.05)] overflow-hidden relative group"
              onClick={() => setSelectedGame('fast-clicks')}
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-br from-[oklch(0.72_0.20_310/0.1)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
                initial={false}
              />
              
              <div className="relative z-10">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[oklch(0.72_0.20_310)] to-[oklch(0.68_0.22_280)] flex items-center justify-center mb-4 shadow-lg">
                  <Lightning size={32} weight="duotone" className="text-white" />
                </div>
                
                <h3 className="text-2xl font-bold mb-2 text-foreground">Fast Clicks</h3>
                <p className="text-muted-foreground mb-4">
                  Rammer de bevægende mål! Test din præcision og reflekshastighed!
                </p>
                
                <div className="flex items-center gap-2 text-sm text-primary font-semibold">
                  <span>Spil nu</span>
                  <motion.div
                    animate={{ x: [0, 5, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    →
                  </motion.div>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

const difficultyConfig = {
  easy: {
    label: 'Easy',
    targetSize: 80,
    targetLifetime: 2500,
    spawnDelay: 1500,
    hitPoints: 10,
    missPoints: -3,
    gameDuration: 30,
    color: 'from-green-500 to-green-600',
  },
  medium: {
    label: 'Medium',
    targetSize: 60,
    targetLifetime: 2000,
    spawnDelay: 1200,
    hitPoints: 15,
    missPoints: -5,
    gameDuration: 30,
    color: 'from-blue-500 to-blue-600',
  },
  hard: {
    label: 'Hard',
    targetSize: 50,
    targetLifetime: 1500,
    spawnDelay: 900,
    hitPoints: 20,
    missPoints: -7,
    gameDuration: 30,
    color: 'from-orange-500 to-orange-600',
  },
  expert: {
    label: 'Ekspert',
    targetSize: 40,
    targetLifetime: 1200,
    spawnDelay: 700,
    hitPoints: 25,
    missPoints: -10,
    gameDuration: 30,
    color: 'from-red-500 to-red-600',
  },
}

function FastClicksGame({ onBack, onNavigateBack }: { onBack: () => void; onNavigateBack: () => void }) {
  const [gameState, setGameState] = useState<'select' | 'playing' | 'finished'>('select')
  const [difficulty, setDifficulty] = useState<Difficulty>('easy')
  const [viewingDifficulty, setViewingDifficulty] = useState<Difficulty>('easy')
  const [score, setScore] = useState(0)
  const [hits, setHits] = useState(0)
  const [misses, setMisses] = useState(0)
  const [timeLeft, setTimeLeft] = useState(30)
  const [targets, setTargets] = useState<TargetPosition[]>([])
  const [highScores, setHighScores] = useKV<FastClicksScore[]>('fast-clicks-target-scores', [])
  const gameAreaRef = useRef<HTMLDivElement>(null)
  const nextTargetId = useRef(0)
  const spawnTimerRef = useRef<number | null>(null)
  const gameTimerRef = useRef<number | null>(null)
  const targetTimersRef = useRef<Map<number, number>>(new Map())

  const config = difficultyConfig[difficulty]

  useEffect(() => {
    return () => {
      if (spawnTimerRef.current) clearTimeout(spawnTimerRef.current)
      if (gameTimerRef.current) clearInterval(gameTimerRef.current)
      targetTimersRef.current.forEach(timer => clearTimeout(timer))
    }
  }, [])

  const spawnTarget = () => {
    if (!gameAreaRef.current || gameState !== 'playing') return

    const area = gameAreaRef.current
    const areaWidth = area.offsetWidth
    const areaHeight = area.offsetHeight
    const margin = config.targetSize / 2 + 10
    
    const x = Math.random() * (areaWidth - margin * 2) + margin
    const y = Math.random() * (areaHeight - margin * 2) + margin
    
    const targetId = nextTargetId.current++
    
    setTargets(prev => [...prev, { x, y, id: targetId }])
    
    const timer = window.setTimeout(() => {
      setTargets(prev => prev.filter(t => t.id !== targetId))
      targetTimersRef.current.delete(targetId)
    }, config.targetLifetime)
    
    targetTimersRef.current.set(targetId, timer)
    
    spawnTimerRef.current = window.setTimeout(spawnTarget, config.spawnDelay)
  }

  const startGame = (selectedDifficulty: Difficulty) => {
    setDifficulty(selectedDifficulty)
    setScore(0)
    setHits(0)
    setMisses(0)
    setTimeLeft(difficultyConfig[selectedDifficulty].gameDuration)
    setTargets([])
    setGameState('playing')
    nextTargetId.current = 0
    
    setTimeout(() => spawnTarget(), 500)
    
    gameTimerRef.current = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          endGame()
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const endGame = () => {
    setGameState('finished')
    setTargets([])
    if (spawnTimerRef.current) clearTimeout(spawnTimerRef.current)
    if (gameTimerRef.current) clearInterval(gameTimerRef.current)
    targetTimersRef.current.forEach(timer => clearTimeout(timer))
    targetTimersRef.current.clear()
  }

  const handleTargetClick = (targetId: number) => {
    setTargets(prev => prev.filter(t => t.id !== targetId))
    setScore(prev => prev + config.hitPoints)
    setHits(prev => prev + 1)
    
    const timer = targetTimersRef.current.get(targetId)
    if (timer) {
      clearTimeout(timer)
      targetTimersRef.current.delete(targetId)
    }
  }

  const handleMissClick = () => {
    setScore(prev => Math.max(0, prev + config.missPoints))
    setMisses(prev => prev + 1)
  }

  const saveScore = () => {
    const newScore: FastClicksScore = {
      score,
      timestamp: Date.now(),
      playerName: 'Player',
      difficulty,
      hits,
      misses,
    }

    setHighScores((currentScores) => {
      const updated = [...(currentScores || []), newScore]
        .sort((a, b) => b.score - a.score)
        .slice(0, 50)
      return updated
    })
  }

  const resetGame = () => {
    if (gameState === 'finished' && score > 0) {
      saveScore()
    }
    setGameState('select')
    setScore(0)
    setHits(0)
    setMisses(0)
    setTimeLeft(30)
    setTargets([])
  }

  const filteredHighScores = (highScores || [])
    .filter(s => s.difficulty === viewingDifficulty)
    .slice(0, 10)

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-6 py-8 max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Button
            onClick={onNavigateBack}
            variant="outline"
            className="mb-6 gap-2 hover:gap-3 transition-all"
          >
            <ArrowLeft size={20} weight="bold" />
            Tilbage til Hub
          </Button>

          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-5xl font-bold mb-2 bg-gradient-to-br from-[oklch(0.72_0.20_310)] via-[oklch(0.68_0.22_280)] to-[oklch(0.72_0.20_310)] bg-clip-text text-transparent">
                Fast Clicks
              </h1>
              <p className="text-lg text-muted-foreground">
                Rammer de bevægende mål!
              </p>
            </div>
            <Button
              onClick={onBack}
              variant="ghost"
              className="gap-2"
            >
              ← Tilbage til spil
            </Button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="p-8 border-2">
                <div className="flex flex-col items-center justify-center min-h-[500px]">
                  {gameState === 'select' && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center w-full"
                    >
                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[oklch(0.72_0.20_310)] to-[oklch(0.68_0.22_280)] flex items-center justify-center mb-6 mx-auto shadow-2xl">
                        <Target size={48} weight="duotone" className="text-white" />
                      </div>
                      <h2 className="text-3xl font-bold mb-4">Vælg Sværhedsgrad</h2>
                      <p className="text-muted-foreground mb-8 max-w-md">
                        Rammer så mange bevægende mål som muligt! Pas på ikke at ramme forbi!
                      </p>
                      
                      <div className="grid grid-cols-2 gap-4 max-w-xl mx-auto">
                        {(Object.keys(difficultyConfig) as Difficulty[]).map((diff) => (
                          <Button
                            key={diff}
                            size="lg"
                            onClick={() => startGame(diff)}
                            className={`bg-gradient-to-r ${difficultyConfig[diff].color} hover:opacity-90 text-white text-lg px-8 py-6 shadow-xl flex flex-col gap-2 h-auto`}
                          >
                            <span className="text-xl font-bold">{difficultyConfig[diff].label}</span>
                            <span className="text-xs opacity-90">+{difficultyConfig[diff].hitPoints} per træf</span>
                            <span className="text-xs opacity-90">{difficultyConfig[diff].missPoints} per miss</span>
                          </Button>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {gameState === 'playing' && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="w-full h-full"
                    >
                      <div className="mb-6 flex items-center justify-between">
                        <div className="flex gap-4">
                          <div className="text-center">
                            <div className="text-4xl font-bold text-foreground">{score}</div>
                            <div className="text-sm text-muted-foreground">Score</div>
                          </div>
                          <div className="text-center">
                            <div className="text-4xl font-bold text-green-600">{hits}</div>
                            <div className="text-sm text-muted-foreground">Træf</div>
                          </div>
                          <div className="text-center">
                            <div className="text-4xl font-bold text-red-600">{misses}</div>
                            <div className="text-sm text-muted-foreground">Misses</div>
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-4xl font-bold text-foreground">{timeLeft}</div>
                          <div className="text-sm text-muted-foreground">sekunder</div>
                        </div>
                      </div>
                      
                      <Progress value={(timeLeft / config.gameDuration) * 100} className="h-2 mb-6" />

                      <div
                        ref={gameAreaRef}
                        onClick={handleMissClick}
                        className="relative w-full h-[400px] bg-gradient-to-br from-muted/50 to-muted/20 rounded-xl border-2 border-border overflow-hidden cursor-crosshair"
                      >
                        {targets.map((target) => (
                          <motion.button
                            key={target.id}
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            exit={{ scale: 0 }}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleTargetClick(target.id)
                            }}
                            style={{
                              position: 'absolute',
                              left: target.x - config.targetSize / 2,
                              top: target.y - config.targetSize / 2,
                              width: config.targetSize,
                              height: config.targetSize,
                            }}
                            className={`rounded-full bg-gradient-to-br ${config.color} hover:opacity-80 shadow-2xl cursor-pointer transition-opacity flex items-center justify-center border-4 border-white z-10`}
                          >
                            <Target size={config.targetSize * 0.5} weight="bold" className="text-white" />
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {gameState === 'finished' && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-center"
                    >
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1, rotate: [0, 10, -10, 0] }}
                        transition={{ delay: 0.2, type: 'spring' }}
                        className="text-8xl mb-4"
                      >
                        {score > 0 ? '🎉' : '😅'}
                      </motion.div>
                      <h2 className="text-3xl font-bold mb-2">Spil Slut!</h2>
                      <Badge className={`mb-4 bg-gradient-to-r ${config.color} text-white`}>
                        {config.label}
                      </Badge>
                      <div className="text-6xl font-bold mb-4 bg-gradient-to-br from-primary to-accent bg-clip-text text-transparent">
                        {score}
                      </div>
                      <div className="text-muted-foreground mb-2">point i alt</div>
                      <div className="flex gap-8 justify-center mb-8 text-lg">
                        <div>
                          <span className="font-bold text-green-600">{hits}</span> træf
                        </div>
                        <div>
                          <span className="font-bold text-red-600">{misses}</span> misses
                        </div>
                      </div>
                      <Button
                        size="lg"
                        onClick={resetGame}
                        className="bg-gradient-to-r from-[oklch(0.72_0.20_310)] to-[oklch(0.68_0.22_280)] hover:from-[oklch(0.70_0.20_310)] hover:to-[oklch(0.66_0.22_280)] text-white text-lg px-8 py-6"
                      >
                        Spil igen
                      </Button>
                    </motion.div>
                  )}
                </div>
              </Card>
            </motion.div>
          </div>

          <div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="p-6 border-2">
                <h3 className="text-2xl font-bold mb-4 text-foreground">🏆 Topscorer</h3>
                <div className="mb-4 space-y-3">
                  <p className="text-sm text-muted-foreground">Vælg sværhedsgrad:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.keys(difficultyConfig) as Difficulty[]).map((diff) => (
                      <Button
                        key={diff}
                        size="sm"
                        onClick={() => setViewingDifficulty(diff)}
                        variant={viewingDifficulty === diff ? 'default' : 'outline'}
                        className={viewingDifficulty === diff ? `bg-gradient-to-r ${difficultyConfig[diff].color} text-white hover:opacity-90` : ''}
                      >
                        {difficultyConfig[diff].label}
                      </Button>
                    ))}
                  </div>
                </div>
                {!filteredHighScores || filteredHighScores.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Ingen scores endnu. Vær den første!
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredHighScores.map((scoreEntry, index) => (
                      <motion.div
                        key={scoreEntry.timestamp}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                            index === 0 ? 'bg-[oklch(0.75_0.15_60)] text-white' :
                            index === 1 ? 'bg-[oklch(0.70_0.10_30)] text-white' :
                            index === 2 ? 'bg-[oklch(0.65_0.08_40)] text-white' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {index + 1}
                          </div>
                          <div className="text-xs">
                            <div className="font-semibold text-foreground">{scoreEntry.score} pts</div>
                            <div className="text-muted-foreground">{scoreEntry.hits} træf</div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
