import { GameController, Sparkle, Trophy, Target } from '@phosphor-icons/react'
import { PageHeader } from '@/components/shared/PageHeader'
import { colors } from '@/lib/designSystem'
import { useLanguage } from '@/contexts/LanguageContext'
import { HitNMiss } from '@/components/HitNMiss'
import { Card } from '@/components/ui/card'

interface GameCornerProps {
  onNavigateBack: () => void
  userEmail?: string
}

export function GameCorner({ onNavigateBack, userEmail }: GameCornerProps) {
  const { t, language } = useLanguage()

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
        <PageHeader
          title={t.hub.modules.games}
          icon={<GameController size={32} weight="duotone" />}
          gradient={colors.gradients.games}
          onNavigateBack={onNavigateBack}
        />

        <div className="container mx-auto px-4 sm:px-6 py-8 max-w-6xl">
          <Card className="p-6 mb-8 bg-gradient-to-br from-primary/10 via-accent/10 to-primary/5 border-2 border-primary/20">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-primary via-accent to-primary shadow-xl">
                <Sparkle size={36} weight="duotone" className="text-primary-foreground" />
              </div>
              <div className="flex-1">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                  {language === 'da' ? 'Velkommen til Spilhjørnet' : 'Welcome to Game Corner'}
                </h1>
                <p className="text-muted-foreground mt-1">
                  {language === 'da' 
                    ? 'Test dine færdigheder og konkurrer om de bedste scores!' 
                    : 'Test your skills and compete for the best scores!'}
                </p>
              </div>
              <div className="hidden md:flex items-center gap-4">
                <div className="text-center p-4 rounded-xl bg-gradient-to-br from-accent/20 to-primary/20 border border-accent/30">
                  <Trophy size={28} weight="fill" className="text-accent mx-auto mb-1" />
                  <div className="text-xs text-muted-foreground font-semibold">
                    {language === 'da' ? 'Høj Score' : 'High Score'}
                  </div>
                </div>
                <div className="text-center p-4 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/30">
                  <Target size={28} weight="duotone" className="text-primary mx-auto mb-1" />
                  <div className="text-xs text-muted-foreground font-semibold">
                    {language === 'da' ? 'Præcision' : 'Accuracy'}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-3 mt-6">
              <div className="flex-1 min-w-[200px] p-4 rounded-lg bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/20">
                <div className="text-sm font-semibold text-green-600 dark:text-green-400">
                  {language === 'da' ? '🎯 Let modus' : '🎯 Easy Mode'}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {language === 'da' ? 'Perfekt til at komme i gang' : 'Perfect for getting started'}
                </div>
              </div>
              <div className="flex-1 min-w-[200px] p-4 rounded-lg bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 border border-yellow-500/20">
                <div className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">
                  {language === 'da' ? '⚡ Mellem modus' : '⚡ Medium Mode'}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {language === 'da' ? 'Balanceret udfordring' : 'Balanced challenge'}
                </div>
              </div>
              <div className="flex-1 min-w-[200px] p-4 rounded-lg bg-gradient-to-br from-red-500/10 to-red-600/10 border border-red-500/20">
                <div className="text-sm font-semibold text-red-600 dark:text-red-400">
                  {language === 'da' ? '🔥 Svær modus' : '🔥 Hard Mode'}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {language === 'da' ? 'For de mest erfarne' : 'For the most experienced'}
                </div>
              </div>
            </div>
          </Card>

          <HitNMiss userEmail={userEmail} />
        </div>
      </div>
    </div>
  )
}
