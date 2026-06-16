import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Plus, User, CheckCircle, Clock, FolderOpen, MagnifyingGlass, Funnel } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { useKV } from '@github/spark/hooks'
import { useLanguage } from '@/contexts/LanguageContext'
import { format } from 'date-fns'
import { da, enUS } from 'date-fns/locale'

interface ProjectBoardProps {
  onNavigateBack: () => void
  onLogout: () => void
  userEmail: string
}

export type ProjectStatus = 'open' | 'in-progress' | 'completed'

export interface Project {
  id: string
  title: string
  description: string
  createdBy: string
  createdByName: string
  createdAt: string
  status: ProjectStatus
  assignedTo?: string
  assignedToName?: string
  assignedAt?: string
  completedAt?: string
}

export function ProjectBoard({ onNavigateBack, onLogout, userEmail }: ProjectBoardProps) {
  const { t, language } = useLanguage()
  const [projects, setProjects] = useKV<Project[]>('projects', [])
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterUser, setFilterUser] = useState<'all' | 'my' | 'unassigned'>('all')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest')
  const [currentUserName, setCurrentUserName] = useState('')

  useEffect(() => {
    const loadUserName = async () => {
      const users = await window.spark.kv.get<Record<string, { fullName: string }>>('users') || {}
      const userName = users[userEmail]?.fullName || userEmail
      setCurrentUserName(userName)
    }
    loadUserName()
  }, [userEmail])

  const handleCreateProject = () => {
    if (!newTitle.trim()) {
      toast.error(language === 'da' ? 'Titel er påkrævet' : 'Title is required')
      return
    }

    const newProject: Project = {
      id: `project_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      title: newTitle.trim(),
      description: newDescription.trim(),
      createdBy: userEmail,
      createdByName: currentUserName,
      createdAt: new Date().toISOString(),
      status: 'open',
    }

    setProjects((current) => {
      if (!current) return [newProject]
      return [newProject, ...current]
    })

    setNewTitle('')
    setNewDescription('')
    setIsCreateDialogOpen(false)
    toast.success(language === 'da' ? 'Projekt oprettet' : 'Project created')
  }

  const handleTakeProject = (projectId: string) => {
    setProjects((current) => {
      if (!current) return []
      return current.map((p) =>
        p.id === projectId
          ? {
              ...p,
              status: 'in-progress' as ProjectStatus,
              assignedTo: userEmail,
              assignedToName: currentUserName,
              assignedAt: new Date().toISOString(),
            }
          : p
      )
    })
    toast.success(language === 'da' ? 'Du er nu tildelt projektet' : 'You are now assigned to the project')
  }

  const handleCompleteProject = (projectId: string) => {
    setProjects((current) => {
      if (!current) return []
      return current.map((p) =>
        p.id === projectId
          ? {
              ...p,
              status: 'completed' as ProjectStatus,
              completedAt: new Date().toISOString(),
            }
          : p
      )
    })
    toast.success(language === 'da' ? 'Projekt markeret som færdigt' : 'Project marked as completed')
  }

  const getFilteredProjects = () => {
    const projectList = projects || []
    let filtered = [...projectList]

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query) ||
          p.createdByName.toLowerCase().includes(query) ||
          p.assignedToName?.toLowerCase().includes(query)
      )
    }

    if (filterUser === 'my') {
      filtered = filtered.filter((p) => p.assignedTo === userEmail || p.createdBy === userEmail)
    } else if (filterUser === 'unassigned') {
      filtered = filtered.filter((p) => !p.assignedTo)
    }

    return filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime()
      const dateB = new Date(b.createdAt).getTime()
      return sortBy === 'newest' ? dateB - dateA : dateA - dateB
    })
  }

  const openProjects = getFilteredProjects().filter((p) => p.status === 'open')
  const inProgressProjects = getFilteredProjects().filter((p) => p.status === 'in-progress')
  const completedProjects = getFilteredProjects().filter((p) => p.status === 'completed')

  const getStatusColor = (status: ProjectStatus) => {
    switch (status) {
      case 'open':
        return 'bg-[oklch(0.55_0.10_210)] text-white'
      case 'in-progress':
        return 'bg-[oklch(0.70_0.18_90)] text-white'
      case 'completed':
        return 'bg-[oklch(0.62_0.20_150)] text-white'
    }
  }

  const getStatusLabel = (status: ProjectStatus) => {
    if (language === 'da') {
      switch (status) {
        case 'open':
          return 'Åben'
        case 'in-progress':
          return 'I gang'
        case 'completed':
          return 'Færdig'
      }
    } else {
      switch (status) {
        case 'open':
          return 'Open'
        case 'in-progress':
          return 'In Progress'
        case 'completed':
          return 'Completed'
      }
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return format(date, 'dd MMM yyyy, HH:mm', { locale: language === 'da' ? da : enUS })
  }

  const renderProjectCard = (project: Project) => {
    const isAssignedToMe = project.assignedTo === userEmail
    const isCreatedByMe = project.createdBy === userEmail

    return (
      <motion.div
        key={project.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
      >
        <Card
          className={`p-5 border-2 transition-all duration-300 hover:shadow-lg ${
            isAssignedToMe ? 'border-primary bg-primary/5' : 'hover:border-primary/40'
          }`}
        >
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1">
              <h3 className="text-lg font-bold text-foreground mb-2">{project.title}</h3>
              <Badge className={`${getStatusColor(project.status)} text-xs font-semibold`}>
                {getStatusLabel(project.status)}
              </Badge>
            </div>
            {isAssignedToMe && (
              <Badge className="bg-gradient-to-r from-[oklch(0.50_0.12_250)] to-[oklch(0.55_0.10_210)] text-white text-xs font-semibold">
                {language === 'da' ? 'Dit projekt' : 'Your project'}
              </Badge>
            )}
          </div>

          {project.description && (
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{project.description}</p>
          )}

          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <User size={14} weight="duotone" />
              <span>
                {language === 'da' ? 'Oprettet af' : 'Created by'}: <strong className="text-foreground">{project.createdByName}</strong>
              </span>
            </div>

            {project.assignedTo && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <User size={14} weight="duotone" />
                <span>
                  {language === 'da' ? 'Tildelt til' : 'Assigned to'}: <strong className="text-foreground">{project.assignedToName}</strong>
                </span>
              </div>
            )}

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock size={14} weight="duotone" />
              <span>
                {language === 'da' ? 'Oprettet' : 'Created'}: {formatDate(project.createdAt)}
              </span>
            </div>

            {project.completedAt && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <CheckCircle size={14} weight="duotone" />
                <span>
                  {language === 'da' ? 'Færdiggjort' : 'Completed'}: {formatDate(project.completedAt)}
                </span>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            {project.status === 'open' && !project.assignedTo && (
              <Button
                onClick={() => handleTakeProject(project.id)}
                className="flex-1 bg-gradient-to-r from-[oklch(0.50_0.12_250)] to-[oklch(0.55_0.10_210)] hover:from-[oklch(0.48_0.12_250)] hover:to-[oklch(0.53_0.10_210)] text-white"
                size="sm"
              >
                <User size={16} weight="duotone" className="mr-2" />
                {language === 'da' ? 'Tag projekt' : 'Take project'}
              </Button>
            )}

            {project.status === 'in-progress' && isAssignedToMe && (
              <Button
                onClick={() => handleCompleteProject(project.id)}
                className="flex-1 bg-gradient-to-r from-[oklch(0.62_0.20_150)] to-[oklch(0.55_0.24_192)] hover:from-[oklch(0.60_0.20_150)] hover:to-[oklch(0.53_0.24_192)] text-white"
                size="sm"
              >
                <CheckCircle size={16} weight="duotone" className="mr-2" />
                {language === 'da' ? 'Marker som færdig' : 'Mark as completed'}
              </Button>
            )}
          </div>
        </Card>
      </motion.div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={onNavigateBack} className="shrink-0">
                <ArrowLeft size={24} weight="bold" />
              </Button>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-3">
                  <FolderOpen size={32} weight="duotone" className="text-primary" />
                  {language === 'da' ? 'Projekt Tavle' : 'Project Board'}
                </h1>
              </div>
            </div>
            <Button variant="ghost" onClick={onLogout} className="shrink-0">
              {language === 'da' ? 'Log ud' : 'Logout'}
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button
                size="lg"
                className="bg-gradient-to-r from-[oklch(0.50_0.12_250)] to-[oklch(0.55_0.10_210)] hover:from-[oklch(0.48_0.12_250)] hover:to-[oklch(0.53_0.10_210)] text-white shadow-lg"
              >
                <Plus size={20} weight="bold" className="mr-2" />
                {language === 'da' ? 'Opret projekt' : 'Create project'}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold">
                  {language === 'da' ? 'Opret nyt projekt' : 'Create new project'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">{language === 'da' ? 'Titel' : 'Title'} *</Label>
                  <Input
                    id="title"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder={language === 'da' ? 'Indtast projekt titel' : 'Enter project title'}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">{language === 'da' ? 'Beskrivelse' : 'Description'}</Label>
                  <Textarea
                    id="description"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder={language === 'da' ? 'Indtast projekt beskrivelse' : 'Enter project description'}
                    rows={4}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  {language === 'da' ? 'Annuller' : 'Cancel'}
                </Button>
                <Button
                  onClick={handleCreateProject}
                  className="bg-gradient-to-r from-[oklch(0.50_0.12_250)] to-[oklch(0.55_0.10_210)] text-white"
                >
                  {language === 'da' ? 'Opret' : 'Create'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <div className="flex-1 flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <MagnifyingGlass
                size={20}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={language === 'da' ? 'Søg projekter...' : 'Search projects...'}
                className="pl-10"
              />
            </div>

            <Select value={filterUser} onValueChange={(value: any) => setFilterUser(value)}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Funnel size={16} className="mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{language === 'da' ? 'Alle projekter' : 'All projects'}</SelectItem>
                <SelectItem value="my">{language === 'da' ? 'Mine projekter' : 'My projects'}</SelectItem>
                <SelectItem value="unassigned">{language === 'da' ? 'Ikke tildelt' : 'Unassigned'}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">{language === 'da' ? 'Nyeste' : 'Newest'}</SelectItem>
                <SelectItem value="oldest">{language === 'da' ? 'Ældste' : 'Oldest'}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-gradient-to-br from-[oklch(0.55_0.10_210)] to-[oklch(0.60_0.22_220)]">
                <FolderOpen size={24} weight="duotone" className="text-white" />
              </div>
              <h2 className="text-xl font-bold text-foreground">
                {language === 'da' ? 'Åbne' : 'Open'} ({openProjects.length})
              </h2>
            </div>
            <div className="space-y-4">{openProjects.map((project) => renderProjectCard(project))}</div>
          </div>

          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-gradient-to-br from-[oklch(0.70_0.18_90)] to-[oklch(0.75_0.15_60)]">
                <Clock size={24} weight="duotone" className="text-white" />
              </div>
              <h2 className="text-xl font-bold text-foreground">
                {language === 'da' ? 'I gang' : 'In Progress'} ({inProgressProjects.length})
              </h2>
            </div>
            <div className="space-y-4">{inProgressProjects.map((project) => renderProjectCard(project))}</div>
          </div>

          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-gradient-to-br from-[oklch(0.62_0.20_150)] to-[oklch(0.55_0.24_192)]">
                <CheckCircle size={24} weight="duotone" className="text-white" />
              </div>
              <h2 className="text-xl font-bold text-foreground">
                {language === 'da' ? 'Færdige' : 'Completed'} ({completedProjects.length})
              </h2>
            </div>
            <div className="space-y-4">{completedProjects.map((project) => renderProjectCard(project))}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
