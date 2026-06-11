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
  Procedures: 'bg-primary/20 text-primary border-primary/40 shadow-primary/10',
  Technical: 'bg-accent/20 text-accent border-accent/40 shadow-accent/10',
  HR: 'bg-[oklch(0.70_0.18_330)] text-[oklch(0.98_0_0)] border-[oklch(0.70_0.18_330)]/60 shadow-[oklch(0.70_0.18_330)]/20',
  Safety: 'bg-destructive/20 text-destructive border-destructive/40 shadow-destructive/10',
  General: 'bg-secondary text-secondary-foreground border-secondary shadow-secondary/10',
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
          'group cursor-pointer transition-all duration-300 h-full flex flex-col relative overflow-hidden backdrop-blur-sm',
          'border-border/50 bg-card/80',
          'hover:shadow-[0_20px_50px_-12px] hover:shadow-primary/20 hover:border-primary/50',
          'hover:bg-card/95',
          isExpanded && 'ring-2 ring-primary/40 shadow-xl shadow-primary/20'
        )}
        onClick={handleCardClick}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        <CardHeader className="pb-3 flex-1 relative z-10">
          <div className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2 mb-3">
                  <CardTitle className="text-base sm:text-lg leading-tight break-words flex-1 font-bold text-foreground group-hover:text-primary transition-colors duration-200">
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
                    className={cn('text-xs font-semibold shadow-sm', categoryColors[guide.category])}
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
              <div className="flex flex-wrap gap-1.5">
                {guide.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs px-2 py-0.5 font-medium bg-secondary/50 hover:bg-secondary/70 transition-colors">
                    {tag}
                  </Badge>
                ))}
                {guide.tags.length > 3 && (
                  <Badge variant="secondary" className="text-xs px-2 py-0.5 font-medium bg-secondary/50">
                    +{guide.tags.length - 3}
                  </Badge>
                )}
              </div>
            )}
            <div className="flex gap-1 pt-2" onClick={(e) => e.stopPropagation()}>
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
