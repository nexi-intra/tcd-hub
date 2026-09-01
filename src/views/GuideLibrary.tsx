import { useState, useMemo, useEffect } from 'react'
import { useKV } from '@/hooks/useKV'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Plus, MagnifyingGlass, Books, Gear, ArrowLeft, Timer, FolderOpen, ChatCircleDots } from '@phosphor-icons/react'
import { Guide } from '@/lib/types'
import { guidePlainText, getReviewStatus, computeNextReviewAt } from '@/lib/guideTypes'
import { GuideSearchIndex } from '@/lib/searchIndex'
import { deleteGuideArtifacts } from '@/lib/guideStore'
import { guideToDocModel, resolveAuthorName } from '@/lib/docModel'
import { isExportAvailable, getExportRoot, chooseAndSaveExportRoot, exportGuideToLibrary } from '@/lib/guideExporter'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { GuideCard } from '@/components/GuideCard'
import { GuideEditor } from '@/components/GuideEditor'
import { GuideViewer } from '@/components/GuideViewer'
import { GuideChat } from '@/components/GuideChat'
import { CategoryManager } from '@/components/CategoryManager'
import { UserProfile } from '@/components/UserProfile'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { toast, Toaster } from 'sonner'

const defaultCategories: string[] = ['Procedures', 'Technical', 'HR', 'Safety', 'General']

interface GuideLibraryProps {
  onNavigateBack: () => void
  onLogout: () => void
  userEmail: string
}

export function GuideLibrary({ onNavigateBack, onLogout, userEmail }: GuideLibraryProps) {
  const [guides, setGuides] = useKV<Guide[]>('guides', [])
  const [categories, setCategories] = useKV<string[]>('categories', defaultCategories)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [viewerOpen, setViewerOpen] = useState(false)
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false)
  const [editGuide, setEditGuide] = useState<Guide | undefined>()
  const [viewGuide, setViewGuide] = useState<Guide | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<string>('All')
  const [showNeedsReview, setShowNeedsReview] = useState(false)
  const [exportDialogOpen, setExportDialogOpen] = useState(false)
  const [exportRoot, setExportRootState] = useState<string | null>(null)
  const [isExportingAll, setIsExportingAll] = useState(false)
  const [exportProgress, setExportProgress] = useState('')
  const [chatOpen, setChatOpen] = useState(false)

  useEffect(() => {
    if (exportDialogOpen) {
      getExportRoot().then(setExportRootState).catch(() => setExportRootState(null))
    }
  }, [exportDialogOpen])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onNavigateBack()
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onNavigateBack])

  const needsReviewCount = useMemo(() => {
    return (guides || []).filter((g) => {
      const status = getReviewStatus(g)
      return status === 'overdue' || status === 'due-soon'
    }).length
  }, [guides])

  // BM25-indeks over alle guides — genbygges når guides ændrer sig (også fra andre klienter via useKV).
  const searchIndex = useMemo(() => {
    const index = new GuideSearchIndex()
    index.build(guides || [])
    return index
  }, [guides])

  const searchResults = useMemo(
    () => (searchQuery.trim() ? searchIndex.searchGuides(searchQuery, 100) : null),
    [searchIndex, searchQuery]
  )

  const filteredGuides = useMemo(() => {
    if (!guides) return []
    const matchesFilters = (guide: Guide) => {
      const matchesCategory = activeCategory === 'All' || guide.category === activeCategory
      if (!matchesCategory) return false
      if (showNeedsReview) {
        const status = getReviewStatus(guide)
        return status === 'overdue' || status === 'due-soon'
      }
      return true
    }

    if (searchResults) {
      const resultById = new Map(searchResults.map((r) => [r.guideId, r]))
      let list = guides.filter((g) => resultById.has(g.id) && matchesFilters(g))
      list.sort((a, b) => (resultById.get(b.id)?.score || 0) - (resultById.get(a.id)?.score || 0))
      if (list.length === 0) {
        // Fallback: simpel substring (fx meget korte søgninger som "3500")
        list = guides.filter((g) => matchesFilters(g) && guidePlainText(g).toLowerCase().includes(searchQuery.toLowerCase()))
      }
      return list
    }

    const filtered = guides.filter(matchesFilters)
    if (showNeedsReview) {
      // Mest presserende først.
      return [...filtered].sort((a, b) => (a.nextReviewAt || 0) - (b.nextReviewAt || 0))
    }
    return filtered
  }, [guides, activeCategory, showNeedsReview, searchQuery, searchResults])

  const matchInfoById = useMemo(() => {
    if (!searchResults) return new Map<string, { reference: string; text: string; relevance: number }>()
    return new Map(searchResults.map((r) => [r.guideId, {
      reference: r.bestChunk.stepNumber ? `§${r.bestChunk.stepNumber}` : r.bestChunk.sectionNumber ? `§${r.bestChunk.sectionNumber}` : '',
      text: r.bestChunk.text.length > 140 ? r.bestChunk.text.slice(0, 140) + '…' : r.bestChunk.text,
      relevance: Math.round(r.normalizedScore * 100),
    }]))
  }, [searchResults])

  const handleMarkReviewed = (guide: Guide) => {
    const now = Date.now()
    setGuides((currentGuides) => (currentGuides || []).map((g) => g.id === guide.id
      ? { ...g, lastReviewedAt: now, nextReviewAt: computeNextReviewAt(now, g.reviewIntervalMonths) }
      : g))
    toast.success(`"${guide.title}" markeret som gennemgået — timeren er nulstillet`)
  }

  const handleSaveGuide = (guide: Guide) => {
    const isEdit = (guides || []).some((g) => g.id === guide.id)
    if (isEdit) {
      setGuides((currentGuides) => (currentGuides || []).map((g) => (g.id === guide.id ? guide : g)))
      toast.success(`Guide opdateret (v${guide.version})`)
    } else {
      setGuides((currentGuides) => [guide, ...(currentGuides || [])])
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
    const guide = (guides || []).find((g) => g.id === id)
    setGuides((currentGuides) => (currentGuides || []).filter((g) => g.id !== id))
    if (guide) {
      // Ryd versionshistorik og billeder i baggrunden.
      deleteGuideArtifacts(guide).catch((error) => console.error('Oprydning fejlede:', error))
    }
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

  const handleOpenGuideFromChat = (guideId: string) => {
    const guide = (guides || []).find((g) => g.id === guideId)
    if (guide) {
      setViewGuide(guide)
      setViewerOpen(true)
    } else {
      toast.error('Guiden findes ikke længere')
    }
  }

  const handleChooseExportRoot = async () => {
    try {
      const root = await chooseAndSaveExportRoot()
      if (root) {
        setExportRootState(root)
        toast.success('Eksport-mappe valgt')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Kunne ikke vælge mappe')
    }
  }

  const handleExportAll = async () => {
    if (!exportRoot) {
      toast.error('Vælg først en eksport-mappe')
      return
    }
    const exportable = (guides || []).map(guideToDocModel).filter((m) => m.sections.length > 0)
    if (exportable.length === 0) {
      toast.error('Ingen guides med sektioner at eksportere')
      return
    }
    setIsExportingAll(true)
    let ok = 0
    let failed = 0
    for (let i = 0; i < exportable.length; i++) {
      const model = exportable[i]
      setExportProgress(`Eksporterer ${i + 1}/${exportable.length}: ${model.title}`)
      try {
        const authorName = await resolveAuthorName(model.authorEmail)
        await exportGuideToLibrary(model, authorName || model.authorEmail, exportRoot)
        ok++
      } catch (error) {
        console.error(`Eksport af "${model.title}" fejlede:`, error)
        failed++
      }
    }
    setExportProgress('')
    setIsExportingAll(false)
    if (failed === 0) {
      toast.success(`${ok} guide${ok === 1 ? '' : 's'} eksporteret til biblioteket`)
    } else {
      toast.warning(`${ok} eksporteret, ${failed} fejlede — se konsollen for detaljer`)
    }
  }

  const handleUpdateCategories = (updatedCategories: string[]) => {
    setCategories(updatedCategories)
  }

  // Kaldes fra editoren når brugeren opretter en kategori inline.
  const handleCreateCategory = (name: string): boolean => {
    const existing = categories || defaultCategories
    if (existing.some((c) => c.toLowerCase() === name.toLowerCase())) return false
    setCategories([...existing, name])
    return true
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
        </div>
      </div>
      
      <div className="container mx-auto px-4 sm:px-6 pt-36 pb-12 sm:pb-20 max-w-7xl relative z-10">
        <header className="mb-10">
          <div className="flex flex-col items-center justify-center gap-6 text-center">
            <div className="flex flex-col items-center gap-4">
              <motion.div 
                className="h-16 w-16 flex-shrink-0 rounded-3xl bg-gradient-to-br from-primary to-accent shadow-2xl shadow-primary/30 flex items-center justify-center relative overflow-hidden"
                whileHover={{ scale: 1.08, rotate: 5 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/40 via-transparent to-accent/40 animate-pulse" />
                <Books size={32} weight="duotone" className="text-primary-foreground relative z-10" />
              </motion.div>
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight bg-gradient-to-br from-primary to-accent bg-clip-text text-transparent">
                  Guide Bibliotek
                </h1>
                <p className="text-xs sm:text-sm md:text-base text-muted-foreground mt-2 flex items-center justify-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-gradient-to-r from-primary/15 to-accent/15 text-primary font-semibold border border-primary/20 text-xs sm:text-sm">
                    {guides?.length || 0}
                  </span>
                  <span className="text-xs sm:text-sm">{(guides?.length || 0) === 1 ? 'guide' : 'guides'} tilgængelig</span>
                </p>
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0 items-center">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button onClick={handleAddNew} className="h-11 px-5 bg-gradient-to-r from-primary via-accent to-primary hover:from-primary/90 hover:via-accent/90 hover:to-primary/90 shadow-xl shadow-primary/30 font-semibold transition-all">
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
            <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
              <Button
                variant={showNeedsReview ? 'default' : 'outline'}
                onClick={() => setShowNeedsReview((v) => !v)}
                className={cn(
                  'h-14 px-5 rounded-2xl border-2 font-semibold gap-2 transition-all backdrop-blur-md',
                  showNeedsReview
                    ? 'bg-gradient-to-r from-destructive to-orange-500 border-destructive shadow-xl shadow-destructive/30 text-white hover:opacity-90'
                    : 'bg-card/80 hover:border-destructive/50'
                )}
              >
                <Timer size={20} weight="bold" />
                Skal opdateres
                {needsReviewCount > 0 && (
                  <span className={cn(
                    'px-2 py-0.5 rounded-lg text-xs font-bold',
                    showNeedsReview ? 'bg-white/20 text-white' : 'bg-destructive/10 text-destructive'
                  )}>
                    {needsReviewCount}
                  </span>
                )}
              </Button>
            </motion.div>
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
                        ? 'shadow-xl shadow-primary/30 bg-gradient-to-r from-primary via-accent to-primary border-primary' 
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
            {isExportAvailable() && (
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setExportDialogOpen(true)}
                  className="h-10 px-4 font-semibold border-2 rounded-xl backdrop-blur-md hover:bg-muted hover:border-primary/40"
                >
                  <FolderOpen size={18} weight="bold" className="sm:mr-2" />
                  <span className="hidden sm:inline">Eksport-bibliotek</span>
                  <span className="sm:hidden">Eksport</span>
                </Button>
              </motion.div>
            )}
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
              <div className="h-32 w-32 rounded-[2rem] bg-gradient-to-br from-primary to-accent shadow-2xl shadow-primary/40 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/50 to-accent/50 blur-2xl animate-pulse" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,white,transparent)] opacity-20" />
                <Books size={64} weight="duotone" className="text-primary-foreground relative z-10 drop-shadow-lg" />
              </div>
            </motion.div>
            <h2 className="text-4xl font-bold bg-gradient-to-br from-primary to-accent bg-clip-text text-transparent mb-4 text-center">
              {showNeedsReview ? 'Alt er opdateret!' : searchQuery || activeCategory !== 'All' ? 'Ingen guides fundet' : 'Ingen guides endnu'}
            </h2>
            <p className="text-muted-foreground text-center max-w-md mb-8 text-lg leading-relaxed">
              {showNeedsReview
                ? 'Ingen guides har overskredet deres opdaterings-interval'
                : searchQuery || activeCategory !== 'All'
                ? 'Prøv at justere dine filtre eller søgning'
                : 'Kom i gang ved at oprette din første guide'}
            </p>
            {!searchQuery && activeCategory === 'All' && !showNeedsReview && (
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button onClick={handleAddNew} size="lg" className="h-14 px-8 text-base bg-gradient-to-r from-primary via-accent to-primary hover:from-primary/90 hover:via-accent/90 hover:to-primary/90 shadow-2xl shadow-primary/40 font-semibold rounded-2xl">
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
                  onMarkReviewed={handleMarkReviewed}
                  matchSnippet={matchInfoById.get(guide.id)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <GuideEditor
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) setEditGuide(undefined)
        }}
        onSave={handleSaveGuide}
        editGuide={editGuide}
        categories={categories || defaultCategories}
        onCreateCategory={handleCreateCategory}
        userEmail={userEmail}
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

      {/* Flydende chat-knap — RAG-assistent over guidebiblioteket */}
      <motion.button
        type="button"
        onClick={() => setChatOpen(true)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        className="fixed bottom-6 right-6 z-30 h-14 w-14 rounded-full bg-gradient-to-br from-primary to-accent shadow-2xl shadow-primary/40 flex items-center justify-center text-primary-foreground border-2 border-primary/30"
        aria-label="Åbn guide-assistent"
      >
        <ChatCircleDots size={26} weight="duotone" />
      </motion.button>

      <GuideChat
        open={chatOpen}
        onOpenChange={setChatOpen}
        guides={guides || []}
        searchIndex={searchIndex}
        onOpenGuide={handleOpenGuideFromChat}
      />

      <Dialog open={exportDialogOpen} onOpenChange={(open) => { if (!isExportingAll) setExportDialogOpen(open) }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FolderOpen size={22} weight="duotone" />
              Eksport-bibliotek
            </DialogTitle>
            <DialogDescription>
              Guides eksporteres som DOCX til en mappe (lokal eller netværksdrev) med automatisk kategoristruktur:
              <span className="block font-mono text-xs mt-1">&lt;mappe&gt;\&lt;kategori&gt;\&lt;titel&gt; vX.XX.docx</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <div className="text-sm font-semibold">Eksport-mappe</div>
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0 px-3 py-2 rounded-lg border bg-muted/40 text-sm truncate" title={exportRoot || undefined}>
                  {exportRoot || 'Ingen mappe valgt'}
                </div>
                <Button variant="outline" size="sm" onClick={handleChooseExportRoot} disabled={isExportingAll} className="shrink-0">
                  Vælg mappe
                </Button>
              </div>
            </div>
            {exportProgress && (
              <div className="text-sm text-muted-foreground animate-pulse">{exportProgress}</div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportDialogOpen(false)} disabled={isExportingAll}>
              Luk
            </Button>
            <Button onClick={handleExportAll} disabled={!exportRoot || isExportingAll} className="gap-2">
              <FolderOpen size={16} weight="bold" />
              {isExportingAll ? 'Eksporterer…' : 'Eksportér alle guides'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
