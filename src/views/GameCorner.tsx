import { GameController } from '@phosphor-icons/react'
import { PageHeader } from '@/components/shared/PageHeader'
import { EmptyState } from '@/components/shared/StateComponents'
import { colors } from '@/lib/designSystem'
import { useLanguage } from '@/contexts/LanguageContext'

interface GameCornerProps {
  onNavigateBack: () => void
}

export function GameCorner({ onNavigateBack }: GameCornerProps) {
  const { t, language } = useLanguage()

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title={t.hub.modules.games}
        icon={<GameController size={32} weight="duotone" />}
        gradient={colors.gradients.games}
        onNavigateBack={onNavigateBack}
      />

      <div className="container mx-auto px-4 sm:px-6 py-8 max-w-6xl">
        <EmptyState
          icon={<GameController size={64} weight="duotone" />}
          title={language === 'da' ? 'Ingen spil tilgængelige' : 'No games available'}
          description={language === 'da' ? 'Spil kommer snart...' : 'Games coming soon...'}
        />
      </div>
    </div>
  )
}
