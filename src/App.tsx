import { useState, useMemo } from 'react'
import { useKV } from '@github/spark/hooks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Plus, MagnifyingGlass, ChatsCircle, Books } from '@phosphor-icons/react'
import { Guide, GuideCategory } from '@/lib/types'
import { GuideCard } from '@/components/GuideCard'
import { GuideDialog } from '@/components/GuideDialog'
import { ChatAssistant } from '@/components/ChatAssistant'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { toast, Toaster } from 'sonner'

const categories: (GuideCategory | 'All')[] = ['All', 'Procedures', 'Technical', 'HR', 'Safety', 'General']

function App() {
  const [guides, setGuides] = useKV<Guide[]>('guides', [])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [editGuide, setEditGuide] = useState<Guide | undefined>()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<GuideCategory | 'All'>('All')

  const filteredGuides = useMemo(() => {
    if (!guides) return []
    return guides.filter((guide) => {
      const matchesCategory = activeCategory === 'All' || guide.category === activeCategory
      const matchesSearch =
        searchQuery === '' ||
        guide.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        guide.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        guide.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      return matchesCategory && matchesSearch
    })
  }, [guides, activeCategory, searchQuery])

  const handleSaveGuide = (guideData: Omit<Guide, 'id' | 'createdAt' | 'updatedAt'> & { wordFileData?: string; wordFileName?: string }) => {
    if (editGuide) {
      setGuides((currentGuides) =>
        (currentGuides || []).map((g) =>
          g.id === editGuide.id
            ? { ...g, ...guideData, updatedAt: Date.now() }
            : g
        )
      )
      toast.success('Guide opdateret!')
    } else {
      const newGuide: Guide = {
        ...guideData,
        id: Date.now().toString(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      setGuides((currentGuides) => [newGuide, ...(currentGuides || [])])
      toast.success('Guide oprettet!')
    }
    setDialogOpen(false)
    setEditGuide(undefined)
  }

  const handleEditGuide = (guide: Guide) => {
    setEditGuide(guide)
    setDialogOpen(true)
  }

  const handleDeleteGuide = (id: string) => {
    setGuides((currentGuides) => (currentGuides || []).filter((g) => g.id !== id))
    toast.success('Guide slettet!')
  }

  const handleAddNew = () => {
    setEditGuide(undefined)
    setDialogOpen(true)
  }

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-center" />
      
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-7xl">
        <header className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Books size={28} weight="duotone" className="text-primary" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
                  Guide Bibliotek
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {guides?.length || 0} {(guides?.length || 0) === 1 ? 'guide' : 'guides'} tilgængelig
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setChatOpen(true)}
                variant="outline"
                size="icon"
                className="h-11 w-11 bg-accent/10 hover:bg-accent/20 border-accent/20"
              >
                <ChatsCircle size={20} weight="duotone" className="text-accent-foreground" />
              </Button>
              <Button onClick={handleAddNew} className="h-11">
                <Plus size={20} weight="bold" className="sm:mr-2" />
                <span className="hidden sm:inline">Ny guide</span>
              </Button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <MagnifyingGlass
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Søg i guides..."
                className="pl-10 h-11"
              />
            </div>
          </div>

          <Separator className="my-6" />

          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Button
                key={category}
                variant={activeCategory === category ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveCategory(category)}
                className={cn(
                  'transition-all',
                  activeCategory === category && 'shadow-sm'
                )}
              >
                {category}
                {category !== 'All' && (
                  <span className="ml-1.5 text-xs opacity-70">
                    ({(guides || []).filter((g) => g.category === category).length})
                  </span>
                )}
              </Button>
            ))}
          </div>
        </header>

        {filteredGuides.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 px-4"
          >
            <div className="h-20 w-20 rounded-2xl bg-muted flex items-center justify-center mb-6">
              <Books size={40} weight="duotone" className="text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-medium text-foreground mb-2">
              {searchQuery || activeCategory !== 'All' ? 'Ingen guides fundet' : 'Ingen guides endnu'}
            </h2>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              {searchQuery || activeCategory !== 'All'
                ? 'Prøv at justere dine filtre eller søgning'
                : 'Kom i gang ved at oprette din første guide'}
            </p>
            {!searchQuery && activeCategory === 'All' && (
              <Button onClick={handleAddNew} size="lg">
                <Plus size={20} weight="bold" className="mr-2" />
                Opret første guide
              </Button>
            )}
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {filteredGuides.map((guide) => (
                <GuideCard
                  key={guide.id}
                  guide={guide}
                  onEdit={handleEditGuide}
                  onDelete={handleDeleteGuide}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <GuideDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) setEditGuide(undefined)
        }}
        onSave={handleSaveGuide}
        editGuide={editGuide}
      />

      <ChatAssistant open={chatOpen} onOpenChange={setChatOpen} guides={guides || []} />
    </div>
  )
}

export default App
