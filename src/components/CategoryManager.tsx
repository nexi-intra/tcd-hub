import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Trash, Plus, PencilSimple, Check, X } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface CategoryManagerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: string[]
  onUpdateCategories: (categories: string[]) => void
  guides: any[]
}

export function CategoryManager({
  open,
  onOpenChange,
  categories,
  onUpdateCategories,
  guides,
}: CategoryManagerProps) {
  const [newCategory, setNewCategory] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  const handleAddCategory = () => {
    const trimmed = newCategory.trim()
    if (!trimmed) {
      toast.error('Kategoriavn kan ikke være tomt')
      return
    }
    if (categories.includes(trimmed)) {
      toast.error('Denne kategori eksisterer allerede')
      return
    }
    onUpdateCategories([...categories, trimmed])
    setNewCategory('')
    toast.success('Kategori tilføjet!')
  }

  const handleDeleteCategory = (category: string) => {
    const guidesInCategory = guides.filter((g) => g.category === category)
    if (guidesInCategory.length > 0) {
      toast.error(`Kan ikke slette: ${guidesInCategory.length} guide(r) bruger denne kategori`)
      return
    }
    onUpdateCategories(categories.filter((c) => c !== category))
    toast.success('Kategori slettet!')
  }

  const handleStartEdit = (category: string) => {
    setEditingId(category)
    setEditValue(category)
  }

  const handleSaveEdit = (oldCategory: string) => {
    const trimmed = editValue.trim()
    if (!trimmed) {
      toast.error('Kategoriavn kan ikke være tomt')
      return
    }
    if (trimmed !== oldCategory && categories.includes(trimmed)) {
      toast.error('Denne kategori eksisterer allerede')
      return
    }
    const newCategories = categories.map((c) => (c === oldCategory ? trimmed : c))
    onUpdateCategories(newCategories)
    setEditingId(null)
    toast.success('Kategori opdateret!')
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditValue('')
  }

  const getCategoryCount = (category: string) => {
    return guides.filter((g) => g.category === category).length
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl">Administrer kategorier</DialogTitle>
          <DialogDescription>
            Tilføj, rediger eller slet kategorier til dine guides
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-category">Tilføj ny kategori</Label>
              <div className="flex gap-2">
                <Input
                  id="new-category"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="Skriv kategorinavn..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddCategory()
                  }}
                />
                <Button onClick={handleAddCategory} size="icon" className="shrink-0">
                  <Plus size={18} weight="bold" />
                </Button>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Eksisterende kategorier ({categories.length})</Label>
              <div className="space-y-2">
                {categories.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Ingen kategorier endnu
                  </div>
                ) : (
                  categories.map((category) => {
                    const count = getCategoryCount(category)
                    const isEditing = editingId === category

                    return (
                      <div
                        key={category}
                        className={cn(
                          'flex items-center gap-2 p-3 rounded-lg border bg-card',
                          isEditing && 'border-primary'
                        )}
                      >
                        {isEditing ? (
                          <>
                            <Input
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="flex-1"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEdit(category)
                                if (e.key === 'Escape') handleCancelEdit()
                              }}
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              className="shrink-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() => handleSaveEdit(category)}
                            >
                              <Check size={18} weight="bold" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="shrink-0"
                              onClick={handleCancelEdit}
                            >
                              <X size={18} weight="bold" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <div className="flex-1">
                              <div className="font-medium">{category}</div>
                              <div className="text-xs text-muted-foreground">
                                {count} {count === 1 ? 'guide' : 'guides'}
                              </div>
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="shrink-0"
                              onClick={() => handleStartEdit(category)}
                            >
                              <PencilSimple size={18} />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleDeleteCategory(category)}
                              disabled={count > 0}
                            >
                              <Trash size={18} />
                            </Button>
                          </>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        <Separator />

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Luk
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
