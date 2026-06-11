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
  Procedures: 'bg-primary/10 text-primary border-primary/20',
  Technical: 'bg-accent/10 text-accent-foreground border-accent/20',
  HR: 'bg-secondary/20 text-secondary-foreground border-secondary/30',
  Safety: 'bg-destructive/10 text-destructive border-destructive/20',
  General: 'bg-muted text-muted-foreground border-border',
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
      transition={{ duration: 0.2 }}
    >
      <Card
        className={cn(
          'cursor-pointer transition-all duration-200 hover:shadow-lg hover:ring-2 hover:ring-primary/20',
          isExpanded && 'ring-2 ring-primary/20'
        )}
        onClick={handleCardClick}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <CardTitle className="text-lg leading-tight break-words">
                  {guide.title}
                </CardTitle>
                {guide.wordFileData && (
                  <FileDoc size={20} weight="duotone" className="text-accent-foreground flex-shrink-0" />
                )}
              </div>
              <CardDescription className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant="outline"
                  className={cn('text-xs font-medium', categoryColors[guide.category])}
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
            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-primary"
                onClick={() => onView(guide)}
              >
                <Eye size={16} weight="regular" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-primary"
                onClick={() => onEdit(guide)}
              >
                <PencilSimple size={16} weight="regular" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => onDelete(guide.id)}
              >
                <Trash size={16} weight="regular" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>
    </motion.div>
  )
}
