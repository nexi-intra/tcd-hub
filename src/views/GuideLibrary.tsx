import { useState, useMemo, useEffect } from 'react'
import { useKV } from '@github/spark/hooks'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Plus, MagnifyingGlass, Books, Gear, ArrowLeft } from '@phosphor-icons/react'
import { Guide } from '@/lib/types'
import { GuideCard } from '@/components/GuideCard'
import { GuideDialog } from '@/components/GuideDialog'
import { GuideViewer } from '@/components/GuideViewer'
import { CategoryManager } from '@/components/CategoryManager'
import { UserProfile } from '@/components/UserProfile'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { toast, Toaster } from 'sonner'

const defaultCategories: string[] = ['Procedures', 'Technical', 'HR', 'Safety', 'General']

interface GuideLibraryProps {
  onNavigateBack: () => void
  onLogout: () => void
}

export function GuideLibrary({ onNavigateBack, onLogout }: GuideLibraryProps) {
  const [guides, setGuides] = useKV<Guide[]>('guides', [])
  const [categories, setCategories] = useKV<string[]>('categories', defaultCategories)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false)
  const [editGuide, setEditGuide] = useState<Guide | undefined>()
  const [viewGuide, setViewGuide] = useState<Guide | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<string>('All')

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onNavigateBack()
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onNavigateBack])

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
    <div className="min-h-screen relative overflow-hidden">
      
      <Toaster position="top-center" richColors />
      
      <div className="absolute top-6 right-6 left-6 z-20">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-16">
          <div className="flex items-center gap-3">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 }}
            >
              <Button
                variant="outline"
                size="lg"
                onClick={onNavigateBack}
                className="bg-background/80 backdrop-blur-sm hover:bg-background shadow-lg hover:shadow-xl transition-all duration-300 gap-2 font-semibold px-4"
              >
                <ArrowLeft size={20} weight="bold" />
                Tilbage
              </Button>
            </motion.div>
          </div>
          <div className="flex items-center gap-3">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <UserProfile userEmail="" onLogout={onLogout} />
            </motion.div>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto px-4 sm:px-6 pt-32 pb-12 sm:pb-20 max-w-7xl relative z-10">
        <header className="mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <motion.div 
                className="h-16 w-16 flex-shrink-0 rounded-3xl bg-gradient-to-br from-primary via-secondary to-accent shadow-2xl shadow-primary/30 flex items-center justify-center relative overflow-hidden"
                whileHover={{ scale: 1.08, rotate: 5 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/40 via-transparent to-accent/40 animate-pulse" />
                <Books size={32} weight="duotone" className="text-primary-foreground relative z-10" />
              </motion.div>
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight bg-gradient-to-br from-primary via-secondary to-accent bg-clip-text text-transparent">
                  Guide Bibliotek
                </h1>
                <p className="text-xs sm:text-sm md:text-base text-muted-foreground mt-1.5 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-gradient-to-r from-primary/15 to-secondary/15 text-primary font-semibold border border-primary/20 text-xs sm:text-sm">
                    {guides?.length || 0}
                  </span>
                  <span className="text-xs sm:text-sm">{(guides?.length || 0) === 1 ? 'guide' : 'guides'} tilgængelig</span>
                </p>
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0 items-center">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button onClick={handleAddNew} className="h-11 px-5 bg-gradient-to-r from-primary via-secondary to-primary hover:from-primary/90 hover:via-secondary/90 hover:to-primary/90 shadow-xl shadow-primary/30 font-semibold transition-all">
                  <Plus size={20} weight="bold" className="sm:mr-2" />
                  <span className="hidden sm:inline">Ny guide</span>
                </Button>
              </motion.div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-6">
            <div className="relative flex-1">
              <MagnifyingGlass
                size={20}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Søg i guides..."
                className="pl-12 h-14 text-base bg-card/80 backdrop-blur-md border-2 border-border/60 focus:border-primary/60 focus:ring-4 focus:ring-primary/10 rounded-2xl shadow-lg shadow-black/5 transition-all"
              />
            </div>
          </div>

          <Separator className="my-8" />

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex flex-wrap gap-3 flex-1">
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
                      'transition-all backdrop-blur-md font-semibold border-2 rounded-xl px-4 h-10',
                      activeCategory === category 
                        ? 'shadow-xl shadow-primary/30 bg-gradient-to-r from-primary via-secondary to-primary border-primary' 
                        : 'hover:bg-muted hover:border-primary/40 border-border'
                    )}
                  >
                    {category}
                    {category !== 'All' && (
                      <span className={cn(
                        "ml-2 px-2 py-0.5 rounded-lg text-xs font-bold",
                        activeCategory === category 
                          ? "bg-primary-foreground/20 text-primary-foreground" 
                          : "bg-primary/10 text-primary"
                      )}>
                        {(guides || []).filter((g) => g.category === category).length}
                      </span>
                    )}
                  </Button>
                </motion.div>
              ))}
            </div>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCategoryManagerOpen(true)}
                className="h-10 px-4 font-semibold border-2 rounded-xl backdrop-blur-md hover:bg-muted hover:border-primary/40"
              >
                <Gear size={18} weight="bold" className="sm:mr-2" />
                <span className="hidden sm:inline">Administrer kategorier</span>
                <span className="sm:hidden">Kategorier</span>
              </Button>
            </motion.div>
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
                y: [0, -12, 0],
              }}
              transition={{ 
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <div className="h-32 w-32 rounded-[2rem] bg-gradient-to-br from-primary via-secondary to-accent shadow-2xl shadow-primary/40 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/50 via-secondary/50 to-accent/50 blur-2xl animate-pulse" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,white,transparent)] opacity-20" />
                <Books size={64} weight="duotone" className="text-primary-foreground relative z-10 drop-shadow-lg" />
              </div>
            </motion.div>
            <h2 className="text-4xl font-bold bg-gradient-to-br from-primary via-secondary to-accent bg-clip-text text-transparent mb-4 text-center">
              {searchQuery || activeCategory !== 'All' ? 'Ingen guides fundet' : 'Ingen guides endnu'}
            </h2>
            <p className="text-muted-foreground text-center max-w-md mb-8 text-lg leading-relaxed">
              {searchQuery || activeCategory !== 'All'
                ? 'Prøv at justere dine filtre eller søgning'
                : 'Kom i gang ved at oprette din første guide'}
            </p>
            {!searchQuery && activeCategory === 'All' && (
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button onClick={handleAddNew} size="lg" className="h-14 px-8 text-base bg-gradient-to-r from-primary via-secondary to-primary hover:from-primary/90 hover:via-secondary/90 hover:to-primary/90 shadow-2xl shadow-primary/40 font-semibold rounded-2xl">
                  <Plus size={24} weight="bold" className="mr-2" />
                  Opret første guide
                </Button>
              </motion.div>
            )}
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
