import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PencilSimple, Trash, Eye, FileDoc } from '@phosphor-icons/react'
import { Guide } from '@/lib/types'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface GuideCardProps {
  guide: Guide
  onEdit: (guide: Guide) => void
  onDelete: (id: string) => void
  onView: (guide: Guide) => void
}

const categoryColors: Record<string, string> = {
  Procedures: 'bg-gradient-to-br from-primary/25 to-primary/15 text-primary border-primary/50 shadow-lg shadow-primary/15',
  Technical: 'bg-gradient-to-br from-secondary/25 to-secondary/15 text-secondary border-secondary/50 shadow-lg shadow-secondary/15',
  HR: 'bg-gradient-to-br from-accent/25 to-accent/15 text-accent border-accent/50 shadow-lg shadow-accent/15',
  Safety: 'bg-gradient-to-br from-destructive/25 to-destructive/15 text-destructive border-destructive/50 shadow-lg shadow-destructive/15',
  General: 'bg-gradient-to-br from-muted to-muted/70 text-foreground border-border shadow-lg shadow-black/5',
}

export function GuideCard({ guide, onEdit, onDelete, onView }: GuideCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const handleCardClick = () => {
    onView(guide)
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3, type: "spring", stiffness: 300, damping: 30 }}
      whileHover={{ y: -4 }}
    >
      <Card
        className={cn(
          'group cursor-pointer transition-all duration-300 h-full flex flex-col relative overflow-hidden backdrop-blur-md border-2',
          'bg-card/90',
          'hover:shadow-[0_25px_60px_-15px] hover:shadow-primary/30 hover:border-primary/60',
          'hover:bg-card',
          isExpanded && 'ring-2 ring-primary/50 shadow-2xl shadow-primary/30'
        )}
        onClick={handleCardClick}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-secondary/8 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,oklch(0.55_0.22_265/0.15),transparent_50%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        <CardHeader className="pb-5 flex-1 relative z-10">
          <div className="flex flex-col gap-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-3 mb-4">
                  <CardTitle className="text-base sm:text-lg leading-tight break-words flex-1 font-bold text-foreground group-hover:bg-gradient-to-r group-hover:from-primary group-hover:via-secondary group-hover:to-primary group-hover:bg-clip-text group-hover:text-transparent transition-all duration-300">
                    {guide.title}
                  </CardTitle>
                  {guide.wordFileData && (
                    <motion.div
                      initial={{ scale: 1 }}
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ type: "spring", stiffness: 400 }}
                    >
                      <FileDoc size={20} weight="duotone" className="text-accent flex-shrink-0 mt-0.5" />
                    </motion.div>
                  )}
                </div>
                <CardDescription className="flex items-center gap-2 flex-wrap">
                  <Badge
                    variant="outline"
                    className={cn('text-xs font-bold shadow-lg border-2', categoryColors[guide.category])}
                  >
                    {guide.category}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(guide.updatedAt).toLocaleDateString('da-DK', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </CardDescription>
              </div>
            </div>
            {guide.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {guide.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs px-3 py-1 font-semibold bg-muted hover:bg-muted/80 transition-colors rounded-lg">
                    {tag}
                  </Badge>
                ))}
                {guide.tags.length > 3 && (
                  <Badge variant="secondary" className="text-xs px-3 py-1 font-semibold bg-muted rounded-lg">
                    +{guide.tags.length - 3}
                  </Badge>
                )}
              </div>
            )}
            <div className="flex gap-2 pt-3" onClick={(e) => e.stopPropagation()}>
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all duration-200"
                  onClick={() => onView(guide)}
                >
                  <Eye size={18} weight="duotone" />
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-muted-foreground hover:text-accent hover:bg-accent/10 transition-all duration-200"
                  onClick={() => onEdit(guide)}
                >
                  <PencilSimple size={18} weight="duotone" />
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200"
                  onClick={() => onDelete(guide.id)}
                >
                  <Trash size={18} weight="duotone" />
                </Button>
              </motion.div>
            </div>
          </div>
        </CardHeader>
      </Card>
    </motion.div>
  )
}
