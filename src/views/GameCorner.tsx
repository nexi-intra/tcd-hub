import { motion } from 'framer-motion'
import { useState } from 'react'
import { ArrowLeft, Lightning } from '@phosphor-icons/react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { useKV } from '@github/spark/hooks'

interface GameCornerProps {
  onNavigateBack: () => void
}

interface FastClicksScore {
  score: number
  timestamp: number
  playerName: string
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
                  Hvor hurtigt kan du klikke? Test din reflekshastighed i 10 sekunder!
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

function FastClicksGame({ onBack, onNavigateBack }: { onBack: () => void; onNavigateBack: () => void }) {
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'finished'>('idle')
  const [clicks, setClicks] = useState(0)
  const [timeLeft, setTimeLeft] = useState(10)
  const [highScores, setHighScores] = useKV<FastClicksScore[]>('fast-clicks-scores', [])

  const startGame = () => {
    setClicks(0)
    setTimeLeft(10)
    setGameState('playing')

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          setGameState('finished')
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const handleClick = () => {
    if (gameState === 'playing') {
      setClicks((prev) => prev + 1)
    }
  }

  const saveScore = async () => {
    const newScore: FastClicksScore = {
      score: clicks,
      timestamp: Date.now(),
      playerName: 'Player',
    }

    const currentScores = highScores || []
    const updatedScores = [...currentScores, newScore]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)

    setHighScores(updatedScores)
  }

  const resetGame = () => {
    if (gameState === 'finished' && clicks > 0) {
      saveScore()
    }
    setGameState('idle')
    setClicks(0)
    setTimeLeft(10)
  }

  const cps = gameState === 'finished' ? (clicks / 10).toFixed(1) : '0.0'

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
                Klik så hurtigt du kan i 10 sekunder!
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
                  {gameState === 'idle' && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center"
                    >
                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[oklch(0.72_0.20_310)] to-[oklch(0.68_0.22_280)] flex items-center justify-center mb-6 mx-auto shadow-2xl">
                        <Lightning size={48} weight="duotone" className="text-white" />
                      </div>
                      <h2 className="text-3xl font-bold mb-4">Klar til at starte?</h2>
                      <p className="text-muted-foreground mb-8 max-w-md">
                        Når du trykker på start, har du 10 sekunder til at klikke så mange gange som muligt!
                      </p>
                      <Button
                        size="lg"
                        onClick={startGame}
                        className="bg-gradient-to-r from-[oklch(0.72_0.20_310)] to-[oklch(0.68_0.22_280)] hover:from-[oklch(0.70_0.20_310)] hover:to-[oklch(0.66_0.22_280)] text-white text-lg px-8 py-6 shadow-xl"
                      >
                        Start Spil
                      </Button>
                    </motion.div>
                  )}

                  {gameState === 'playing' && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center w-full"
                    >
                      <div className="mb-8">
                        <div className="text-6xl font-bold text-foreground mb-2">{timeLeft}</div>
                        <div className="text-muted-foreground">sekunder tilbage</div>
                        <Progress value={(timeLeft / 10) * 100} className="h-2 mt-4" />
                      </div>

                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={handleClick}
                        className="w-64 h-64 rounded-full bg-gradient-to-br from-[oklch(0.72_0.20_310)] to-[oklch(0.68_0.22_280)] hover:from-[oklch(0.74_0.22_310)] hover:to-[oklch(0.70_0.24_280)] text-white font-bold text-2xl shadow-2xl transition-all cursor-pointer select-none flex items-center justify-center"
                      >
                        KLIK MIG!
                      </motion.button>

                      <div className="mt-8 text-5xl font-bold bg-gradient-to-br from-primary to-accent bg-clip-text text-transparent">
                        {clicks}
                      </div>
                      <div className="text-muted-foreground">klik</div>
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
                        🎉
                      </motion.div>
                      <h2 className="text-3xl font-bold mb-2">Godt klaret!</h2>
                      <div className="text-6xl font-bold mb-4 bg-gradient-to-br from-primary to-accent bg-clip-text text-transparent">
                        {clicks}
                      </div>
                      <div className="text-muted-foreground mb-2">klik i alt</div>
                      <div className="text-3xl font-bold text-foreground mb-8">
                        {cps} <span className="text-lg text-muted-foreground">klik/sek</span>
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
                {!highScores || highScores.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Ingen scores endnu. Vær den første!
                  </div>
                ) : (
                  <div className="space-y-3">
                    {highScores.map((score, index) => (
                      <motion.div
                        key={score.timestamp}
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
                          <div className="text-sm font-semibold text-foreground">
                            {(score.score / 10).toFixed(1)} CPS
                          </div>
                        </div>
                        <div className="text-xl font-bold text-foreground">
                          {score.score}
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
