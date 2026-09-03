import { useEffect, useState } from 'react'
import {
  House, Books, CalendarBlank, ClipboardText, ShieldCheck, ShieldCheck as ManagerIcon,
  Users, Envelope, ForkKnife, GameController, Kanban, NotePencil, User as UserIcon,
} from '@phosphor-icons/react'
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator,
} from '@/components/ui/command'
import { useLanguage } from '@/contexts/LanguageContext'
import { navigateTo, type AppViewId } from '@/lib/appNavigation'
import { hasManagerAccess } from '@/lib/userRoles'
import type { Guide } from '@/lib/guideTypes'

interface ModuleEntry {
  id: AppViewId
  icon: typeof House
  label: string
  managerOnly?: boolean
}

interface CommandPaletteProps {
  userEmail: string
}

interface NotebookNoteLite {
  id: string
  title: string
  isPersonal: boolean
  creatorEmail: string
}

interface ProjectLite {
  id: string
  title: string
}

/** Global hurtig-navigation (Ctrl/Cmd+K) på tværs af moduler, guides, noter, projekter og kolleger. */
export function CommandPalette({ userEmail }: CommandPaletteProps) {
  const { language } = useLanguage()
  const [open, setOpen] = useState(false)
  const [isManager, setIsManager] = useState(false)
  const [guides, setGuides] = useState<Guide[]>([])
  const [notes, setNotes] = useState<NotebookNoteLite[]>([])
  const [projects, setProjects] = useState<ProjectLite[]>([])
  const [colleagues, setColleagues] = useState<Array<{ email: string; name: string }>>([])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen(current => !current)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    hasManagerAccess(userEmail).then(setIsManager)
  }, [userEmail])

  // Data hentes først når paletten faktisk åbnes — undgår unødvendige KV-læsninger på hver Hub-render.
  useEffect(() => {
    if (!open) return
    const loadData = async () => {
      const [guidesData, notesData, projectsData, usersData] = await Promise.all([
        window.kv.get<Guide[]>('guides'),
        window.kv.get<NotebookNoteLite[]>('notebook-notes'),
        window.kv.get<ProjectLite[]>('projects'),
        window.kv.get<Record<string, { email: string; fullName: string }>>('users'),
      ])
      setGuides(guidesData || [])
      setNotes((notesData || []).filter(n => !n.isPersonal || n.creatorEmail === userEmail))
      setProjects(projectsData || [])
      setColleagues(
        Object.values(usersData || {})
          .filter(u => u.email !== userEmail)
          .map(u => ({ email: u.email, name: u.fullName }))
      )
    }
    loadData()
  }, [open, userEmail])

  const modules: ModuleEntry[] = [
    { id: 'hub', icon: House, label: language === 'da' ? 'Forside' : 'Home' },
    { id: 'guides', icon: Books, label: language === 'da' ? 'Guide Bibliotek' : 'Guide Library' },
    { id: 'calendar', icon: CalendarBlank, label: language === 'da' ? 'Feriekalender' : 'Vacation Calendar' },
    { id: 'shifts', icon: ClipboardText, label: language === 'da' ? 'Vagtplan' : 'Shift Schedule' },
    { id: 'team', icon: Users, label: language === 'da' ? 'Team Oversigt' : 'Team Overview' },
    { id: 'email', icon: Envelope, label: language === 'da' ? 'Email' : 'Email' },
    { id: 'meals', icon: ForkKnife, label: language === 'da' ? 'Madplan' : 'Meal Plan' },
    { id: 'games', icon: GameController, label: language === 'da' ? 'Spilhjørnet' : 'Game Corner' },
    { id: 'projects', icon: Kanban, label: language === 'da' ? 'Projekttavle' : 'Project Board' },
    { id: 'notebook', icon: NotePencil, label: language === 'da' ? 'Notesbog' : 'Notebook' },
    { id: 'manager', icon: ManagerIcon, label: 'Manager Panel', managerOnly: true },
    { id: 'admin', icon: ShieldCheck, label: 'Admin Panel', managerOnly: true },
  ]

  const go = (view: AppViewId, search?: string) => {
    navigateTo(view, search ? { search } : undefined)
    setOpen(false)
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title={language === 'da' ? 'Hurtig-navigation' : 'Quick navigation'}
      description={language === 'da' ? 'Søg på tværs af hele TCD Hub' : 'Search across all of TCD Hub'}
    >
      <CommandInput placeholder={language === 'da' ? 'Søg efter moduler, guides, noter, kolleger…' : 'Search modules, guides, notes, colleagues…'} />
      <CommandList>
        <CommandEmpty>{language === 'da' ? 'Intet fundet' : 'Nothing found'}</CommandEmpty>

        <CommandGroup heading={language === 'da' ? 'Moduler' : 'Modules'}>
          {modules.filter(m => !m.managerOnly || isManager).map(m => {
            const Icon = m.icon
            return (
              <CommandItem key={m.id} value={m.label} onSelect={() => go(m.id)}>
                <Icon size={18} className="mr-2" />
                {m.label}
              </CommandItem>
            )
          })}
        </CommandGroup>

        {guides.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading={language === 'da' ? 'Guides' : 'Guides'}>
              {guides.slice(0, 8).map(g => (
                <CommandItem key={g.id} value={`guide-${g.title}`} onSelect={() => go('guides', g.title)}>
                  <Books size={18} className="mr-2" />
                  {g.title}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {notes.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading={language === 'da' ? 'Noter' : 'Notes'}>
              {notes.slice(0, 8).map(n => (
                <CommandItem key={n.id} value={`note-${n.title}`} onSelect={() => go('notebook', n.title)}>
                  <NotePencil size={18} className="mr-2" />
                  {n.title}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {projects.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading={language === 'da' ? 'Projekter' : 'Projects'}>
              {projects.slice(0, 8).map(p => (
                <CommandItem key={p.id} value={`project-${p.title}`} onSelect={() => go('projects', p.title)}>
                  <Kanban size={18} className="mr-2" />
                  {p.title}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {colleagues.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading={language === 'da' ? 'Kolleger' : 'Colleagues'}>
              {colleagues.slice(0, 12).map(c => (
                <CommandItem key={c.email} value={`user-${c.name}-${c.email}`} onSelect={() => go('team')}>
                  <UserIcon size={18} className="mr-2" />
                  {c.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  )
}
