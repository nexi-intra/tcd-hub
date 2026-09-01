import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DownloadSimple, FileDoc, Timer, Image as ImageIcon } from '@phosphor-icons/react'
import { Guide } from '@/lib/types'
import { getReviewStatus, REVIEW_INTERVAL_CHOICES } from '@/lib/guideTypes'
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

/** Billede i et trin — loader objekt-URL fra chunked KV. */
function StepImage({ imageId }: { imageId: string }) {
  const [url, setUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    fileStorage.getImageObjectUrl(imageId)
      .then((u) => { if (!cancelled) setUrl(u) })
      .catch(() => { if (!cancelled) setFailed(true) })
    return () => { cancelled = true }
  }, [imageId])

  if (failed) {
    return (
      <div className="h-24 rounded-lg border bg-muted/50 flex items-center justify-center px-4 gap-2 text-muted-foreground">
        <ImageIcon size={20} />
        <span className="text-xs">Billede kunne ikke indlæses</span>
      </div>
    )
  }
  if (!url) {
    return <div className="h-24 w-32 rounded-lg border bg-muted/50 animate-pulse" />
  }
  return <img src={url} alt="" className="max-h-80 rounded-lg border shadow-sm object-contain" />
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
                {guide.version && (
                  <Badge variant="secondary" className="text-xs font-mono">v{guide.version}</Badge>
                )}
                {guide.reviewIntervalMonths ? (
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-xs font-medium gap-1',
                      getReviewStatus(guide) === 'overdue' && 'bg-destructive/10 text-destructive border-destructive/30',
                      getReviewStatus(guide) === 'due-soon' && 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
                    )}
                  >
                    <Timer size={12} />
                    {getReviewStatus(guide) === 'overdue'
                      ? 'Skal opdateres'
                      : guide.nextReviewAt
                        ? `Opdateres senest ${new Date(guide.nextReviewAt).toLocaleDateString('da-DK')}`
                        : REVIEW_INTERVAL_CHOICES.find((c) => c.value === guide.reviewIntervalMonths)?.label}
                  </Badge>
                ) : null}
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
          {guide.sections && guide.sections.length > 0 ? (
            <div className="max-w-3xl mx-auto bg-background rounded-lg shadow-sm border border-border p-6 sm:p-8 lg:p-10 space-y-8">
              {(guide.fileUrl || guide.wordFileData) && (
                <button
                  type="button"
                  onClick={handleDownload}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border bg-muted/30 hover:bg-muted/60 transition-colors text-left"
                >
                  <FileDoc size={22} weight="duotone" className="text-primary shrink-0" />
                  <span className="text-sm flex-1 truncate">{guide.wordFileName || 'Word-dokument vedhæftet'}</span>
                  <DownloadSimple size={18} className="text-muted-foreground shrink-0" />
                </button>
              )}
              {guide.sections.map((section, sIndex) => (
                <section key={section.id}>
                  <h3 className="text-lg font-bold text-[#1F3763] dark:text-primary mb-3 border-b border-border pb-1.5">
                    {sIndex + 1}.0{section.heading ? ` ${section.heading}` : ''}
                  </h3>
                  <ol className="space-y-4">
                    {section.steps.map((step, stIndex) => (
                      <li key={step.id} className="flex gap-3">
                        <span className="font-mono text-sm font-semibold text-muted-foreground shrink-0 mt-0.5 w-9">
                          {sIndex + 1}.{stIndex + 1}
                        </span>
                        <div className="flex-1 min-w-0 space-y-3">
                          {step.text && <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{step.text}</p>}
                          {step.imageIds.length > 0 && (
                            <div className="flex flex-col gap-3">
                              {step.imageIds.map((imageId) => <StepImage key={imageId} imageId={imageId} />)}
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                </section>
              ))}
            </div>
          ) : (guide.fileUrl || guide.wordFileData) ? (
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
