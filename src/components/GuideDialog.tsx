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
import { fileStorage } from '@/lib/fileStorage'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface GuideDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (guide: Omit<Guide, 'id' | 'createdAt' | 'updatedAt'>) => void
  onBulkSave?: (guides: Array<Omit<Guide, 'id' | 'createdAt' | 'updatedAt'>>) => void
  editGuide?: Guide
  categories: string[]
}

export function GuideDialog({ open, onOpenChange, onSave, onBulkSave, editGuide, categories }: GuideDialogProps) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<string>(categories[0] || 'General')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState('')
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
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
    setUploadedFiles([])
  }, [editGuide, open, categories])

  const handleSave = async () => {
    const hasWordFiles = uploadedFiles.length > 0 || editGuide?.fileUrl
    const hasContent = content.trim()
    
    if (uploadedFiles.length > 1 && onBulkSave) {
      await handleBulkSave()
      return
    }

    if (!title.trim() || (!hasWordFiles && !hasContent)) {
      toast.error('Titel og enten indhold eller Word-dokument er påkrævet')
      return
    }

    const tagArray = tags
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0)

    let fileUrl: string | undefined
    let wordFileName: string | undefined
    let fileSize: number | undefined

    if (uploadedFiles.length > 0) {
      try {
        setIsProcessing(true)
        const file = uploadedFiles[0]
        const storedFile = await fileStorage.uploadFile(file)
        fileUrl = storedFile.url
        wordFileName = storedFile.filename
        fileSize = storedFile.size
        toast.success('Fil uploaded til cloud storage!')
      } catch (error) {
        console.error('Error uploading file:', error)
        toast.error('Kunne ikke uploade filen')
        setIsProcessing(false)
        return
      } finally {
        setIsProcessing(false)
      }
    } else if (editGuide?.fileUrl) {
      fileUrl = editGuide.fileUrl
      wordFileName = editGuide.wordFileName
      fileSize = editGuide.fileSize
    }

    onSave({
      title: title.trim(),
      category: category as GuideCategory,
      content: hasContent ? content.trim() : 'Se vedhæftet Word-dokument',
      tags: tagArray,
      fileUrl,
      wordFileName,
      fileSize,
    })

    setTitle('')
    setCategory(categories[0] || 'General')
    setContent('')
    setTags('')
    setUploadedFiles([])
  }

  const handleBulkSave = async () => {
    if (!onBulkSave || uploadedFiles.length === 0) return

    setIsProcessing(true)
    const tagArray = tags
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0)

    try {
      const guides = await Promise.all(
        uploadedFiles.map(async (file) => {
          const storedFile = await fileStorage.uploadFile(file)
          const fileName = file.name.replace(/\.(docx?|DOCX?)$/, '')

          return {
            title: fileName,
            category: category as GuideCategory,
            content: 'Se vedhæftet Word-dokument',
            tags: tagArray,
            fileUrl: storedFile.url,
            wordFileName: storedFile.filename,
            fileSize: storedFile.size,
          }
        })
      )

      onBulkSave(guides)
      toast.success(`${uploadedFiles.length} guides oprettet og uploaded til cloud storage!`)
      
      setTitle('')
      setCategory(categories[0] || 'General')
      setContent('')
      setTags('')
      setUploadedFiles([])
      onOpenChange(false)
    } catch (error) {
      console.error('Error processing files:', error)
      toast.error('Kunne ikke behandle alle filer')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      await processFiles(Array.from(files))
    }
  }

  const processFiles = async (files: File[]) => {
    const wordFiles = files.filter(file => 
      file.name.endsWith('.docx') || file.name.endsWith('.doc')
    )

    if (wordFiles.length === 0) {
      toast.error('Kun Word-dokumenter (.doc, .docx) understøttes')
      return
    }

    if (wordFiles.length !== files.length) {
      toast.warning(`${files.length - wordFiles.length} fil(er) sprunget over (kun Word-filer)`)
    }

    setIsProcessing(true)
    setUploadedFiles(wordFiles)

    try {
      if (!title.trim() && wordFiles.length === 1) {
        const fileName = wordFiles[0].name.replace(/\.(docx?|DOCX?)$/, '')
        setTitle(fileName)
      }
      
      toast.success(
        wordFiles.length === 1
          ? 'Word-dokument vedhæftet!'
          : `${wordFiles.length} Word-dokumenter vedhæftet!`
      )
    } catch (error) {
      console.error('Error processing Word documents:', error)
      toast.error('Kunne ikke vedhæfte Word-dokumenter')
      setUploadedFiles([])
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

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      await processFiles(files)
    }
  }

  const handleRemoveFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index))
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const isBulkMode = uploadedFiles.length > 1

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {editGuide ? 'Rediger guide' : isBulkMode ? 'Bulk upload af guides' : 'Ny guide'}
          </DialogTitle>
          <DialogDescription>
            {editGuide
              ? 'Opdater oplysningerne for denne guide.'
              : isBulkMode
              ? `Opret ${uploadedFiles.length} guides fra Word-dokumenter.`
              : 'Tilføj en ny guide til dit afdelingsleksikon.'}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {!isBulkMode && (
            <div className="grid gap-2">
              <Label htmlFor="title">Titel</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="F.eks. Sådan nulstiller du en adgangskode"
              />
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="category">Kategori {isBulkMode && <span className="text-muted-foreground">(anvendes på alle)</span>}</Label>
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
            <Label>Upload Word-dokument{isBulkMode ? 'er' : ''} {!isBulkMode && '(valgfrit)'}</Label>
            {editGuide?.fileUrl && uploadedFiles.length === 0 && (
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
                      ? 'Slip filerne her'
                      : isProcessing
                      ? 'Behandler dokumenter...'
                      : editGuide?.fileUrl
                      ? 'Upload nyt Word-dokument for at erstatte'
                      : 'Træk og slip Word-filer her'}
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
                  Vælg fil(er) fra computer
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".doc,.docx"
                  onChange={handleFileChange}
                  className="hidden"
                  multiple
                />
                <p className="text-xs text-muted-foreground">
                  .doc eller .docx filer understøttes • Vælg flere for bulk upload
                </p>
              </div>
            </div>
            {uploadedFiles.length > 0 && (
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {uploadedFiles.map((file, index) => (
                  <div key={index} className="flex items-center gap-2 p-3 rounded-lg bg-accent/10 border border-accent/20">
                    <FileDoc size={20} weight="duotone" className="text-accent-foreground flex-shrink-0" />
                    <span className="text-sm flex-1 truncate">{file.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveFile(index)}
                      className="h-6 w-6 flex-shrink-0"
                    >
                      <X size={16} />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {!isBulkMode && (
            <div className="grid gap-2">
              <Label htmlFor="content">
                Indhold {(uploadedFiles.length > 0 || editGuide?.fileUrl) && <span className="text-muted-foreground font-normal">(valgfrit)</span>}
              </Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={
                  uploadedFiles.length > 0 || editGuide?.fileUrl
                    ? "Tilføj ekstra noter eller lad være tom hvis Word-dokumentet indeholder alt..."
                    : "Beskriv trinene eller informationen i denne guide..."
                }
                className="min-h-[200px] resize-none"
              />
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="tags">Tags (adskilt med komma) {isBulkMode && <span className="text-muted-foreground">(anvendes på alle)</span>}</Label>
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
            disabled={
              isProcessing || 
              (!isBulkMode && !title.trim()) || 
              (!isBulkMode && !content.trim() && uploadedFiles.length === 0 && !editGuide?.fileUrl)
            }
          >
            {isProcessing 
              ? 'Behandler...' 
              : editGuide 
              ? 'Gem ændringer' 
              : isBulkMode 
              ? `Opret ${uploadedFiles.length} guides`
              : 'Opret guide'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
