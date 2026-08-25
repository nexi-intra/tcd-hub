import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Plus, MagnifyingGlass, PencilSimple, Trash, X, Lock, LockOpen, Eye, Bell } from '@phosphor-icons/react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { useLanguage } from '@/contexts/LanguageContext'
import { format, parseISO, formatDistanceToNow } from 'date-fns'
import { da, enUS } from 'date-fns/locale'

interface Note {
  id: string
  title: string
  content: string
  creatorEmail: string
  creatorName: string
  createdAt: string
  updatedAt: string
  lastEditedBy?: string
  lastEditedByName?: string
  isPersonal: boolean
}

interface Notification {
  id: string
  type: 'note-edited'
  noteId: string
  noteTitle: string
  editedBy: string
  editedByName: string
  originalCreator: string
  timestamp: string
  read: boolean
}

interface VirtualNotebookProps {
  onNavigateBack: () => void
  userEmail: string
}

const PREVIEW_LINES = 8

export function VirtualNotebook({ onNavigateBack, userEmail }: VirtualNotebookProps) {
  const { t, language } = useLanguage()
  const [notes, setNotes] = useState<Note[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showViewDialog, setShowViewDialog] = useState(false)
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [noteTitle, setNoteTitle] = useState('')
  const [noteContent, setNoteContent] = useState('')
  const [activeTab, setActiveTab] = useState<'shared' | 'personal'>('shared')
  const [isCreatingPersonal, setIsCreatingPersonal] = useState(false)
  const [userName, setUserName] = useState('')
  const [userRole, setUserRole] = useState<'admin' | 'manager' | 'user'>('user')
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    loadNotes()
    loadUserInfo()
    loadNotifications()
  }, [userEmail])

  const loadNotes = async () => {
    const allNotes = (await window.kv.get<Note[]>('notebook-notes')) || []
    setNotes(allNotes)
  }

  const loadUserInfo = async () => {
    const users = (await window.kv.get<Record<string, { fullName: string; role?: string }>>('users')) || {}
    const user = users[userEmail]
    const name = user?.fullName || userEmail
    const role = user?.role as 'admin' | 'manager' | 'user' || 'user'
    setUserName(name)
    setUserRole(role)
  }

  const loadNotifications = async () => {
    const allNotifications = (await window.kv.get<Notification[]>('notebook-notifications')) || []
    const userNotifications = allNotifications.filter(n => 
      n.editedBy !== userEmail && 
      (n.originalCreator === userEmail || activeTab === 'shared')
    ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    
    setNotifications(userNotifications)
    setUnreadCount(userNotifications.filter(n => !n.read).length)
  }

  const markNotificationAsRead = async (notificationId: string) => {
    const allNotifications = (await window.kv.get<Notification[]>('notebook-notifications')) || []
    const updated = allNotifications.map(n => 
      n.id === notificationId ? { ...n, read: true } : n
    )
    await window.kv.set('notebook-notifications', updated)
    await loadNotifications()
  }

  const markAllAsRead = async () => {
    const allNotifications = (await window.kv.get<Notification[]>('notebook-notifications')) || []
    const updated = allNotifications.map(n => {
      if (n.editedBy !== userEmail && (n.originalCreator === userEmail || !notes.find(note => note.id === n.noteId)?.isPersonal)) {
        return { ...n, read: true }
      }
      return n
    })
    await window.kv.set('notebook-notifications', updated)
    await loadNotifications()
    toast.success(language === 'da' ? 'Alle notifikationer markeret som læst' : 'All notifications marked as read')
  }

  const deleteNotification = async (notificationId: string) => {
    const allNotifications = (await window.kv.get<Notification[]>('notebook-notifications')) || []
    const updated = allNotifications.filter(n => n.id !== notificationId)
    await window.kv.set('notebook-notifications', updated)
    await loadNotifications()
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
    await window.kv.set('notebook-notes', updatedNotes)
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
      lastEditedBy: userEmail,
      lastEditedByName: userName,
    }

    const updatedNotes = notes.map(n => n.id === selectedNote.id ? updatedNote : n)
    await window.kv.set('notebook-notes', updatedNotes)
    setNotes(updatedNotes)

    if (!selectedNote.isPersonal) {
      const notification = {
        id: `notification_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        type: 'note-edited' as const,
        noteId: selectedNote.id,
        noteTitle: updatedNote.title,
        editedBy: userEmail,
        editedByName: userName,
        originalCreator: selectedNote.creatorEmail,
        timestamp: new Date().toISOString(),
        read: false,
      }

      const existingNotifications = (await window.kv.get<Notification[]>('notebook-notifications')) || []
      await window.kv.set('notebook-notifications', [...existingNotifications, notification])
      
      if (selectedNote.creatorEmail !== userEmail) {
        toast.info(
          language === 'da' 
            ? `${userName} redigerede noten "${updatedNote.title}"` 
            : `${userName} edited the note "${updatedNote.title}"`
        )
      }
    }

    setNoteTitle('')
    setNoteContent('')
    setSelectedNote(null)
    setShowEditDialog(false)
    toast.success(t.notebook.noteUpdated)
  }

  const handleDeleteNote = async () => {
    if (!selectedNote) return

    const updatedNotes = notes.filter(n => n.id !== selectedNote.id)
    await window.kv.set('notebook-notes', updatedNotes)
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
    const isManager = userRole === 'admin' || userRole === 'manager'
    const isOwner = note.creatorEmail === userEmail
    const isSharedNote = !note.isPersonal

    if (!isSharedNote && !isOwner && !isManager) {
      toast.error(t.notebook.onlyCreatorCanEdit)
      return
    }
    
    setSelectedNote(note)
    setNoteTitle(note.title)
    setNoteContent(note.content)
    setShowEditDialog(true)
  }

  const openDeleteDialog = (note: Note) => {
    const isManager = userRole === 'admin' || userRole === 'manager'
    const isOwner = note.creatorEmail === userEmail
    const isSharedNote = !note.isPersonal

    if (!isSharedNote && !isOwner && !isManager) {
      toast.error(t.notebook.onlyCreatorCanEdit)
      return
    }
    
    setSelectedNote(note)
    setShowDeleteDialog(true)
  }

  const openViewDialog = (note: Note) => {
    setSelectedNote(note)
    setShowViewDialog(true)
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

  const formatShortDate = (dateString: string) => {
    try {
      const date = parseISO(dateString)
      return format(date, 'PP', { locale: language === 'da' ? da : enUS })
    } catch {
      return dateString
    }
  }

  const getTruncatedContent = (content: string): { preview: string; isTruncated: boolean } => {
    const lines = content.split('\n')
    const previewLines = lines.slice(0, PREVIEW_LINES)
    const isTruncated = lines.length > PREVIEW_LINES || previewLines.some(line => line.length > 80)
    
    return {
      preview: previewLines.join('\n'),
      isTruncated: isTruncated || lines.length > PREVIEW_LINES
    }
  }

  const canEditNote = (note: Note) => {
    const isManager = userRole === 'admin' || userRole === 'manager'
    const isOwner = note.creatorEmail === userEmail
    const isSharedNote = !note.isPersonal
    
    if (isSharedNote) {
      return true
    }
    
    return isOwner || isManager
  }

  return (
    <div className="min-h-screen p-6 relative z-10">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 mb-10"
        >
          <Button
            onClick={onNavigateBack}
            variant="outline"
            size="icon"
            className="rounded-full"
          >
            <ArrowLeft size={20} />
          </Button>
          <div className="flex-1 text-center">
            <h1 className="text-4xl font-bold bg-gradient-to-br from-primary to-accent bg-clip-text text-transparent">{t.notebook.title}</h1>
          </div>
          <Button
            onClick={() => setShowNotifications(true)}
            variant="outline"
            size="icon"
            className="rounded-full relative"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              >
                {unreadCount}
              </Badge>
            )}
          </Button>
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
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {filteredNotes.map((note) => {
                      const { preview, isTruncated } = getTruncatedContent(note.content)
                      
                      return (
                        <motion.div
                          key={note.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className="relative"
                        >
                          <Card className="p-3 h-[280px] flex flex-col hover:shadow-lg transition-all duration-200 hover:scale-[1.02] group">
                            <div className="flex justify-between items-start mb-1.5 gap-2 flex-shrink-0">
                              <h3 className="font-semibold text-sm line-clamp-2 flex-1">
                                {note.title}
                              </h3>
                              {canEditNote(note) && (
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => openEditDialog(note)}
                                  >
                                    <PencilSimple size={12} />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-destructive hover:text-destructive"
                                    onClick={() => openDeleteDialog(note)}
                                  >
                                    <Trash size={12} />
                                  </Button>
                                </div>
                              )}
                            </div>
                            
                            <div className="flex-1 mb-1.5 overflow-hidden relative">
                              <p className="text-xs leading-[1.4] text-muted-foreground whitespace-pre-wrap line-clamp-[12]">
                                {preview}
                              </p>
                              {isTruncated && (
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-card/95">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-2 h-7 text-xs shadow-lg"
                                    onClick={() => openViewDialog(note)}
                                  >
                                    <Eye size={12} />
                                    {language === 'da' ? 'Læs mere' : 'Read More'}
                                  </Button>
                                </div>
                              )}
                            </div>

                            <div className="space-y-0.5 text-xs text-muted-foreground border-t pt-1.5 flex-shrink-0">
                              <div className="flex items-center justify-between gap-2">
                                <Badge variant="secondary" className="text-xs h-4 px-1.5">
                                  {note.creatorName}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="font-medium">{language === 'da' ? 'Oprettet:' : 'Created:'}</span>
                                <span>{formatShortDate(note.createdAt)}</span>
                              </div>
                              {note.lastEditedBy && note.createdAt !== note.updatedAt && (
                                <div className="flex flex-col gap-0.5">
                                  <div className="flex items-center gap-1">
                                    <span className="font-medium">{language === 'da' ? 'Redigeret af:' : 'Edited by:'}</span>
                                    <span>{note.lastEditedByName || note.lastEditedBy}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="font-medium">{language === 'da' ? 'Dato:' : 'Date:'}</span>
                                    <span>{formatShortDate(note.updatedAt)}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </Card>
                        </motion.div>
                      )
                    })}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="personal" className="mt-0">
                {filteredNotes.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    {searchQuery ? t.notebook.noSearchResults : t.notebook.noPersonalNotes}
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {filteredNotes.map((note) => {
                      const { preview, isTruncated } = getTruncatedContent(note.content)
                      
                      return (
                        <motion.div
                          key={note.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          className="relative"
                        >
                          <Card className="p-3 h-[280px] flex flex-col hover:shadow-lg transition-all duration-200 hover:scale-[1.02] group">
                            <div className="flex justify-between items-start mb-1.5 gap-2 flex-shrink-0">
                              <h3 className="font-semibold text-sm line-clamp-2 flex-1">
                                {note.title}
                              </h3>
                              {canEditNote(note) && (
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6"
                                    onClick={() => openEditDialog(note)}
                                  >
                                    <PencilSimple size={12} />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-destructive hover:text-destructive"
                                    onClick={() => openDeleteDialog(note)}
                                  >
                                    <Trash size={12} />
                                  </Button>
                                </div>
                              )}
                            </div>
                            
                            <div className="flex-1 mb-1.5 overflow-hidden relative">
                              <p className="text-xs leading-[1.4] text-muted-foreground whitespace-pre-wrap line-clamp-[12]">
                                {preview}
                              </p>
                              {isTruncated && (
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-card/95">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-2 h-7 text-xs shadow-lg"
                                    onClick={() => openViewDialog(note)}
                                  >
                                    <Eye size={12} />
                                    {language === 'da' ? 'Læs mere' : 'Read More'}
                                  </Button>
                                </div>
                              )}
                            </div>

                            <div className="space-y-0.5 text-xs text-muted-foreground border-t pt-1.5 flex-shrink-0">
                              <div className="flex items-center gap-1">
                                <span className="font-medium">{language === 'da' ? 'Oprettet:' : 'Created:'}</span>
                                <span>{formatShortDate(note.createdAt)}</span>
                              </div>
                              {note.lastEditedBy && note.createdAt !== note.updatedAt && (
                                <div className="flex flex-col gap-0.5">
                                  <div className="flex items-center gap-1">
                                    <span className="font-medium">{language === 'da' ? 'Redigeret af:' : 'Edited by:'}</span>
                                    <span>{note.lastEditedByName || note.lastEditedBy}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <span className="font-medium">{language === 'da' ? 'Dato:' : 'Date:'}</span>
                                    <span>{formatShortDate(note.updatedAt)}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </Card>
                        </motion.div>
                      )
                    })}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </Card>
        </motion.div>
      </div>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
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
                rows={12}
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
        <DialogContent className="max-w-2xl">
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
                rows={12}
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

      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-2xl">{selectedNote?.title}</DialogTitle>
            <DialogDescription className="flex items-center gap-2 mt-2">
              <Badge variant="secondary">{selectedNote?.creatorName}</Badge>
              <span>•</span>
              <span>{selectedNote && formatDate(selectedNote.createdAt)}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[50vh] pr-2">
            <p className="text-sm whitespace-pre-wrap leading-relaxed">
              {selectedNote?.content}
            </p>
          </div>
          {selectedNote && selectedNote.lastEditedBy && selectedNote.createdAt !== selectedNote.updatedAt && (
            <div className="text-xs text-muted-foreground border-t pt-3">
              <div className="flex items-center gap-2">
                <span className="font-medium">{language === 'da' ? 'Sidst redigeret af:' : 'Last edited by:'}</span>
                <span>{selectedNote.lastEditedByName || selectedNote.lastEditedBy}</span>
                <span>•</span>
                <span>{formatDate(selectedNote.updatedAt)}</span>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            {selectedNote && canEditNote(selectedNote) && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowViewDialog(false)
                    setTimeout(() => openEditDialog(selectedNote), 100)
                  }}
                  className="gap-2"
                >
                  <PencilSimple size={16} />
                  {language === 'da' ? 'Rediger' : 'Edit'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowViewDialog(false)
                    setTimeout(() => openDeleteDialog(selectedNote), 100)
                  }}
                  className="gap-2 text-destructive hover:text-destructive"
                >
                  <Trash size={16} />
                  {language === 'da' ? 'Slet' : 'Delete'}
                </Button>
              </>
            )}
            <Button onClick={() => setShowViewDialog(false)}>
              {language === 'da' ? 'Luk' : 'Close'}
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

      <Dialog open={showNotifications} onOpenChange={setShowNotifications}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>
                {language === 'da' ? 'Notifikationer' : 'Notifications'}
              </DialogTitle>
              {notifications.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-xs"
                >
                  {language === 'da' ? 'Markér alle som læst' : 'Mark all as read'}
                </Button>
              )}
            </div>
            <DialogDescription>
              {language === 'da' ? 'Se hvem der har redigeret delte noter' : 'See who has edited shared notes'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="overflow-y-auto max-h-[50vh] space-y-2">
            {notifications.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {language === 'da' ? 'Ingen notifikationer' : 'No notifications'}
              </div>
            ) : (
              <AnimatePresence>
                {notifications.map((notification) => (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                  >
                    <Card 
                      className={`p-4 ${!notification.read ? 'bg-accent/10 border-accent' : ''}`}
                      onClick={() => !notification.read && markNotificationAsRead(notification.id)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {!notification.read && (
                              <div className="w-2 h-2 rounded-full bg-accent"></div>
                            )}
                            <p className="font-medium text-sm">
                              {notification.editedByName}
                            </p>
                            <Badge variant="secondary" className="text-xs">
                              {language === 'da' ? 'Redigeret' : 'Edited'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {language === 'da' 
                              ? `redigerede noten "${notification.noteTitle}"`
                              : `edited the note "${notification.noteTitle}"`
                            }
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(parseISO(notification.timestamp), {
                              addSuffix: true,
                              locale: language === 'da' ? da : enUS
                            })}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 flex-shrink-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            deleteNotification(notification.id)
                          }}
                        >
                          <X size={14} />
                        </Button>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => setShowNotifications(false)}>
              {language === 'da' ? 'Luk' : 'Close'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
