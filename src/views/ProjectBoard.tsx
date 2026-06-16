import { useState, useEffect } from 'react'
import { ArrowLeft, Plus, User, CheckC
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, D
import { Textarea } from '@/components/ui/t
import { Select, SelectContent, SelectItem, S
import { useKV } from '@github/spark/hooks'
import { format } from 'date-fns'
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
  const [newTitle, setNew
  const [searchQuery,
  const [sortBy, setSo


      const userName = users[userEmail]?.fullName || userEmail
    }
  }, [userEmail])
  const handleCreateProject = () => {
      toast.error(language === 'da' ? 'Titel e
    }
    const newProject: Project = {
      title: newTitle.trim(),
      createdBy: userEmail,
      createdAt: new Date().toISOString(),

    setProjects((cu
    setNewTitle('')
    setIsCreateDialogOpen(false)
  }
  const handleTakeProject = (proje
     
          ? {
              sta

            }
      )
    toast.success(language === 'da' ? 'Du er nu tildelt projektet' : 'You are no

    s

              ...p,
              completedAt: new Date().toISOString(),
          : p
      description: newDescription.trim(),
      createdBy: userEmail,
      createdByName: currentUserName,
      createdAt: new Date().toISOString(),
      status: 'open',
    }

    setProjects((current) => [newProject, ...current])

    setNewTitle('')
    setNewDescription('')
    setIsCreateDialogOpen(false)
    toast.success(language === 'da' ? 'Projekt oprettet' : 'Project created')
  }

  const handleTakeProject = (projectId: string) => {
    setProjects((current) =>
      current.map((p) =>
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
    )
    toast.success(language === 'da' ? 'Du er nu tildelt projektet' : 'You are now assigned to the project')
  }

  const handleCompleteProject = (projectId: string) => {
    setProjects((current) =>
      current.map((p) =>
        p.id === projectId
          ? {
              ...p,
              status: 'completed' as ProjectStatus,
              completedAt: new Date().toISOString(),
            }
          : p
      )
    )
    toast.success(language === 'da' ? 'Projekt markeret som færdigt' : 'Project marked as completed')
  }

  const getFilteredProjects = () => {
    let filtered = projects

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
  const formatDate = (dateString: string) => {
    return format(date, 'dd MMM yyyy, HH:mm', { loc

    co


        initial={{ opacity: 0, y: 20 }}
        exit={{ opacity: 0, y: -20 }}
      >

          }`}
          <div classN
              <h3 
                {getStatusLabel(project.status)}
            </div>
              <Badge className="bg-gradient-to-r fro
              </Badge>
          </div>
     
   

              <User size={14} weight="duotone" />
                {language ==
            </div>
            {project
                <User s
                  {language
              </div>

              <Clock size
       
            
            {project.co
                <Che
                  {lang
              </div>
          </div>
          <div className=
              <Button
       
     
   

            {project.status === 'in-progress' 
                onClick={() => handle
                size="sm"
   

          </div>
      </motion.div>
  }

      <div c
          <div cl
              <Button va
              </Button>
                <h1 className="text-2x
                  {language === 'da' 
              </div>
       
            <
        </div>

        <div 
         
                size="lg"
              >
                {language === 'da' ? 'Opret projekt' : 'Create project'}
            </DialogTrigger>
              <DialogHeader>
                  {lan
              </Di
                <div className="
                  <Input
                    value={newTitle}
                    pl
              
                

                    onChange={(e) =
                    rows={4}
            

                  {language === 'da' ? 'An
                <Button
                  className="bg-gradient-to-r fro
                  {l
              </DialogFooter>
          </Dialog>
          <div cla

                className="absolute 
              <Input
                onChange={(e) => setSearchQuery(e.t
                classN
            </div>
            <Select val
                <Fun
              

                <SelectItem value="unassigned">{language === 'da' ? 'Ikke tildelt' 
            </Select>
            <Select 
                <SelectValue />
              <Select
                <S

        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="flex items-center gap-3 mb-4">
                <Folde
              <h2 className="text-xl font-bold text-foreground">
              </h2>
            <div cla

            <div

              <h2 className="text-xl f
              </h2>
            <div clas

            <div className="flex items-center gap-3 mb-4">
                <CheckCir
              <
              </h2>
            <div className="space-y-4">{completedProjects.map((proje
        </div>
    </div>


















































































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
