import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DownloadSimple, X } from '@phosphor-icons/react'
import { Guide } from '@/lib/types'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import mammoth from 'mammoth'

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
  const [htmlContent, setHtmlContent] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const loadWordContent = async () => {
      if (!guide?.wordFileData || !open) {
        setHtmlContent('')
        return
      }

      setIsLoading(true)
      try {
        const binaryString = atob(guide.wordFileData)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }
        
        const arrayBuffer = bytes.buffer
        const result = await mammoth.convertToHtml({ arrayBuffer }, {
          styleMap: [
            "p[style-name='Heading 1'] => h1:fresh",
            "p[style-name='Heading 2'] => h2:fresh",
            "p[style-name='Heading 3'] => h3:fresh",
            "p[style-name='Heading 4'] => h4:fresh",
            "p[style-name='Heading 5'] => h5:fresh",
            "p[style-name='Heading 6'] => h6:fresh",
            "p[style-name='Title'] => h1.title:fresh",
            "p[style-name='Subtitle'] => p.subtitle:fresh",
            "r[style-name='Strong'] => strong",
            "r[style-name='Emphasis'] => em",
          ],
          convertImage: mammoth.images.imgElement((image) => {
            return image.read('base64').then((imageBuffer) => {
              return {
                src: `data:${image.contentType};base64,${imageBuffer}`,
              }
            })
          }),
          includeDefaultStyleMap: true,
          ignoreEmptyParagraphs: false,
        })
        
        setHtmlContent(result.value)
        
        if (result.messages.length > 0) {
          console.log('Mammoth conversion messages:', result.messages)
        }
      } catch (error) {
        console.error('Error loading Word document:', error)
        toast.error('Kunne ikke indlæse Word-dokumentet')
        setHtmlContent(`<p class="text-muted-foreground">${guide.content}</p>`)
      } finally {
        setIsLoading(false)
      }
    }

    loadWordContent()
  }, [guide, open])

  const handleDownload = () => {
    if (!guide?.wordFileData || !guide?.wordFileName) {
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

  if (!guide) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-2xl mb-3 break-words">
                {guide.title}
              </DialogTitle>
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
            {guide.wordFileData && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="flex-shrink-0"
              >
                <DownloadSimple size={16} weight="regular" className="mr-2" />
                Download
              </Button>
            )}
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto min-h-0 px-6 py-6 bg-card">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-muted-foreground">Indlæser dokument...</div>
            </div>
          ) : guide.wordFileData && htmlContent ? (
            <div 
              className="word-content max-w-none bg-background rounded-lg shadow-sm border border-border p-8 sm:p-12"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          ) : (
            <div className="max-w-none bg-background rounded-lg shadow-sm border border-border p-8 sm:p-12">
              <p className="whitespace-pre-wrap break-words">{guide.content}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
