import { useState, useMemo, useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Plus, MagnifyingGlass, ChatsCircle, Books, Gear, Bug } from '@phosphor-icons/react'
import { Guide, GuideCategory } from '@/lib/types'
import { GuideCard } from '@/components/GuideCard'
import { GuideDialog } from '@/components/GuideDialog'
import { GuideViewer } from '@/components/GuideViewer'
import { ChatAssistant } from '@/components/ChatAssistant'
import { CategoryManager } from '@/components/CategoryManager'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { toast, Toaster } from 'sonner'

const defaultCategories: string[] = ['Procedures', 'Technical', 'HR', 'Safety', 'General']

function App() {
  const [guides, setGuides] = useKV<Guide[]>('guides', [])
  const [categories, setCategories] = useKV<string[]>('categories', defaultCategories)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false)
  const [editGuide, setEditGuide] = useState<Guide | undefined>()
  const [viewGuide, setViewGuide] = useState<Guide | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<string>('All')
  const [showDebug, setShowDebug] = useState(false)

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

  useEffect(() => {
    if (showDebug) {
      console.log('=== DEBUG INFO ===')
      console.log('Total guides in storage:', guides?.length || 0)
      console.log('All guides:', guides)
      console.log('Active category:', activeCategory)
      console.log('Search query:', searchQuery)
      console.log('Filtered guides count:', filteredGuides.length)
      console.log('Filtered guides:', filteredGuides)
    }
  }, [guides, filteredGuides, activeCategory, searchQuery, showDebug])

  const handleSaveGuide = (guideData: Omit<Guide, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editGuide) {
      setGuides((currentGuides) =>
        (currentGuides || []).map((g) =>
          g.id === editGuide.id
            ? { 
                ...g, 
                title: guideData.title,
                category: guideData.category,
                content: guideData.content,
                tags: guideData.tags,
                fileUrl: guideData.fileUrl,
                wordFileName: guideData.wordFileName,
                fileSize: guideData.fileSize,
                updatedAt: Date.now() 
              }
            : g
        )
      )
      toast.success('Guide opdateret!')
    } else {
      const newGuide: Guide = {
        id: Date.now().toString(),
        title: guideData.title,
        category: guideData.category,
        content: guideData.content,
        tags: guideData.tags,
        fileUrl: guideData.fileUrl,
        wordFileName: guideData.wordFileName,
        fileSize: guideData.fileSize,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
      setGuides((currentGuides) => [newGuide, ...(currentGuides || [])])
      toast.success('Guide oprettet!')
    }
    setDialogOpen(false)
    setEditGuide(undefined)
  }

  const handleBulkSaveGuides = (guidesData: Array<Omit<Guide, 'id' | 'createdAt' | 'updatedAt'>>) => {
    const newGuides: Guide[] = guidesData.map((guideData, index) => ({
      id: (Date.now() + index).toString(),
      title: guideData.title,
      category: guideData.category,
      content: guideData.content,
      tags: guideData.tags,
      fileUrl: guideData.fileUrl,
      wordFileName: guideData.wordFileName,
      fileSize: guideData.fileSize,
      createdAt: Date.now() + index,
      updatedAt: Date.now() + index,
    }))
    setGuides((currentGuides) => [...newGuides, ...(currentGuides || [])])
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

  const handleViewGuide = (guide: Guide) => {
    setViewGuide(guide)
    setViewerOpen(true)
  }

  const handleUpdateCategories = (updatedCategories: string[]) => {
    setCategories(updatedCategories)
  }

  const allCategories = ['All', ...(categories || defaultCategories)]

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,oklch(0.35_0.15_285)_0%,transparent_50%),radial-gradient(circle_at_80%_80%,oklch(0.30_0.18_140)_0%,transparent_50%)] opacity-40 pointer-events-none" />
      <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,oklch(0.25_0.04_270)_2px,oklch(0.25_0.04_270)_4px)] opacity-[0.03] pointer-events-none" />
      
      <Toaster position="top-center" />
      
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8 max-w-7xl relative z-10">
        <header className="mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <motion.div 
                className="h-16 w-16 flex-shrink-0 rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-accent/50 flex items-center justify-center shadow-lg shadow-primary/20 ring-1 ring-primary/20"
                whileHover={{ scale: 1.05, rotate: 5 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <Books size={32} weight="duotone" className="text-primary-foreground" />
              </motion.div>
              <div className="min-w-0">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground">
                  Guide Bibliotek
                </h1>
                <p className="text-sm sm:text-base text-muted-foreground mt-1.5 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                    {guides?.length || 0}
                  </span>
                  {(guides?.length || 0) === 1 ? 'guide' : 'guides'} tilgængelig
                </p>
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  onClick={() => setShowDebug(!showDebug)}
                  variant="outline"
                  size="icon"
                  className={cn(
                    "h-10 w-10 backdrop-blur-sm",
                    showDebug && "bg-accent/20 border-accent/40 shadow-lg shadow-accent/10"
                  )}
                  title="Debug mode - Open console to see guide data"
                >
                  <Bug size={18} weight={showDebug ? "fill" : "regular"} />
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  onClick={() => setCategoryManagerOpen(true)}
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 backdrop-blur-sm hover:bg-secondary/80 hover:border-secondary"
                >
                  <Gear size={18} weight="duotone" />
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  onClick={() => setChatOpen(true)}
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 bg-accent/10 hover:bg-accent/20 border-accent/30 hover:border-accent shadow-lg shadow-accent/10 backdrop-blur-sm"
                >
                  <ChatsCircle size={18} weight="duotone" className="text-accent" />
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button onClick={handleAddNew} className="h-10 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20">
                  <Plus size={18} weight="bold" className="sm:mr-2" />
                  <span className="hidden sm:inline">Ny guide</span>
                </Button>
              </motion.div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <MagnifyingGlass
                size={20}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Søg i guides..."
                className="pl-12 h-12 text-base bg-card/50 backdrop-blur-sm border-border/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <Separator className="my-6" />

          <div className="flex flex-wrap gap-2">
            {allCategories.map((category) => (
              <motion.div 
                key={category}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  variant={activeCategory === category ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveCategory(category)}
                  className={cn(
                    'transition-all backdrop-blur-sm font-medium',
                    activeCategory === category 
                      ? 'shadow-lg shadow-primary/20 bg-gradient-to-r from-primary to-primary/80' 
                      : 'hover:bg-secondary/50 hover:border-secondary'
                  )}
                >
                  {category}
                  {category !== 'All' && (
                    <span className={cn(
                      "ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-semibold",
                      activeCategory === category 
                        ? "bg-primary-foreground/20" 
                        : "bg-muted"
                    )}>
                      {(guides || []).filter((g) => g.category === category).length}
                    </span>
                  )}
                </Button>
              </motion.div>
            ))}
          </div>
        </header>

        {filteredGuides.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-24 px-4"
          >
            <motion.div 
              className="relative mb-8"
              animate={{ 
                y: [0, -10, 0],
              }}
              transition={{ 
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <div className="h-28 w-28 rounded-3xl bg-gradient-to-br from-primary via-primary/80 to-accent/60 flex items-center justify-center shadow-2xl shadow-primary/30 relative">
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/20 to-accent/20 blur-xl animate-pulse" />
                <Books size={56} weight="duotone" className="text-primary-foreground relative z-10" />
              </div>
            </motion.div>
            <h2 className="text-3xl font-bold text-foreground mb-3 text-center">
              {searchQuery || activeCategory !== 'All' ? 'Ingen guides fundet' : 'Ingen guides endnu'}
            </h2>
            <p className="text-muted-foreground text-center max-w-md mb-8 text-lg">
              {searchQuery || activeCategory !== 'All'
                ? 'Prøv at justere dine filtre eller søgning'
                : 'Kom i gang ved at oprette din første guide'}
            </p>
            {!searchQuery && activeCategory === 'All' && (
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button onClick={handleAddNew} size="lg" className="h-12 px-8 text-base bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-xl shadow-primary/30">
                  <Plus size={22} weight="bold" className="mr-2" />
                  Opret første guide
                </Button>
              </motion.div>
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
                  onView={handleViewGuide}
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
        onBulkSave={handleBulkSaveGuides}
        editGuide={editGuide}
        categories={categories || defaultCategories}
      />

      <GuideViewer
        guide={viewGuide}
        open={viewerOpen}
        onOpenChange={(open) => {
          setViewerOpen(open)
          if (!open) setViewGuide(null)
        }}
      />

      <ChatAssistant open={chatOpen} onOpenChange={setChatOpen} guides={guides || []} />

      <CategoryManager
        open={categoryManagerOpen}
        onOpenChange={setCategoryManagerOpen}
        categories={categories || defaultCategories}
        onUpdateCategories={handleUpdateCategories}
        guides={guides || []}
      />
    </div>
  )
}

export default App
