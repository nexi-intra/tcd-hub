import { motion } from 'framer-motion'
import { useState } from 'react'
import { GameController, Target, ArrowLeft, RocketLaunch, Cube, Bird } from '@phosphor-icons/react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/contexts/LanguageContext'
import { HitNMiss } from '@/components/HitNMiss'
import { EndlessDodger } from '@/components/EndlessDodger'
import { BrickBreak } from '@/components/BrickBreak'
import { NexiFlyer } from '@/components/NexiFlyer'
import { cn } from '@/lib/utils'

interface GameCornerProps {
  onNavigateBack: () => void
  userEmail?: string
}

type GameView = 'hub' | 'hitnmiss' | 'endlessdodger' | 'brickbreak' | 'nexiflyer'

interface GameModule {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  color: string
  gradient: string
  available: boolean
}

export function GameCorner({ onNavigateBack, userEmail }: GameCornerProps) {
  const { language } = useLanguage()
  const [currentView, setCurrentView] = useState<GameView>('hub')

  const games: GameModule[] = [
    {
      id: 'hitnmiss',
      title: language === 'da' ? 'Hit N Miss' : 'Hit N Miss',
      description: language === 'da' 
        ? 'Test din reaktionstid og præcision. Klik på skydeskiverne så hurtigt som muligt!'
        : 'Test your reaction time and precision. Click the targets as fast as you can!',
      icon: <Target size={48} weight="duotone" />,
      color: 'oklch(0.72 0.20 310)',
      gradient: 'from-[oklch(0.72_0.20_310)] via-[oklch(0.68_0.22_280)] to-[oklch(0.72_0.20_310)]',
      available: true,
    },
    {
      id: 'endlessdodger',
      title: language === 'da' ? 'Endless Dodger' : 'Endless Dodger',
      description: language === 'da' 
        ? 'Skyd bølge efter bølge af høns ned og undgå deres æg. Hvor langt kan du nå?'
        : 'Blast wave after wave of chickens and dodge their falling eggs. How far can you get?',
      icon: <RocketLaunch size={48} weight="duotone" />,
      color: 'oklch(0.65 0.22 280)',
      gradient: 'from-[oklch(0.65_0.22_280)] via-[oklch(0.70_0.20_250)] to-[oklch(0.65_0.22_280)]',
      available: true,
    },
    {
      id: 'brickbreak',
      title: language === 'da' ? 'Brick Break' : 'Brick Break',
      description: language === 'da' 
        ? 'Ødelæg alle brikkerne og klar så mange levels som muligt!'
        : 'Destroy all bricks and clear as many levels as possible!',
      icon: <Cube size={48} weight="duotone" />,
      color: 'oklch(0.68 0.20 340)',
      gradient: 'from-[oklch(0.68_0.20_340)] via-[oklch(0.70_0.18_310)] to-[oklch(0.68_0.20_340)]',
      available: true,
    },
    {
      id: 'nexiflyer',
      title: 'Nexi Flyer',
      description: language === 'da'
        ? 'Flyv gennem rørene og sæt ny rekord i dette klassiske arkadespil!'
        : 'Fly through the pipes and set a new record in this classic arcade game!',
      icon: <Bird size={48} weight="duotone" />,
      color: 'oklch(0.75 0.18 90)',
      gradient: 'from-[oklch(0.75_0.18_90)] via-[oklch(0.78_0.16_60)] to-[oklch(0.75_0.18_90)]',
      available: true,
    },
  ]

  const getIconAnimation = () => {
    return {
      initial: {
        scale: 1,
        rotate: 0,
        y: 0,
      },
      hover: {
        scale: [1, 1.3, 1.15],
        rotate: [0, -15, 15, -10, 10, 0],
        y: [0, -8, 0],
      },
      transition: {
        duration: 0.8,
        ease: "easeInOut" as const
      }
    }
  }

  const getCardAnimation = () => {
    return {
      initial: {
        scale: 1,
        y: 0,
        rotate: 0,
        boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
      },
      hover: {
        scale: 1.08,
        y: -10,
        rotate: [0, 3, -3, 0],
        boxShadow: "0 30px 60px -15px rgba(0, 0, 0, 0.35)",
      },
      tap: { scale: 0.92 },
      transition: {
        duration: 0.3,
        ease: "easeInOut" as const
      }
    }
  }

  if (currentView === 'hitnmiss') {
    return (
      <div className="min-h-screen" style={{
        background: `
          radial-gradient(circle at 20% 30%, oklch(0.60 0.15 280 / 0.15) 0%, transparent 50%),
          radial-gradient(circle at 80% 60%, oklch(0.65 0.12 210 / 0.15) 0%, transparent 50%),
          radial-gradient(circle at 50% 90%, oklch(0.55 0.10 150 / 0.12) 0%, transparent 50%),
          linear-gradient(
            135deg,
            oklch(0.98 0.01 250) 0%,
            oklch(0.97 0.02 280) 25%,
            oklch(0.98 0.01 210) 50%,
            oklch(0.97 0.02 240) 75%,
            oklch(0.98 0.01 250) 100%
          )
        `
      }}>
        <div style={{
          background: `
            repeating-linear-gradient(
              90deg,
              transparent,
              transparent 100px,
              oklch(0.96 0.01 240 / 0.3) 100px,
              oklch(0.96 0.01 240 / 0.3) 101px
            ),
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 100px,
              oklch(0.96 0.01 240 / 0.3) 100px,
              oklch(0.96 0.01 240 / 0.3) 101px
            )
          `
        }}>
          <div className="relative bg-gradient-to-r from-[oklch(0.72_0.20_310)] via-[oklch(0.68_0.22_280)] to-[oklch(0.72_0.20_310)] py-8 shadow-xl border-b-4 border-white/10">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjEiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-30" />
            <div className="container mx-auto px-4 sm:px-6 relative z-10">
              <div className="flex items-center gap-4">
                <Button
                  onClick={() => setCurrentView('hub')}
                  variant="ghost"
                  size="lg"
                  className="text-white hover:bg-white/20 transition-colors"
                >
                  <ArrowLeft size={24} weight="bold" />
                </Button>
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-white/20 backdrop-blur-sm shadow-xl">
                    <Target size={32} weight="duotone" className="text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white drop-shadow-lg">
                      Hit N Miss
                    </h1>
                    <p className="text-white/90 text-sm sm:text-base">
                      {language === 'da' 
                        ? 'Test din reaktionstid og præcision'
                        : 'Test your reaction time and precision'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="container mx-auto px-4 sm:px-6 py-8 max-w-6xl">
            <HitNMiss userEmail={userEmail} />
          </div>
        </div>
      </div>
    )
  }

  if (currentView === 'endlessdodger') {
    return (
      <div className="min-h-screen" style={{
        background: `
          radial-gradient(circle at 20% 30%, oklch(0.60 0.15 280 / 0.15) 0%, transparent 50%),
          radial-gradient(circle at 80% 60%, oklch(0.65 0.12 210 / 0.15) 0%, transparent 50%),
          radial-gradient(circle at 50% 90%, oklch(0.55 0.10 150 / 0.12) 0%, transparent 50%),
          linear-gradient(
            135deg,
            oklch(0.98 0.01 250) 0%,
            oklch(0.97 0.02 280) 25%,
            oklch(0.98 0.01 210) 50%,
            oklch(0.97 0.02 240) 75%,
            oklch(0.98 0.01 250) 100%
          )
        `
      }}>
        <div style={{
          background: `
            repeating-linear-gradient(
              90deg,
              transparent,
              transparent 100px,
              oklch(0.96 0.01 240 / 0.3) 100px,
              oklch(0.96 0.01 240 / 0.3) 101px
            ),
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 100px,
              oklch(0.96 0.01 240 / 0.3) 100px,
              oklch(0.96 0.01 240 / 0.3) 101px
            )
          `
        }}>
          <div className="relative bg-gradient-to-r from-[oklch(0.65_0.22_280)] via-[oklch(0.70_0.20_250)] to-[oklch(0.65_0.22_280)] py-8 shadow-xl border-b-4 border-white/10">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjEiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-30" />
            <div className="container mx-auto px-4 sm:px-6 relative z-10">
              <div className="flex items-center gap-4">
                <Button
                  onClick={() => setCurrentView('hub')}
                  variant="ghost"
                  size="lg"
                  className="text-white hover:bg-white/20 transition-colors"
                >
                  <ArrowLeft size={24} weight="bold" />
                </Button>
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-white/20 backdrop-blur-sm shadow-xl">
                    <RocketLaunch size={32} weight="duotone" className="text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white drop-shadow-lg">
                      Endless Dodger
                    </h1>
                    <p className="text-white/90 text-sm sm:text-base">
                      {language === 'da' 
                        ? 'Skyd hønseinvasionen ned og undgå deres æg'
                        : 'Blast the chicken invasion and dodge their eggs'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="container mx-auto px-4 sm:px-6 py-8 max-w-6xl">
            <EndlessDodger userEmail={userEmail} />
          </div>
        </div>
      </div>
    )
  }

  if (currentView === 'brickbreak') {
    return (
      <div className="min-h-screen" style={{
        background: `
          radial-gradient(circle at 20% 30%, oklch(0.60 0.15 280 / 0.15) 0%, transparent 50%),
          radial-gradient(circle at 80% 60%, oklch(0.65 0.12 210 / 0.15) 0%, transparent 50%),
          radial-gradient(circle at 50% 90%, oklch(0.55 0.10 150 / 0.12) 0%, transparent 50%),
          linear-gradient(
            135deg,
            oklch(0.98 0.01 250) 0%,
            oklch(0.97 0.02 280) 25%,
            oklch(0.98 0.01 210) 50%,
            oklch(0.97 0.02 240) 75%,
            oklch(0.98 0.01 250) 100%
          )
        `
      }}>
        <div style={{
          background: `
            repeating-linear-gradient(
              90deg,
              transparent,
              transparent 100px,
              oklch(0.96 0.01 240 / 0.3) 100px,
              oklch(0.96 0.01 240 / 0.3) 101px
            ),
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 100px,
              oklch(0.96 0.01 240 / 0.3) 100px,
              oklch(0.96 0.01 240 / 0.3) 101px
            )
          `
        }}>
          <div className="relative bg-gradient-to-r from-[oklch(0.68_0.20_340)] via-[oklch(0.70_0.18_310)] to-[oklch(0.68_0.20_340)] py-8 shadow-xl border-b-4 border-white/10">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjEiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-30" />
            <div className="container mx-auto px-4 sm:px-6 relative z-10">
              <div className="flex items-center gap-4">
                <Button
                  onClick={() => setCurrentView('hub')}
                  variant="ghost"
                  size="lg"
                  className="text-white hover:bg-white/20 transition-colors"
                >
                  <ArrowLeft size={24} weight="bold" />
                </Button>
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-white/20 backdrop-blur-sm shadow-xl">
                    <Cube size={32} weight="duotone" className="text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white drop-shadow-lg">
                      Brick Break
                    </h1>
                    <p className="text-white/90 text-sm sm:text-base">
                      {language === 'da' 
                        ? 'Ødelæg alle brikker og klar så mange levels som muligt'
                        : 'Destroy all bricks and clear as many levels as possible'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="container mx-auto px-4 sm:px-6 py-8 max-w-6xl">
            <BrickBreak userEmail={userEmail} />
          </div>
        </div>
      </div>
    )
  }

  if (currentView === 'nexiflyer') {
    return (
      <div className="min-h-screen" style={{
        background: `
          radial-gradient(circle at 20% 30%, oklch(0.60 0.15 280 / 0.15) 0%, transparent 50%),
          radial-gradient(circle at 80% 60%, oklch(0.65 0.12 210 / 0.15) 0%, transparent 50%),
          radial-gradient(circle at 50% 90%, oklch(0.55 0.10 150 / 0.12) 0%, transparent 50%),
          linear-gradient(
            135deg,
            oklch(0.98 0.01 250) 0%,
            oklch(0.97 0.02 280) 25%,
            oklch(0.98 0.01 210) 50%,
            oklch(0.97 0.02 240) 75%,
            oklch(0.98 0.01 250) 100%
          )
        `
      }}>
        <div style={{
          background: `
            repeating-linear-gradient(
              90deg,
              transparent,
              transparent 100px,
              oklch(0.96 0.01 240 / 0.3) 100px,
              oklch(0.96 0.01 240 / 0.3) 101px
            ),
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 100px,
              oklch(0.96 0.01 240 / 0.3) 100px,
              oklch(0.96 0.01 240 / 0.3) 101px
            )
          `
        }}>
          <div className="relative bg-gradient-to-r from-[oklch(0.75_0.18_90)] via-[oklch(0.78_0.16_60)] to-[oklch(0.75_0.18_90)] py-8 shadow-xl border-b-4 border-white/10">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjEiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-30" />
            <div className="container mx-auto px-4 sm:px-6 relative z-10">
              <div className="flex items-center gap-4">
                <Button
                  onClick={() => setCurrentView('hub')}
                  variant="ghost"
                  size="lg"
                  className="text-white hover:bg-white/20 transition-colors"
                >
                  <ArrowLeft size={24} weight="bold" />
                </Button>
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-white/20 backdrop-blur-sm shadow-xl">
                    <Bird size={32} weight="duotone" className="text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white drop-shadow-lg">
                      Nexi Flyer
                    </h1>
                    <p className="text-white/90 text-sm sm:text-base">
                      {language === 'da'
                        ? 'Flyv gennem rørene så langt som muligt'
                        : 'Fly through the pipes as far as you can'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="container mx-auto px-4 sm:px-6 py-8 max-w-6xl">
            <NexiFlyer userEmail={userEmail} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute top-6 right-6 left-6 z-20">
        <div className="flex items-center justify-start pb-12">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.05 }}
          >
            <Button
              onClick={onNavigateBack}
              variant="outline"
              size="lg"
              className="bg-background/80 backdrop-blur-sm hover:bg-background shadow-lg hover:shadow-xl transition-all duration-300 gap-2 font-semibold"
            >
              <ArrowLeft size={20} weight="bold" />
              {language === 'da' ? 'Tilbage til Hub' : 'Back to Hub'}
            </Button>
          </motion.div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 pt-56 sm:pt-60 pb-12 sm:pb-20 max-w-7xl relative z-10">
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
            className="flex justify-center mb-6"
          >
            <div className="p-6 rounded-3xl bg-gradient-to-br from-[oklch(0.72_0.20_310)] via-[oklch(0.68_0.22_280)] to-[oklch(0.72_0.20_310)] shadow-2xl">
              <GameController size={64} weight="duotone" className="text-white" />
            </div>
          </motion.div>
          <motion.h1 
            className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight bg-gradient-to-br from-[oklch(0.72_0.20_310)] via-[oklch(0.68_0.22_280)] to-[oklch(0.72_0.20_310)] bg-clip-text text-transparent mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            {language === 'da' ? 'Spilhjørnet' : 'Game Corner'}
          </motion.h1>
          <motion.p
            className="text-lg text-muted-foreground max-w-2xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            {language === 'da' 
              ? 'Tag en pause og test dine færdigheder. Konkurrér med kollegaer om de bedste scores!'
              : 'Take a break and test your skills. Compete with colleagues for the best scores!'}
          </motion.p>
        </motion.header>

        <motion.div 
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          {games.filter(game => game.available).map((game, index) => {
            const cardAnimation = getCardAnimation()
            const iconAnimation = getIconAnimation()
            
            return (
              <motion.div
                key={game.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + index * 0.05, duration: 0.4 }}
              >
                <motion.div
                  initial={cardAnimation.initial}
                  whileHover={cardAnimation.hover}
                  whileTap={cardAnimation.tap}
                  transition={cardAnimation.transition}
                >
                  <Card
                    className="relative overflow-hidden border-2 transition-all duration-300 group h-full min-h-[180px] sm:min-h-[220px] flex flex-col cursor-pointer hover:border-primary/40"
                    onClick={() => setCurrentView(game.id as GameView)}
                  >
                    <motion.div 
                      className="absolute inset-0 bg-gradient-to-br"
                      style={{
                        background: `radial-gradient(circle at top right, ${game.color}15, transparent)`
                      }}
                      initial={{ opacity: 0 }}
                      whileHover={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    />
                    
                    <div className="relative p-4 md:p-6 flex flex-col flex-1">
                      <motion.div 
                        className={cn(
                          "mb-3 md:mb-4 inline-flex items-center justify-center rounded-2xl p-2 md:p-3 shadow-lg",
                          `bg-gradient-to-br ${game.gradient}`
                        )}
                        style={{ color: 'white' }}
                        initial={iconAnimation.initial}
                        whileHover={iconAnimation.hover}
                        transition={iconAnimation.transition}
                      >
                        <div className="[&>svg]:w-8 [&>svg]:h-8 md:[&>svg]:w-12 md:[&>svg]:h-12">
                          {game.icon}
                        </div>
                      </motion.div>

                      <h3 className="text-sm sm:text-base md:text-lg font-bold mb-1.5 md:mb-2 text-foreground text-center">
                        {game.title}
                      </h3>
                      
                      <p className="text-muted-foreground text-xs leading-relaxed mb-3 md:mb-4 flex-1">
                        {game.description}
                      </p>
                    </div>
                  </Card>
                </motion.div>
              </motion.div>
            )
          })}
        </motion.div>

        {games.filter(g => g.available).length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center py-20"
          >
            <GameController size={64} className="text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-lg text-muted-foreground">
              {language === 'da' ? 'Nye spil kommer snart!' : 'New games coming soon!'}
            </p>
          </motion.div>
        )}
      </div>
    </div>
  )
}
