import { useEffect, useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DownloadSimple, FileDoc, Timer, Image as ImageIcon, FileArrowDown, FolderOpen } from '@phosphor-icons/react'
import { Guide } from '@/lib/types'
import { getReviewStatus, REVIEW_INTERVAL_CHOICES, guidePlainText } from '@/lib/guideTypes'
import { guideToDocModel, resolveAuthorName } from '@/lib/docModel'
import { detectLanguage, translateText, type GuideLanguage } from '@/lib/translator'
import { isExportAvailable, getExportRoot, chooseAndSaveExportRoot, exportGuideToLibrary } from '@/lib/guideExporter'
import { fileStorage } from '@/lib/fileStorage'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import headerLogoUrl from '@/assets/images/docx/header-logo.png'

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  setTimeout(() => {
    document.body.removeChild(anchor)
    URL.revokeObjectURL(url)
  }, 100)
}

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

/** Billede i preview — loader objekt-URL fra chunked KV. */
function StepImage({ imageId, className }: { imageId: string; className?: string }) {
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
      <div className="h-24 rounded border bg-gray-100 flex items-center justify-center px-4 gap-2 text-gray-400">
        <ImageIcon size={20} />
        <span className="text-xs">Billede kunne ikke indlæses</span>
      </div>
    )
  }
  if (!url) {
    return <div className="h-24 w-32 rounded border bg-gray-100 animate-pulse" />
  }
  return <img src={url} alt="" className={cn('max-h-96 rounded border border-gray-200 shadow-sm object-contain mx-auto', className)} />
}

export function GuideViewer({ guide, open, onOpenChange }: GuideViewerProps) {
  const [authorName, setAuthorName] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [viewLanguage, setViewLanguage] = useState<GuideLanguage | null>(null)

  const guideLanguage: GuideLanguage = useMemo(
    () => guide?.language || (guide ? detectLanguage(guidePlainText(guide)) : 'da'),
    [guide]
  )

  useEffect(() => {
    setViewLanguage(null)
  }, [guide?.id])

  const baseModel = useMemo(() => (guide ? guideToDocModel(guide) : null), [guide])

  const isTranslated = viewLanguage !== null && viewLanguage !== guideLanguage

  // Vist model — oversættes ordbogsbaseret når der er valgt et andet sprog end guidens.
  const model = useMemo(() => {
    if (!baseModel) return null
    if (!isTranslated || !viewLanguage) return baseModel
    return {
      ...baseModel,
      title: translateText(baseModel.title, guideLanguage, viewLanguage),
      sections: baseModel.sections.map((section) => ({
        ...section,
        heading: translateText(section.heading, guideLanguage, viewLanguage),
        steps: section.steps.map((step) => ({
          ...step,
          text: translateText(step.text, guideLanguage, viewLanguage),
        })),
      })),
    }
  }, [baseModel, isTranslated, viewLanguage, guideLanguage])

  useEffect(() => {
    if (!model?.authorEmail) { setAuthorName(''); return }
    let cancelled = false
    resolveAuthorName(model.authorEmail).then((name) => { if (!cancelled) setAuthorName(name) })
    return () => { cancelled = true }
  }, [model?.authorEmail])

  const handleDownloadDocx = async () => {
    if (!model) return
    setIsGenerating(true)
    try {
      // docx-pakken (~350 KB) hentes først når der faktisk genereres.
      const { generateGuideDocx, guideDocxFileName } = await import('@/lib/docxGenerator')
      const blob = await generateGuideDocx(model, authorName || model.authorEmail)
      downloadBlob(blob, guideDocxFileName(model))
      toast.success('DOCX genereret! Word beregner selv indholdsfortegnelsens sidetal ved åbning.')
    } catch (error) {
      console.error('DOCX-generering fejlede:', error)
      toast.error('Kunne ikke generere DOCX-filen')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleExportToLibrary = async () => {
    if (!model) return
    setIsExporting(true)
    try {
      let root = await getExportRoot()
      if (!root) {
        root = await chooseAndSaveExportRoot()
        if (!root) return
      }
      const filePath = await exportGuideToLibrary(model, authorName || model.authorEmail, root)
      toast.success(`Eksporteret til ${filePath}`)
    } catch (error) {
      console.error('Eksport fejlede:', error)
      toast.error(error instanceof Error ? error.message : 'Kunne ikke eksportere guiden')
    } finally {
      setIsExporting(false)
    }
  }

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

      downloadBlob(blob, guide.wordFileName)
      toast.success('Word-fil downloadet!')
    } catch (error) {
      console.error('Error downloading Word file:', error)
      toast.error('Kunne ikke downloade Word-filen')
    }
  }

  if (!guide || !model) return null

  const hasSections = model.sections.length > 0
  const reviewStatus = getReviewStatus(guide)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[96vw] xl:max-w-[1400px] w-[96vw] h-[94vh] max-h-[94vh] flex flex-col p-0">
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
                      reviewStatus === 'overdue' && 'bg-destructive/10 text-destructive border-destructive/30',
                      reviewStatus === 'due-soon' && 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30',
                    )}
                  >
                    <Timer size={12} />
                    {reviewStatus === 'overdue'
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
            <div className="flex flex-col gap-2 flex-shrink-0 w-full sm:w-auto">
              {hasSections && (
                <div className="flex items-center gap-1 rounded-lg border p-0.5 bg-muted/40 self-stretch sm:self-end">
                  <Button
                    variant={!isTranslated ? 'default' : 'ghost'}
                    size="sm"
                    className="h-7 px-2.5 text-xs flex-1"
                    onClick={() => setViewLanguage(null)}
                  >
                    {guideLanguage === 'da' ? 'Dansk (original)' : 'English (original)'}
                  </Button>
                  <Button
                    variant={isTranslated ? 'default' : 'ghost'}
                    size="sm"
                    className="h-7 px-2.5 text-xs flex-1"
                    onClick={() => setViewLanguage(guideLanguage === 'da' ? 'en' : 'da')}
                  >
                    {guideLanguage === 'da' ? 'English' : 'Dansk'}
                  </Button>
                </div>
              )}
              {hasSections && isTranslated && (
                <p className="text-[10px] text-muted-foreground text-center sm:text-right">
                  Automatisk oversat (ordbogsbaseret) — original: {guideLanguage === 'da' ? 'dansk' : 'engelsk'}
                </p>
              )}
              {hasSections && (
                <Button
                  size="sm"
                  onClick={handleDownloadDocx}
                  disabled={isGenerating}
                  className="w-full sm:w-auto gap-2"
                >
                  <FileArrowDown size={16} weight="bold" />
                  {isGenerating ? 'Genererer…' : 'Download DOCX'}
                </Button>
              )}
              {hasSections && isExportAvailable() && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportToLibrary}
                  disabled={isExporting}
                  className="w-full sm:w-auto gap-2"
                >
                  <FolderOpen size={16} weight="regular" />
                  {isExporting ? 'Eksporterer…' : 'Eksportér til bibliotek'}
                </Button>
              )}
              {(guide.fileUrl || guide.wordFileData) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  className="w-full sm:w-auto gap-2"
                >
                  <DownloadSimple size={16} weight="regular" />
                  Vedhæftet Word
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 px-4 sm:px-6 py-4 sm:py-6 bg-muted/40">
          {hasSections ? (
            // A4-lignende ark der spejler den genererede DOCX (lys uanset tema, som Word).
            <div className="max-w-[1000px] mx-auto bg-white text-gray-900 rounded-sm shadow-xl border border-gray-300 overflow-hidden">
              <div className="px-10 pt-6 pb-2 border-b border-gray-200">
                <div className="flex items-start justify-between gap-4">
                  <div className="text-[11px] leading-snug text-gray-500">
                    <div>{authorName || model.authorEmail}</div>
                    <div>
                      {model.title}, Merchant Services{' '}
                      <span className="font-semibold text-gray-700">Version {model.version}</span>
                    </div>
                  </div>
                  <img src={headerLogoUrl} alt="Nexi" className="h-6 w-auto shrink-0" />
                </div>
              </div>

              <div className="px-10 py-8 space-y-8">
                <div>
                  <h2 className="text-xl font-bold mb-3" style={{ color: '#1F3763', fontFamily: "'Calibri Light', Calibri, sans-serif" }}>
                    Indholdsfortegnelse
                  </h2>
                  <ol className="space-y-1.5">
                    {model.sections.map((section) => (
                      <li key={section.number} className="flex items-baseline gap-2 text-sm">
                        <span className="font-semibold text-gray-700 shrink-0">{section.number}</span>
                        <span className="flex-1 border-b border-dotted border-gray-300 pb-0.5">{section.heading}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                {model.coverImageId && (
                  <div className="flex justify-center">
                    <StepImage imageId={model.coverImageId} className="max-h-[480px]" />
                  </div>
                )}

                <div className="border-t-2 border-dashed border-gray-200 -mx-10 px-10 pt-6 text-[10px] text-gray-400 text-center uppercase tracking-widest">
                  Sideskift
                </div>

                {model.sections.map((section) => (
                  <section key={section.number}>
                    <h3
                      className="text-base font-bold mb-3 pb-1 border-b border-gray-100"
                      style={{ color: '#1F3763', fontFamily: "'Calibri Light', Calibri, sans-serif" }}
                    >
                      {section.number} {section.heading}
                    </h3>
                    <ol className="space-y-3">
                      {section.steps.map((step) => (
                        <li key={step.number} className="flex gap-3">
                          <span className="font-semibold text-sm text-gray-600 shrink-0 w-9 tabular-nums">
                            {step.number}
                          </span>
                          <div className="flex-1 min-w-0 space-y-3">
                            {step.text && (
                              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed" style={{ fontFamily: 'Calibri, sans-serif' }}>
                                {step.text}
                              </p>
                            )}
                            {step.imageIds.map((imageId) => (
                              <StepImage key={imageId} imageId={imageId} />
                            ))}
                          </div>
                        </li>
                      ))}
                    </ol>
                  </section>
                ))}
              </div>
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
