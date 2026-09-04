import { useEffect, useState } from 'react'
import {
  House, Books, CalendarBlank, ClipboardText, ShieldCheck, ShieldCheck as ManagerIcon,
  Users, Envelope, ForkKnife, GameController, Kanban, NotePencil,
} from '@phosphor-icons/react'
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command'
import { useLanguage } from '@/contexts/LanguageContext'
import { navigateTo, type AppViewId } from '@/lib/appNavigation'
import { hasManagerAccess } from '@/lib/userRoles'

interface ModuleEntry {
  id: AppViewId
  icon: typeof House
  label: string
  managerOnly?: boolean
}

interface CommandPaletteProps {
  userEmail: string
}

/** Global hurtig-navigation (Ctrl/Cmd+K) mellem moduler. */
export function CommandPalette({ userEmail }: CommandPaletteProps) {
  const { language } = useLanguage()
  const [open, setOpen] = useState(false)
  const [isManager, setIsManager] = useState(false)

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

  const go = (view: AppViewId) => {
    navigateTo(view)
    setOpen(false)
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title={language === 'da' ? 'Hurtig-navigation' : 'Quick navigation'}
      description={language === 'da' ? 'Naviger mellem moduler i TCD Hub' : 'Navigate between TCD Hub modules'}
    >
      <CommandInput placeholder={language === 'da' ? 'Søg efter et modul…' : 'Search for a module…'} />
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
      </CommandList>
    </CommandDialog>
  )
}

