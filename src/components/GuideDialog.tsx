import { useState, useEffect, useRef } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Guide, GuideCategory } from '@/lib/types'
import { Upload, FileDoc, X } from '@phosphor-icons/react'

import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface GuideDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (guide: Omit<Guide, 'id' | 'createdAt' | 'updatedAt'> & { wordFileData?: string; wordFileName?: string }) => void
  editGuide?: Guide
  categories: string[]
}

export function GuideDialog({ open, onOpenChange, onSave, editGuide, categories }: GuideDialogProps) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<string>(categories[0] || 'General')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState('')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editGuide) {
      setTitle(editGuide.title)
      setCategory(editGuide.category)
      setContent(editGuide.content)
      setTags(editGuide.tags.join(', '))
    } else {
      setTitle('')
      setCategory(categories[0] || 'General')
      setContent('')
      setTags('')
    }
    setUploadedFile(null)
  }, [editGuide, open, categories])

  const handleSave = async () => {
    const hasWordFile = uploadedFile || editGuide?.wordFileData
    const hasContent = content.trim()
    
    if (!title.trim() || (!hasWordFile && !hasContent)) {
      toast.error('Titel og enten indhold eller Word-dokument er påkrævet')
      return
    }

    const tagArray = tags
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0)

    let wordFileData: string | undefined
    let wordFileName: string | undefined

    if (uploadedFile) {
      const arrayBuffer = await uploadedFile.arrayBuffer()
      const bytes = new Uint8Array(arrayBuffer)
      const binary = Array.from(bytes, byte => String.fromCharCode(byte)).join('')
      wordFileData = btoa(binary)
      wordFileName = uploadedFile.name
    } else if (editGuide?.wordFileData) {
      wordFileData = editGuide.wordFileData
      wordFileName = editGuide.wordFileName
    }

    onSave({
      title: title.trim(),
      category: category as GuideCategory,
      content: hasContent ? content.trim() : 'Se vedhæftet Word-dokument',
      tags: tagArray,
      wordFileData,
      wordFileName,
    })

    setTitle('')
    setCategory(categories[0] || 'General')
    setContent('')
    setTags('')
    setUploadedFile(null)
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      await processFile(file)
    }
  }

  const processFile = async (file: File) => {
    if (!file.name.endsWith('.docx') && !file.name.endsWith('.doc')) {
      toast.error('Kun Word-dokumenter (.doc, .docx) understøttes')
      return
    }

    setIsProcessing(true)
    setUploadedFile(file)

    try {
      if (!title.trim()) {
        const fileName = file.name.replace(/\.(docx?|DOCX?)$/, '')
        setTitle(fileName)
      }
      
      toast.success('Word-dokument vedhæftet!')
    } catch (error) {
      console.error('Error processing Word document:', error)
      toast.error('Kunne ikke vedhæfte Word-dokumentet')
      setUploadedFile(null)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const file = e.dataTransfer.files?.[0]
    if (file) {
      await processFile(file)
    }
  }

  const handleRemoveFile = () => {
    setUploadedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {editGuide ? 'Rediger guide' : 'Ny guide'}
          </DialogTitle>
          <DialogDescription>
            {editGuide
              ? 'Opdater oplysningerne for denne guide.'
              : 'Tilføj en ny guide til dit afdelingsleksikon.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Titel</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="F.eks. Sådan nulstiller du en adgangskode"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="category">Kategori</Label>
            <Select value={category} onValueChange={(value) => setCategory(value)}>
              <SelectTrigger id="category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid gap-2">
            <Label>Upload Word-dokument (valgfrit)</Label>
            {editGuide?.wordFileData && !uploadedFile && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20 mb-2">
                <FileDoc size={20} weight="duotone" className="text-primary flex-shrink-0" />
                <span className="text-sm flex-1 truncate">{editGuide.wordFileName || 'Eksisterende Word-dokument'}</span>
                <span className="text-xs text-muted-foreground">(gemmes automatisk)</span>
              </div>
            )}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                'relative rounded-lg border-2 border-dashed transition-all',
                isDragging
                  ? 'border-primary bg-primary/5 scale-[1.02]'
                  : 'border-border bg-muted/30',
                isProcessing && 'opacity-50 pointer-events-none'
              )}
            >
              <div className="p-6 flex flex-col items-center gap-3">
                <div
                  className={cn(
                    'h-12 w-12 rounded-full flex items-center justify-center transition-all',
                    isDragging ? 'bg-primary/20' : 'bg-accent/20'
                  )}
                >
                  <Upload
                    size={24}
                    weight="duotone"
                    className={cn(
                      'transition-colors',
                      isDragging ? 'text-primary' : 'text-accent-foreground'
                    )}
                  />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground mb-1">
                    {isDragging
                      ? 'Slip filen her'
                      : isProcessing
                      ? 'Behandler dokument...'
                      : editGuide?.wordFileData
                      ? 'Upload nyt Word-dokument for at erstatte'
                      : 'Træk og slip Word-fil her'}
                  </p>
                  <p className="text-xs text-muted-foreground">eller</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                >
                  Vælg fil fra computer
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".doc,.docx"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <p className="text-xs text-muted-foreground">
                  .doc eller .docx filer understøttes
                </p>
              </div>
            </div>
            {uploadedFile && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-accent/10 border border-accent/20">
                <FileDoc size={20} weight="duotone" className="text-accent-foreground flex-shrink-0" />
                <span className="text-sm flex-1 truncate">{uploadedFile.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleRemoveFile}
                  className="h-6 w-6 flex-shrink-0"
                >
                  <X size={16} />
                </Button>
              </div>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="content">
              Indhold {(uploadedFile || editGuide?.wordFileData) && <span className="text-muted-foreground font-normal">(valgfrit)</span>}
            </Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={
                uploadedFile || editGuide?.wordFileData
                  ? "Tilføj ekstra noter eller lad være tom hvis Word-dokumentet indeholder alt..."
                  : "Beskriv trinene eller informationen i denne guide..."
              }
              className="min-h-[200px] resize-none"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="tags">Tags (adskilt med komma)</Label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="adgangskode, it-support, login"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuller
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!title.trim() || (!content.trim() && !uploadedFile && !editGuide?.wordFileData)}
          >
            {editGuide ? 'Gem ændringer' : 'Opret guide'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
