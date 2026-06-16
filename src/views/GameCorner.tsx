import { motion } from 'framer-motion'
import { ArrowLeft } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'

interface GameCornerProps {
  onNavigateBack: () => void
}

export function GameCorner({ onNavigateBack }: GameCornerProps) {
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
            className="flex items-center justify-center min-h-[200px] text-center text-muted-foreground"
          >
            <p>Flere spil kommer snart...</p>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
