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
import mammoth from 'mammoth'
import { toast } from 'sonner'

interface GuideDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (guide: Omit<Guide, 'id' | 'createdAt' | 'updatedAt'>) => void
  editGuide?: Guide
}

const categories: GuideCategory[] = ['Procedures', 'Technical', 'HR', 'Safety', 'General']

export function GuideDialog({ open, onOpenChange, onSave, editGuide }: GuideDialogProps) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<GuideCategory>('General')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState('')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editGuide) {
      setTitle(editGuide.title)
      setCategory(editGuide.category)
      setContent(editGuide.content)
      setTags(editGuide.tags.join(', '))
    } else {
      setTitle('')
      setCategory('General')
      setContent('')
      setTags('')
    }
    setUploadedFile(null)
  }, [editGuide, open])

  const handleSave = () => {
    if (!title.trim() || !content.trim()) return

    const tagArray = tags
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0)

    onSave({
      title: title.trim(),
      category,
      content: content.trim(),
      tags: tagArray,
    })

    setTitle('')
    setCategory('General')
    setContent('')
    setTags('')
    setUploadedFile(null)
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.docx') && !file.name.endsWith('.doc')) {
      toast.error('Kun Word-dokumenter (.doc, .docx) understøttes')
      return
    }

    setIsProcessing(true)
    setUploadedFile(file)

    try {
      const arrayBuffer = await file.arrayBuffer()
      const result = await mammoth.convertToHtml({ arrayBuffer })
      
      const tempDiv = document.createElement('div')
      tempDiv.innerHTML = result.value
      const extractedText = tempDiv.textContent || tempDiv.innerText || ''
      
      setContent(extractedText)
      
      if (!title.trim()) {
        const fileName = file.name.replace(/\.(docx?|DOCX?)$/, '')
        setTitle(fileName)
      }
      
      toast.success('Word-dokument indlæst!')
    } catch (error) {
      console.error('Error processing Word document:', error)
      toast.error('Kunne ikke læse Word-dokumentet')
      setUploadedFile(null)
    } finally {
      setIsProcessing(false)
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
            <Select value={category} onValueChange={(value) => setCategory(value as GuideCategory)}>
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
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="flex-1"
              >
                <Upload size={18} className="mr-2" />
                {isProcessing ? 'Behandler...' : uploadedFile ? 'Skift fil' : 'Vælg Word-fil'}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".doc,.docx"
                onChange={handleFileChange}
                className="hidden"
              />
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
            <Label htmlFor="content">Indhold</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Beskriv trinene eller informationen i denne guide..."
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
          <Button onClick={handleSave} disabled={!title.trim() || !content.trim()}>
            {editGuide ? 'Gem ændringer' : 'Opret guide'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
