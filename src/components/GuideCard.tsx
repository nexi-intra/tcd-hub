import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PencilSimple, Trash, DownloadSimple, FileDoc } from '@phosphor-icons/react'
import { Guide } from '@/lib/types'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface GuideCardProps {
  guide: Guide
  onEdit: (guide: Guide) => void
  onDelete: (id: string) => void
}

const categoryColors: Record<string, string> = {
  Procedures: 'bg-primary/10 text-primary border-primary/20',
  Technical: 'bg-accent/10 text-accent-foreground border-accent/20',
  HR: 'bg-secondary/20 text-secondary-foreground border-secondary/30',
  Safety: 'bg-destructive/10 text-destructive border-destructive/20',
  General: 'bg-muted text-muted-foreground border-border',
}

export function GuideCard({ guide, onEdit, onDelete }: GuideCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const handleDownloadWord = (e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (!guide.wordFileData || !guide.wordFileName) {
      toast.error('Word-filen er ikke tilgængelig')
      return
    }

    try {
      const binaryString = atob(guide.wordFileData)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      const blob = new Blob([bytes], { 
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = guide.wordFileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Word-fil downloadet!')
    } catch (error) {
      console.error('Error downloading Word file:', error)
      toast.error('Kunne ikke downloade Word-filen')
    }
  }

  const handleCardClick = () => {
    if (guide.wordFileData && guide.wordFileName) {
      handleDownloadWord({ stopPropagation: () => {} } as React.MouseEvent)
    } else {
      setIsExpanded(!isExpanded)
    }
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
          'cursor-pointer transition-all duration-200 hover:shadow-lg',
          isExpanded && 'ring-2 ring-primary/20',
          guide.wordFileData && 'hover:ring-2 hover:ring-accent/30'
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
              {guide.wordFileData && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-accent-foreground"
                  onClick={handleDownloadWord}
                >
                  <DownloadSimple size={16} weight="regular" />
                </Button>
              )}
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

        <AnimatePresence>
          {isExpanded && !guide.wordFileData && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
              <CardContent className="pt-0">
                <div className="prose prose-sm max-w-none text-foreground whitespace-pre-wrap break-words">
                  {guide.content}
                </div>
                {guide.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
                    {guide.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  )
}
