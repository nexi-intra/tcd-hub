import { useState, useEffect } from 'react'
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
