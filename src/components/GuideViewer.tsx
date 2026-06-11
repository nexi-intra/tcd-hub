import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DownloadSimple, FileDoc } from '@phosphor-icons/react'
import { Guide } from '@/lib/types'
import { fileStorage } from '@/lib/fileStorage'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface GuideViewerProps {
  guide: Guide | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const categoryColors: Record<string, string> = {
  Procedures: 'bg-primary/10 text-primary border-primary/20',
  Technical: 'bg-accent/10 text-accent-foreground border-accent/20',
  HR: 'bg-secondary/20 text-secondary-foreground border-secondary/30',
  Safety: 'bg-destructive/10 text-destructive border-destructive/20',
  General: 'bg-muted text-muted-foreground border-border',
}

export function GuideViewer({ guide, open, onOpenChange }: GuideViewerProps) {

  const handleDownload = async () => {
    if (!guide?.wordFileName) {
      toast.error('Word-filen er ikke tilgængelig')
      return
    }

    try {
      let blob: Blob

      if (guide.fileUrl) {
        blob = await fileStorage.downloadFile(guide.fileUrl)
      } else if (guide.wordFileData) {
        const binaryString = atob(guide.wordFileData)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }
        blob = new Blob([bytes], { 
          type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' 
        })
      } else {
        toast.error('Word-filen er ikke tilgængelig')
        return
      }

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = guide.wordFileName
      a.style.display = 'none'
      document.body.appendChild(a)
      a.click()
      setTimeout(() => {
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }, 100)
      toast.success('Word-fil downloadet!')
    } catch (error) {
      console.error('Error downloading Word file:', error)
      toast.error('Kunne ikke downloade Word-filen')
    }
  }

  if (!guide) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="flex-shrink-0 px-4 sm:px-6 pt-4 sm:pt-6 pb-4 border-b border-border">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4">
            <div className="flex-1 min-w-0 w-full">
              <div className="flex items-start justify-between gap-2 mb-3">
                <DialogTitle className="text-xl sm:text-2xl break-words pr-2">
                  {guide.title}
                </DialogTitle>
                <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                  <kbd className="px-2 py-1 bg-muted rounded border border-border font-mono text-xs">ESC</kbd>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant="outline"
                  className={cn('text-xs font-medium', categoryColors[guide.category])}
                >
                  {guide.category}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Opdateret: {new Date(guide.updatedAt).toLocaleDateString('da-DK', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
              {guide.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {guide.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            {(guide.fileUrl || guide.wordFileData) && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="flex-shrink-0 w-full sm:w-auto"
              >
                <DownloadSimple size={16} weight="regular" className="mr-2" />
                Download
              </Button>
            )}
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto min-h-0 px-4 sm:px-6 py-4 sm:py-6 bg-card">
          {(guide.fileUrl || guide.wordFileData) ? (
            <div className="flex flex-col items-center justify-center py-8 sm:py-12 px-4 sm:px-6">
              <div className="max-w-2xl w-full space-y-4 sm:space-y-6">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <FileDoc size={40} weight="duotone" className="text-primary sm:w-12 sm:h-12" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2">
                      Word-dokument vedhæftet
                    </h3>
                    <p className="text-sm text-muted-foreground mb-1 break-all">
                      {guide.wordFileName || 'dokument.docx'}
                    </p>
                    {guide.fileSize && (
                      <p className="text-xs text-muted-foreground mb-1">
                        Størrelse: {(guide.fileSize / 1024).toFixed(2)} KB
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      Download filen for at se det fulde indhold med formatering og billeder
                    </p>
                  </div>
                  <Button
                    size="lg"
                    onClick={handleDownload}
                    className="mt-4 w-full sm:w-auto"
                  >
                    <DownloadSimple size={20} weight="bold" className="mr-2" />
                    Download Word-dokument
                  </Button>
                </div>
                
                {guide.content && guide.content !== 'Se vedhæftet Word-dokument' && (
                  <div className="pt-6 border-t border-border">
                    <h4 className="text-sm font-semibold text-foreground mb-3">Ekstra noter:</h4>
                    <div className="bg-muted/50 rounded-lg p-4">
                      <p className="whitespace-pre-wrap break-words text-sm">{guide.content}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="max-w-none bg-background rounded-lg shadow-sm border border-border p-6 sm:p-8 lg:p-12">
              <p className="whitespace-pre-wrap break-words">{guide.content}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
