import { GameController } from '@phosphor-icons/react'
import { PageHeader } from '@/components/shared/PageHeader'
import { colors } from '@/lib/designSystem'
import { useLanguage } from '@/contexts/LanguageContext'
import { HitNMiss } from '@/components/HitNMiss'

interface GameCornerProps {
  onNavigateBack: () => void
}

export function GameCorner({ onNavigateBack }: GameCornerProps) {
  const { t } = useLanguage()

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title={t.hub.modules.games}
        icon={<GameController size={32} weight="duotone" />}
        gradient={colors.gradients.games}
        onNavigateBack={onNavigateBack}
      />

      <div className="container mx-auto px-4 sm:px-6 py-8 max-w-6xl">
        <HitNMiss />
      </div>
    </div>
  )
}
