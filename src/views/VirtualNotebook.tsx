import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Plus, MagnifyingGlass, PencilSimple, Trash, X, Lock, LockOpen } from '@phosphor-icons/react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { useLanguage } from '@/contexts/LanguageContext'
import { format, parseISO } from 'date-fns'
import { da, enUS } from 'date-fns/locale'

interface Note {
  id: string
  title: string
  content: string
  creatorEmail: string
  creatorName: string
  createdAt: string
  updatedAt: string
  isPersonal: boolean
}

interface VirtualNotebookProps {
  onNavigateBack: () => void
  userEmail: string
}

export function VirtualNotebook({ onNavigateBack, userEmail }: VirtualNotebookProps) {
  const { t, language } = useLanguage()
  const [notes, setNotes] = useState<Note[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [noteTitle, setNoteTitle] = useState('')
  const [noteContent, setNoteContent] = useState('')
  const [activeTab, setActiveTab] = useState<'shared' | 'personal'>('shared')
  const [isCreatingPersonal, setIsCreatingPersonal] = useState(false)
  const [userName, setUserName] = useState('')

  useEffect(() => {
    loadNotes()
    loadUserName()
  }, [userEmail])

  const loadNotes = async () => {
    const allNotes = (await window.spark.kv.get<Note[]>('notebook-notes')) || []
    setNotes(allNotes)
  }

  const loadUserName = async () => {
    const users = (await window.spark.kv.get<Record<string, { fullName: string }>>('users')) || {}
    const name = users[userEmail]?.fullName || userEmail
    setUserName(name)
  }

  const handleCreateNote = async () => {
    if (!noteTitle.trim()) {
      toast.error(t.notebook.titleRequired)
      return
    }
    if (!noteContent.trim()) {
      toast.error(t.notebook.contentRequired)
      return
    }

    const newNote: Note = {
      id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      title: noteTitle.trim(),
      content: noteContent.trim(),
      creatorEmail: userEmail,
      creatorName: userName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isPersonal: isCreatingPersonal,
    }

    const updatedNotes = [...notes, newNote]
    await window.spark.kv.set('notebook-notes', updatedNotes)
    setNotes(updatedNotes)

    setNoteTitle('')
    setNoteContent('')
    setShowCreateDialog(false)
    toast.success(t.notebook.noteCreated)
  }

  const handleEditNote = async () => {
    if (!selectedNote) return
    if (!noteTitle.trim()) {
      toast.error(t.notebook.titleRequired)
      return
    }
    if (!noteContent.trim()) {
      toast.error(t.notebook.contentRequired)
      return
    }

    const updatedNote: Note = {
      ...selectedNote,
      title: noteTitle.trim(),
      content: noteContent.trim(),
      updatedAt: new Date().toISOString(),
    }

    const updatedNotes = notes.map(n => n.id === selectedNote.id ? updatedNote : n)
    await window.spark.kv.set('notebook-notes', updatedNotes)
    setNotes(updatedNotes)

    setNoteTitle('')
    setNoteContent('')
    setSelectedNote(null)
    setShowEditDialog(false)
    toast.success(t.notebook.noteUpdated)
  }

  const handleDeleteNote = async () => {
    if (!selectedNote) return

    const updatedNotes = notes.filter(n => n.id !== selectedNote.id)
    await window.spark.kv.set('notebook-notes', updatedNotes)
    setNotes(updatedNotes)

    setSelectedNote(null)
    setShowDeleteDialog(false)
    toast.success(t.notebook.noteDeleted)
  }

  const openCreateDialog = (isPersonal: boolean) => {
    setIsCreatingPersonal(isPersonal)
    setNoteTitle('')
    setNoteContent('')
    setShowCreateDialog(true)
  }

  const openEditDialog = (note: Note) => {
    if (note.creatorEmail !== userEmail) {
      toast.error(t.notebook.onlyCreatorCanEdit)
      return
    }
    setSelectedNote(note)
    setNoteTitle(note.title)
    setNoteContent(note.content)
    setShowEditDialog(true)
  }

  const openDeleteDialog = (note: Note) => {
    if (note.creatorEmail !== userEmail) {
      toast.error(t.notebook.onlyCreatorCanEdit)
      return
    }
    setSelectedNote(note)
    setShowDeleteDialog(true)
  }

  const filteredNotes = notes.filter(note => {
    const matchesSearch = searchQuery.trim() === '' ||
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesTab = activeTab === 'shared' ? !note.isPersonal : (note.isPersonal && note.creatorEmail === userEmail)

    return matchesSearch && matchesTab
  })

  const formatDate = (dateString: string) => {
    try {
      const date = parseISO(dateString)
      return format(date, 'PPp', { locale: language === 'da' ? da : enUS })
    } catch {
      return dateString
    }
  }

  return (
    <div className="min-h-screen p-6 relative z-10">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-8"
        >
          <Button
            onClick={onNavigateBack}
            variant="outline"
            size="icon"
            className="rounded-full"
          >
            <ArrowLeft size={20} />
          </Button>
          <div>
            <h1 className="text-4xl font-bold">{t.notebook.title}</h1>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="p-6">
            <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as 'shared' | 'personal')}>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <TabsList className="grid w-full sm:w-auto grid-cols-2">
                  <TabsTrigger value="shared" className="gap-2">
                    <LockOpen size={16} weight="bold" />
                    {t.notebook.sharedNotes}
                  </TabsTrigger>
                  <TabsTrigger value="personal" className="gap-2">
                    <Lock size={16} weight="bold" />
                    {t.notebook.personalNotes}
                  </TabsTrigger>
                </TabsList>

                <Button
                  onClick={() => openCreateDialog(activeTab === 'personal')}
                  className="gap-2"
                >
                  <Plus size={20} weight="bold" />
                  {t.notebook.addNote}
                </Button>
              </div>

              <div className="relative mb-6">
                <MagnifyingGlass
                  size={20}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  type="text"
                  placeholder={t.notebook.searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
                {searchQuery && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => setSearchQuery('')}
                  >
                    <X size={16} />
                  </Button>
                )}
              </div>

              <TabsContent value="shared" className="mt-0">
                {filteredNotes.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    {searchQuery ? t.notebook.noSearchResults : t.notebook.noSharedNotes}
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredNotes.map((note) => (
                      <motion.div
                        key={note.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                      >
                        <Card className="p-4 hover:shadow-lg transition-shadow">
                          <div className="flex justify-between items-start mb-3">
                            <h3 className="font-semibold text-lg line-clamp-1 flex-1">
                              {note.title}
                            </h3>
                            {note.creatorEmail === userEmail && (
                              <div className="flex gap-1 ml-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => openEditDialog(note)}
                                >
                                  <PencilSimple size={16} />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => openDeleteDialog(note)}
                                >
                                  <Trash size={16} />
                                </Button>
                              </div>
                            )}
                          </div>
                          
                          <ScrollArea className="h-32 mb-3">
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                              {note.content}
                            </p>
                          </ScrollArea>

                          <div className="space-y-2 text-xs text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">
                                {note.creatorName}
                              </Badge>
                            </div>
                            <div>
                              {t.notebook.createdBy}: {formatDate(note.createdAt)}
                            </div>
                            {note.createdAt !== note.updatedAt && (
                              <div>
                                {t.notebook.lastEdited}: {formatDate(note.updatedAt)}
                              </div>
                            )}
                          </div>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="personal" className="mt-0">
                {filteredNotes.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    {searchQuery ? t.notebook.noSearchResults : t.notebook.noPersonalNotes}
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {filteredNotes.map((note) => (
                      <motion.div
                        key={note.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                      >
                        <Card className="p-4 hover:shadow-lg transition-shadow">
                          <div className="flex justify-between items-start mb-3">
                            <h3 className="font-semibold text-lg line-clamp-1 flex-1">
                              {note.title}
                            </h3>
                            <div className="flex gap-1 ml-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => openEditDialog(note)}
                              >
                                <PencilSimple size={16} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => openDeleteDialog(note)}
                              >
                                <Trash size={16} />
                              </Button>
                            </div>
                          </div>
                          
                          <ScrollArea className="h-32 mb-3">
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                              {note.content}
                            </p>
                          </ScrollArea>

                          <div className="space-y-2 text-xs text-muted-foreground">
                            <div>
                              {t.notebook.createdBy}: {formatDate(note.createdAt)}
                            </div>
                            {note.createdAt !== note.updatedAt && (
                              <div>
                                {t.notebook.lastEdited}: {formatDate(note.updatedAt)}
                              </div>
                            )}
                          </div>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </Card>
        </motion.div>
      </div>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.notebook.addNote}</DialogTitle>
            <DialogDescription>
              {isCreatingPersonal ? t.notebook.personalNotes : t.notebook.sharedNotes}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Input
                placeholder={t.notebook.enterTitle}
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
              />
            </div>
            <div>
              <Textarea
                placeholder={t.notebook.enterContent}
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                rows={8}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              {t.notebook.cancel}
            </Button>
            <Button onClick={handleCreateNote}>
              {t.notebook.create}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.notebook.editNote}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Input
                placeholder={t.notebook.enterTitle}
                value={noteTitle}
                onChange={(e) => setNoteTitle(e.target.value)}
              />
            </div>
            <div>
              <Textarea
                placeholder={t.notebook.enterContent}
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                rows={8}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              {t.notebook.cancel}
            </Button>
            <Button onClick={handleEditNote}>
              {t.notebook.save}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.notebook.deleteNote}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.notebook.deleteConfirm}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.notebook.cancel}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteNote} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t.notebook.deleteNote}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
