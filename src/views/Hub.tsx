import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import { Books, Users, Calendar, Gear, ChatCircle, FileText, Folder, FirstAidKit, Envelope, ClipboardText, ShieldCheck, ForkKnife, CheckCircle, User, GameController, Warning, UserPlus } from '@phosphor-icons/react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { UserProfile } from '@/components/UserProfile'
import { SickLeaveDialog } from '@/components/SickLeaveDialog'
import { EmailNotifications } from '@/components/EmailNotifications'
import { LanguageToggle } from '@/components/LanguageToggle'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { hasManagerAccess } from '@/lib/userRoles'
import { useLanguage } from '@/contexts/LanguageContext'
import nexiLogo from '@/assets/images/nexi-logo.svg'
import { format, isSameDay, parseISO } from 'date-fns'
import { da, enUS } from 'date-fns/locale'

interface HubModule {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  color: string
  gradient: string
  available: boolean
}

interface HubProps {
  onNavigate: (moduleId: string) => void
  onLogout: () => void
  userEmail: string
}

interface ShiftRole {
  id: string
  name: string
  color: string
}

interface ShiftAssignment {
  id: string
  employeeId: string
  employeeName: string
  roleId: string
  date: string
  comment?: string
}

interface SickLeaveEntry {
  id: string
  userEmail: string
  userName: string
  startDate: string
  reason?: string
  status: 'pending' | 'approved' | 'rejected'
  submittedAt: string
}

interface VacationEntry {
  id: string
  userId: string
  userEmail: string
  startDate: string
  endDate: string
  notes?: string
  status: 'pending' | 'approved' | 'rejected'
  reviewedBy?: string
  reviewedAt?: string
}

export function Hub({ onNavigate, onLogout, userEmail }: HubProps) {
  const { t, language } = useLanguage()
  const [isAdminOrManager, setIsAdminOrManager] = useState(false)
  const [showSickLeaveDialog, setShowSickLeaveDialog] = useState(false)
  const [showEmailNotifications, setShowEmailNotifications] = useState(false)
  const [unreadInboxCount, setUnreadInboxCount] = useState(0)
  const [pendingVacationRequests, setPendingVacationRequests] = useState(0)
  
  const [teamTasks, setTeamTasks] = useState<Array<{ taskName: string; taskColor: string; people: string[]; roleId: string }>>([])
  const [peopleOff, setPeopleOff] = useState<Array<{ name: string; type: 'vacation' | 'single' }>>([])
  const [peopleSick, setPeopleSick] = useState<string[]>([])
  const [todaysMeal, setTodaysMeal] = useState<string>('')
  
  const [showQuickAssignDialog, setShowQuickAssignDialog] = useState(false)
  const [selectedTaskForAssign, setSelectedTaskForAssign] = useState<{ roleId: string; roleName: string } | null>(null)
  const [selectedEmployeeForAssign, setSelectedEmployeeForAssign] = useState<string>('')
  const [allEmployees, setAllEmployees] = useState<Array<{ email: string; name: string }>>([])
  
  useEffect(() => {
    const checkUserRole = async () => {
      const access = await hasManagerAccess(userEmail)
      setIsAdminOrManager(access)
    }
    checkUserRole()
  }, [userEmail])

  useEffect(() => {
    const loadUnreadCount = async () => {
      const emails = (await window.spark.kv.get<Array<{ to: string; read: boolean; folderId?: string }>>('emails')) || []
      const unreadInbox = emails.filter(e => e.to === userEmail && !e.read && (e.folderId === undefined || e.folderId === null || e.folderId === '')).length
      setUnreadInboxCount(unreadInbox)
    }
    loadUnreadCount()
    
    const interval = setInterval(loadUnreadCount, 5000)
    return () => clearInterval(interval)
  }, [userEmail])

  useEffect(() => {
    const loadPendingVacationRequests = async () => {
      if (!isAdminOrManager) {
        setPendingVacationRequests(0)
        return
      }
      
      const vacations = (await window.spark.kv.get<VacationEntry[]>('vacation-entries')) || []
      const sickLeave = (await window.spark.kv.get<SickLeaveEntry[]>('sick-leave-entries')) || []
      
      const pendingVacations = vacations.filter(v => v.status === 'pending').length
      const pendingSickLeave = sickLeave.filter(s => s.status === 'pending').length
      
      setPendingVacationRequests(pendingVacations + pendingSickLeave)
    }
    
    loadPendingVacationRequests()
    
    const interval = setInterval(loadPendingVacationRequests, 5000)
    return () => clearInterval(interval)
  }, [isAdminOrManager])

  useEffect(() => {
    const loadOverviewData = async () => {
      const today = format(new Date(), 'yyyy-MM-dd')
      const currentDate = new Date()
      
      const assignments = (await window.spark.kv.get<ShiftAssignment[]>('shift-assignments')) || []
      const roles = (await window.spark.kv.get<ShiftRole[]>('shift-roles')) || []
      const sickLeave = (await window.spark.kv.get<SickLeaveEntry[]>('sick-leave-entries')) || []
      const vacations = (await window.spark.kv.get<VacationEntry[]>('vacation-entries')) || []
      const usersData = (await window.spark.kv.get<Record<string, { fullName: string }>>('users')) || {}
      
      const isSickToday = (userEmail: string) => {
        return sickLeave.some(s => 
          s.userEmail === userEmail && 
          s.status === 'approved' && 
          isSameDay(parseISO(s.startDate), currentDate)
        )
      }
      
      const isOnVacationToday = (userEmail: string) => {
        return vacations.some(v => {
          if (v.userEmail !== userEmail || v.status !== 'approved') return false
          const start = parseISO(v.startDate)
          const end = parseISO(v.endDate)
          return (isSameDay(start, currentDate) || isSameDay(end, currentDate) || (start < currentDate && end > currentDate))
        })
      }
      
      const todaysAssignments = assignments.filter(a => a.date === today)
      
      const taskPeopleMap: Record<string, { color: string; people: string[]; roleId: string }> = {}
      
      todaysAssignments.forEach(assignment => {
        const role = roles.find(r => r.id === assignment.roleId)
        const roleName = role?.name || 'Unknown'
        const roleColor = role?.color || 'gray'
        const roleId = role?.id || ''
        
        if (!taskPeopleMap[roleName]) {
          taskPeopleMap[roleName] = {
            color: roleColor,
            people: [],
            roleId: roleId
          }
        }
      })
      
      todaysAssignments.forEach(assignment => {
        const role = roles.find(r => r.id === assignment.roleId)
        const roleName = role?.name || 'Unknown'
        
        const userEmail = Object.keys(usersData).find(email => usersData[email]?.fullName === assignment.employeeName)
        
        if (userEmail && (isSickToday(userEmail) || isOnVacationToday(userEmail))) {
          return
        }
        
        if (!taskPeopleMap[roleName].people.includes(assignment.employeeName)) {
          taskPeopleMap[roleName].people.push(assignment.employeeName)
        }
      })
      
      const teamTasksList = Object.entries(taskPeopleMap).map(([taskName, data]) => ({
        taskName,
        taskColor: data.color,
        people: data.people,
        roleId: data.roleId
      }))
      
      setTeamTasks(teamTasksList)
      
      const users = Object.entries(usersData).map(([email, data]) => ({
        email,
        name: data.fullName
      }))
      setAllEmployees(users)
      
      const todaySick = sickLeave
        .filter(s => s.status === 'approved' && isSameDay(parseISO(s.startDate), new Date()))
        .map(s => s.userName)
      setPeopleSick(todaySick)
      
      const todayOff: Array<{ name: string; type: 'vacation' | 'single' }> = []
      
      vacations.forEach(v => {
        if (v.status === 'approved') {
          const start = parseISO(v.startDate)
          const end = parseISO(v.endDate)
          const now = new Date()
          
          if (isSameDay(start, now) || isSameDay(end, now) || (start < now && end > now)) {
            const userName = usersData[v.userEmail]?.fullName || v.userEmail
            todayOff.push({ name: userName, type: 'vacation' })
          }
        }
      })
      
      setPeopleOff(todayOff)
      
      interface WeekMenu {
        weekNumber: number
        year: number
        weekStart: string
        meals: {
          monday: string
          tuesday: string
          wednesday: string
          thursday: string
          friday: string
        }
      }
      
      const weekMenus = (await window.spark.kv.get<WeekMenu[]>('meal-plan-weeks')) || []
      const getWeekNumber = (date: Date): number => {
        const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
        const dayNum = d.getUTCDay() || 7
        d.setUTCDate(d.getUTCDate() + 4 - dayNum)
        const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
        return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
      }
      
      const currentWeek = getWeekNumber(currentDate)
      const currentYear = currentDate.getFullYear()
      const currentWeekMenu = weekMenus.find(w => w.weekNumber === currentWeek && w.year === currentYear)
      
      if (currentWeekMenu) {
        const dayOfWeek = currentDate.getDay()
        const dayKeys: Array<keyof typeof currentWeekMenu.meals> = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
        
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
          const dayKey = dayKeys[dayOfWeek - 1]
          setTodaysMeal(currentWeekMenu.meals[dayKey] || '')
        } else {
          setTodaysMeal('')
        }
      } else {
        setTodaysMeal('')
      }
    }
    
    loadOverviewData()
    const interval = setInterval(loadOverviewData, 30000)
    return () => clearInterval(interval)
  }, [userEmail])

  const handleModuleClick = (moduleId: string) => {
    if (moduleId === 'manager' && !isAdminOrManager) {
      return
    }
    onNavigate(moduleId)
  }

  const handleQuickAssign = async () => {
    if (!selectedTaskForAssign || !selectedEmployeeForAssign) {
      toast.error(language === 'da' ? 'Vælg en medarbejder' : 'Select an employee')
      return
    }

    const today = format(new Date(), 'yyyy-MM-dd')
    const assignments = (await window.spark.kv.get<ShiftAssignment[]>('shift-assignments')) || []
    const usersData = (await window.spark.kv.get<Record<string, { fullName: string }>>('users')) || {}
    
    const selectedEmployee = allEmployees.find(e => e.email === selectedEmployeeForAssign)
    if (!selectedEmployee) {
      toast.error(language === 'da' ? 'Medarbejder ikke fundet' : 'Employee not found')
      return
    }

    const employeeName = selectedEmployee.name
    const employeeEmail = selectedEmployee.email

    const sickLeave = (await window.spark.kv.get<SickLeaveEntry[]>('sick-leave-entries')) || []
    const vacations = (await window.spark.kv.get<VacationEntry[]>('vacation-entries')) || []
    
    const isSickToday = sickLeave.some(s => 
      s.userEmail === employeeEmail && 
      s.status === 'approved' && 
      isSameDay(parseISO(s.startDate), new Date())
    )
    
    const isOnVacationToday = vacations.some(v => {
      if (v.userEmail !== employeeEmail || v.status !== 'approved') return false
      const start = parseISO(v.startDate)
      const end = parseISO(v.endDate)
      const now = new Date()
      return (isSameDay(start, now) || isSameDay(end, now) || (start < now && end > now))
    })

    if (isSickToday) {
      toast.error(language === 'da' ? `${employeeName} er syg i dag` : `${employeeName} is sick today`)
      return
    }

    if (isOnVacationToday) {
      toast.error(language === 'da' ? `${employeeName} har fri i dag` : `${employeeName} is off today`)
      return
    }

    const alreadyAssigned = assignments.some(
      a => a.date === today && a.employeeName === employeeName && a.roleId === selectedTaskForAssign.roleId
    )

    if (alreadyAssigned) {
      toast.error(language === 'da' ? `${employeeName} har allerede denne opgave` : `${employeeName} already has this task`)
      return
    }

    const newAssignment: ShiftAssignment = {
      id: `assignment_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      employeeId: employeeEmail,
      employeeName: employeeName,
      roleId: selectedTaskForAssign.roleId,
      date: today,
    }

    await window.spark.kv.set('shift-assignments', [...assignments, newAssignment])

    toast.success(language === 'da' ? `${employeeName} tildelt ${selectedTaskForAssign.roleName}` : `${employeeName} assigned to ${selectedTaskForAssign.roleName}`)
    
    setShowQuickAssignDialog(false)
    setSelectedTaskForAssign(null)
    setSelectedEmployeeForAssign('')

    const loadOverviewData = async () => {
      const today = format(new Date(), 'yyyy-MM-dd')
      const currentDate = new Date()
      
      const assignments = (await window.spark.kv.get<ShiftAssignment[]>('shift-assignments')) || []
      const roles = (await window.spark.kv.get<ShiftRole[]>('shift-roles')) || []
      const sickLeave = (await window.spark.kv.get<SickLeaveEntry[]>('sick-leave-entries')) || []
      const vacations = (await window.spark.kv.get<VacationEntry[]>('vacation-entries')) || []
      const usersData = (await window.spark.kv.get<Record<string, { fullName: string }>>('users')) || {}
      
      const isSickToday = (userEmail: string) => {
        return sickLeave.some(s => 
          s.userEmail === userEmail && 
          s.status === 'approved' && 
          isSameDay(parseISO(s.startDate), currentDate)
        )
      }
      
      const isOnVacationToday = (userEmail: string) => {
        return vacations.some(v => {
          if (v.userEmail !== userEmail || v.status !== 'approved') return false
          const start = parseISO(v.startDate)
          const end = parseISO(v.endDate)
          return (isSameDay(start, currentDate) || isSameDay(end, currentDate) || (start < currentDate && end > currentDate))
        })
      }
      
      const todaysAssignments = assignments.filter(a => a.date === today)
      
      const taskPeopleMap: Record<string, { color: string; people: string[]; roleId: string }> = {}
      
      todaysAssignments.forEach(assignment => {
        const role = roles.find(r => r.id === assignment.roleId)
        const roleName = role?.name || 'Unknown'
        const roleColor = role?.color || 'gray'
        const roleId = role?.id || ''
        
        if (!taskPeopleMap[roleName]) {
          taskPeopleMap[roleName] = {
            color: roleColor,
            people: [],
            roleId: roleId
          }
        }
      })
      
      todaysAssignments.forEach(assignment => {
        const role = roles.find(r => r.id === assignment.roleId)
        const roleName = role?.name || 'Unknown'
        
        const userEmail = Object.keys(usersData).find(email => usersData[email]?.fullName === assignment.employeeName)
        
        if (userEmail && (isSickToday(userEmail) || isOnVacationToday(userEmail))) {
          return
        }
        
        if (!taskPeopleMap[roleName].people.includes(assignment.employeeName)) {
          taskPeopleMap[roleName].people.push(assignment.employeeName)
        }
      })
      
      const teamTasksList = Object.entries(taskPeopleMap).map(([taskName, data]) => ({
        taskName,
        taskColor: data.color,
        people: data.people,
        roleId: data.roleId
      }))
      
      setTeamTasks(teamTasksList)
    }
    loadOverviewData()
  }

  type AnimationCategory = 'work' | 'social' | 'admin' | 'leisure'

  interface ModuleWithCategory extends HubModule {
    category: AnimationCategory
  }

  const modules: ModuleWithCategory[] = [
    {
      id: 'shifts',
      title: t.hub.modules.shifts,
      description: t.hub.descriptions.shifts,
      icon: <ClipboardText size={48} weight="duotone" />,
      color: 'oklch(0.60 0.22 220)',
      gradient: 'from-[oklch(0.60_0.22_220)] via-[oklch(0.65_0.26_340)] to-[oklch(0.60_0.22_220)]',
      available: true,
      category: 'work',
    },
    {
      id: 'calendar',
      title: t.hub.modules.calendar,
      description: t.hub.descriptions.calendar,
      icon: <Calendar size={48} weight="duotone" />,
      color: 'oklch(0.65 0.26 340)',
      gradient: 'from-[oklch(0.65_0.26_340)] via-[oklch(0.70_0.20_20)] to-[oklch(0.65_0.26_340)]',
      available: true,
      category: 'work',
    },
    {
      id: 'meals',
      title: t.hub.modules.meals,
      description: t.hub.descriptions.meals,
      icon: <ForkKnife size={48} weight="duotone" />,
      color: 'oklch(0.70 0.18 90)',
      gradient: 'from-[oklch(0.70_0.18_90)] via-[oklch(0.75_0.15_60)] to-[oklch(0.70_0.18_90)]',
      available: true,
      category: 'leisure',
    },
    {
      id: 'team',
      title: t.hub.modules.team,
      description: t.hub.descriptions.team,
      icon: <Users size={48} weight="duotone" />,
      color: 'oklch(0.55 0.24 192)',
      gradient: 'from-[oklch(0.55_0.24_192)] via-[oklch(0.60_0.22_220)] to-[oklch(0.55_0.24_192)]',
      available: true,
      category: 'social',
    },
    {
      id: 'email',
      title: t.hub.modules.email,
      description: t.hub.descriptions.email,
      icon: <Envelope size={48} weight="duotone" />,
      color: 'oklch(0.68 0.14 340)',
      gradient: 'from-[oklch(0.68_0.14_340)] via-[oklch(0.75_0.12_180)] to-[oklch(0.68_0.14_340)]',
      available: true,
      category: 'social',
    },
    {
      id: 'guides',
      title: t.hub.modules.guides,
      description: t.hub.descriptions.guides,
      icon: <Books size={48} weight="duotone" />,
      color: 'oklch(0.50 0.27 262)',
      gradient: 'from-[oklch(0.50_0.27_262)] via-[oklch(0.55_0.24_192)] to-[oklch(0.50_0.27_262)]',
      available: true,
      category: 'work',
    },
    {
      id: 'documents',
      title: t.hub.modules.documents,
      description: t.hub.descriptions.documents,
      icon: <FileText size={48} weight="duotone" />,
      color: 'oklch(0.62 0.20 150)',
      gradient: 'from-[oklch(0.62_0.20_150)] via-[oklch(0.55_0.24_192)] to-[oklch(0.62_0.20_150)]',
      available: false,
      category: 'work',
    },
    {
      id: 'projects',
      title: t.hub.modules.projects,
      description: t.hub.descriptions.projects,
      icon: <Folder size={48} weight="duotone" />,
      color: 'oklch(0.75 0.15 60)',
      gradient: 'from-[oklch(0.75_0.15_60)] via-[oklch(0.70_0.18_90)] to-[oklch(0.75_0.15_60)]',
      available: true,
      category: 'work',
    },
    {
      id: 'chat',
      title: t.hub.modules.chat,
      description: t.hub.descriptions.chat,
      icon: <ChatCircle size={48} weight="duotone" />,
      color: 'oklch(0.58 0.25 25)',
      gradient: 'from-[oklch(0.58_0.25_25)] via-[oklch(0.65_0.26_340)] to-[oklch(0.58_0.25_25)]',
      available: false,
      category: 'social',
    },
    {
      id: 'games',
      title: t.hub.modules.games,
      description: t.hub.descriptions.games,
      icon: <GameController size={48} weight="duotone" />,
      color: 'oklch(0.72 0.20 310)',
      gradient: 'from-[oklch(0.72_0.20_310)] via-[oklch(0.68_0.22_280)] to-[oklch(0.72_0.20_310)]',
      available: true,
      category: 'leisure',
    },
    {
      id: 'manager',
      title: t.hub.modules.manager,
      description: isAdminOrManager ? t.hub.descriptions.manager : t.hub.descriptions.managerLocked,
      icon: <ShieldCheck size={48} weight="duotone" />,
      color: 'oklch(0.58 0.25 25)',
      gradient: 'from-[oklch(0.58_0.25_25)] via-[oklch(0.65_0.26_340)] to-[oklch(0.58_0.25_25)]',
      available: isAdminOrManager,
      category: 'admin',
    },
  ]

  const getIconAnimation = (category: AnimationCategory) => {
    switch (category) {
      case 'work':
        return {
          initial: {
            scale: 1,
            rotate: 0,
            y: 0,
          },
          hover: {
            scale: 1.15,
            rotate: [0, -5, 5, -5, 0],
            y: [-3, 0, -3],
          },
          transition: {
            duration: 0.5,
            ease: "easeInOut"
          }
        }
      case 'social':
        return {
          initial: {
            scale: 1,
            rotate: 0,
          },
          hover: {
            scale: [1, 1.2, 1.1],
            rotate: [0, 360],
          },
          transition: {
            duration: 0.6,
            ease: "easeInOut"
          }
        }
      case 'admin':
        return {
          initial: {
            scale: 1,
            rotateY: 0,
          },
          hover: {
            scale: 1.1,
            rotateY: [0, 180, 360],
          },
          transition: {
            duration: 0.7,
            ease: "easeInOut"
          }
        }
      case 'leisure':
        return {
          initial: {
            scale: 1,
            rotate: 0,
            y: 0,
          },
          hover: {
            scale: [1, 1.3, 1.15],
            rotate: [0, -15, 15, -10, 10, 0],
            y: [0, -8, 0],
          },
          transition: {
            duration: 0.8,
            ease: "easeInOut"
          }
        }
    }
  }

  const getCardAnimation = (category: AnimationCategory) => {
    switch (category) {
      case 'work':
        return {
          initial: {
            y: 0,
            boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
          },
          hover: {
            y: -8,
            boxShadow: "0 20px 40px -12px rgba(0, 0, 0, 0.25)",
          },
          tap: { scale: 0.98 },
          transition: {
            duration: 0.3,
            ease: "easeInOut"
          }
        }
      case 'social':
        return {
          initial: {
            scale: 1,
            rotate: 0,
            boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
          },
          hover: {
            scale: 1.05,
            rotate: [0, -2, 2, 0],
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.3)",
          },
          tap: { scale: 0.95 },
          transition: {
            duration: 0.3,
            ease: "easeInOut"
          }
        }
      case 'admin':
        return {
          initial: {
            y: 0,
            x: 0,
            boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
          },
          hover: {
            y: -6,
            x: [0, -3, 3, 0],
            boxShadow: "0 20px 40px -12px rgba(0, 0, 0, 0.25)",
          },
          tap: { scale: 0.97 },
          transition: {
            duration: 0.3,
            ease: "easeInOut"
          }
        }
      case 'leisure':
        return {
          initial: {
            scale: 1,
            y: 0,
            rotate: 0,
            boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
          },
          hover: {
            scale: 1.08,
            y: -10,
            rotate: [0, 3, -3, 0],
            boxShadow: "0 30px 60px -15px rgba(0, 0, 0, 0.35)",
          },
          tap: { scale: 0.92 },
          transition: {
            duration: 0.3,
            ease: "easeInOut"
          }
        }
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute top-6 right-6 left-6 z-20">
        <div className="hidden sm:flex flex-row items-center justify-end gap-4 pb-12">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.05 }}
          >
            <ThemeToggle />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <LanguageToggle />
          </motion.div>
          {isAdminOrManager && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Button
                onClick={() => setShowEmailNotifications(true)}
                size="lg"
                variant="outline"
                className="bg-background/80 backdrop-blur-sm hover:bg-background shadow-lg hover:shadow-xl transition-all duration-300 gap-2 font-semibold relative px-4 w-full sm:w-auto"
              >
                <Envelope size={20} weight="duotone" />
                {t.email.notifications}
                {unreadInboxCount > 0 && (
                  <Badge className="absolute -top-2 -right-2 bg-[oklch(0.58_0.25_25)] text-white px-2 py-0.5 text-xs">
                    {unreadInboxCount}
                  </Badge>
                )}
              </Button>
            </motion.div>
          )}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Button
              onClick={() => setShowSickLeaveDialog(true)}
              size="lg"
              className="bg-gradient-to-r from-[oklch(0.58_0.25_25)] to-[oklch(0.65_0.26_340)] hover:from-[oklch(0.55_0.25_25)] hover:to-[oklch(0.62_0.26_340)] text-white shadow-lg hover:shadow-xl transition-all duration-300 gap-2 font-semibold w-full sm:w-auto px-6 py-3 text-base"
            >
              <FirstAidKit size={24} weight="duotone" />
              {t.shifts.sickLeave}
            </Button>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <UserProfile 
              userEmail={userEmail} 
              onLogout={onLogout}
              showAdmin={isAdminOrManager}
              onAdminClick={() => onNavigate('admin')}
            />
          </motion.div>
        </div>

        <div className="flex sm:hidden items-center justify-between gap-2 pb-12">
          <div className="flex items-center gap-2">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 }}
            >
              <ThemeToggle />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <LanguageToggle />
            </motion.div>
          </div>
          
          <div className="flex items-center gap-2">
            {isAdminOrManager && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Button
                  onClick={() => setShowEmailNotifications(true)}
                  size="lg"
                  variant="outline"
                  className="bg-background/80 backdrop-blur-sm hover:bg-background shadow-lg hover:shadow-xl transition-all duration-300 gap-2 font-semibold relative px-4"
                >
                  <Envelope size={20} weight="duotone" />
                  {unreadInboxCount > 0 && (
                    <Badge className="absolute -top-2 -right-2 bg-[oklch(0.58_0.25_25)] text-white px-2 py-0.5 text-xs">
                      {unreadInboxCount}
                    </Badge>
                  )}
                </Button>
              </motion.div>
            )}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Button
                onClick={() => setShowSickLeaveDialog(true)}
                size="lg"
                className="bg-gradient-to-r from-[oklch(0.58_0.25_25)] to-[oklch(0.65_0.26_340)] hover:from-[oklch(0.55_0.25_25)] hover:to-[oklch(0.62_0.26_340)] text-white shadow-lg hover:shadow-xl transition-all duration-300 gap-2 font-semibold px-4"
              >
                <FirstAidKit size={24} weight="duotone" />
              </Button>
            </motion.div>
          </div>
        </div>
      </div>
      <SickLeaveDialog
        open={showSickLeaveDialog}
        onOpenChange={setShowSickLeaveDialog}
        userEmail={userEmail}
      />
      <EmailNotifications
        open={showEmailNotifications}
        onOpenChange={(open) => {
          setShowEmailNotifications(open)
          if (!open) {
            const loadUnreadCount = async () => {
              const emails = (await window.spark.kv.get<Array<{ to: string; read: boolean; folderId?: string }>>('emails')) || []
              const unreadInbox = emails.filter(e => e.to === userEmail && !e.read && !e.folderId).length
              setUnreadInboxCount(unreadInbox)
            }
            loadUnreadCount()
          }
        }}
        userEmail={userEmail}
      />
      <div className="container mx-auto px-4 sm:px-6 pt-56 sm:pt-60 pb-12 sm:pb-20 max-w-7xl relative z-10">
        <motion.header 
          className="text-center mb-10 sm:mb-12"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex justify-center mb-6"
          >
            <img src={nexiLogo} alt="Nexi Logo" className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24" />
          </motion.div>
          <motion.h1 
            className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight bg-gradient-to-br from-primary via-secondary to-accent bg-clip-text text-transparent mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >Terminal Configuration & Dispatch Hub</motion.h1>
        </motion.header>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="mb-10"
        >
          <Card className="p-4 md:p-6 bg-card border-2 hover:border-primary/40 transition-all duration-300 mb-4 md:mb-6">
            <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
              <div className="p-1.5 md:p-2 rounded-lg bg-gradient-to-br from-[oklch(0.50_0.12_250)] to-[oklch(0.60_0.15_250)]">
                <Users size={20} weight="duotone" className="text-white md:hidden" />
                <Users size={24} weight="duotone" className="text-white hidden md:block" />
              </div>
              <h3 className="text-base md:text-lg font-semibold text-foreground">{t.hub.overview.teamTasks || 'Team opgaver i dag'}</h3>
            </div>
            {teamTasks.length === 0 ? (
              <p className="text-muted-foreground text-xs md:text-sm text-center py-1">{t.hub.overview.noTasks}</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
                {teamTasks.map((task, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={cn(
                      "flex flex-col gap-3 p-4 rounded-xl border-2 shadow-sm transition-all duration-300",
                      task.people.length === 0 
                        ? "bg-gradient-to-br from-amber-50 to-amber-100 border-amber-400 dark:from-amber-950/40 dark:to-amber-900/30 dark:border-amber-600" 
                        : "bg-gradient-to-br from-card to-muted/30 border-border hover:border-primary/30 hover:shadow-md"
                    )}
                  >
                    <div className="flex items-center justify-center gap-3 pb-2 border-b-2"
                      style={{ borderColor: task.taskColor + '40' }}
                    >
                      <Badge
                        className="text-white text-xs md:text-sm font-bold px-3 py-1 shadow-sm"
                        style={{ 
                          backgroundColor: task.taskColor,
                          boxShadow: `0 2px 8px ${task.taskColor}40`
                        }}
                      >
                        {task.taskName}
                      </Badge>
                    </div>
                    {task.people.length === 0 ? (
                      <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 py-2 justify-center">
                        <Warning size={18} weight="fill" />
                        <span className="text-xs md:text-sm font-semibold">{language === 'da' ? 'Ingen tildelt' : 'No one assigned'}</span>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {task.people.map((person, personIdx) => (
                          <motion.div
                            key={personIdx}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 + personIdx * 0.05 }}
                            className="flex items-center gap-2 p-2 rounded-lg bg-background/60 hover:bg-background transition-colors duration-200"
                          >
                            <div 
                              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                              style={{ backgroundColor: task.taskColor }}
                            >
                              {person.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <span className="text-xs md:text-sm text-foreground font-medium truncate">{person}</span>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            <Card className="p-4 md:p-6 bg-card border-2 hover:border-primary/40 transition-all duration-300">
              <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
                <div className="p-1.5 md:p-2 rounded-lg bg-gradient-to-br from-[oklch(0.65_0.26_340)] to-[oklch(0.70_0.20_20)]">
                  <Calendar size={20} weight="duotone" className="text-white md:hidden" />
                  <Calendar size={24} weight="duotone" className="text-white hidden md:block" />
                </div>
                <h3 className="text-base md:text-lg font-semibold text-foreground">{t.hub.overview.offToday}</h3>
              </div>
              {peopleOff.length === 0 ? (
                <p className="text-muted-foreground text-xs md:text-sm text-center py-1">{t.hub.overview.noOneOff}</p>
              ) : (
                <div className="flex flex-col gap-1.5 md:gap-2">
                  {peopleOff.map((person, idx) => (
                    <div key={idx} className="flex items-center gap-2 justify-center">
                      <User size={14} className="text-muted-foreground md:hidden" />
                      <User size={16} className="text-muted-foreground hidden md:block" />
                      <span className="text-xs md:text-sm text-foreground">{person.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-4 md:p-6 bg-card border-2 hover:border-primary/40 transition-all duration-300">
              <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
                <div className="p-1.5 md:p-2 rounded-lg bg-gradient-to-br from-[oklch(0.70_0.18_90)] to-[oklch(0.75_0.15_60)]">
                  <ForkKnife size={20} weight="duotone" className="text-white md:hidden" />
                  <ForkKnife size={24} weight="duotone" className="text-white hidden md:block" />
                </div>
                <h3 className="text-base md:text-lg font-semibold text-foreground">{t.hub.overview.todaysMeal}</h3>
              </div>
              {!todaysMeal ? (
                <p className="text-muted-foreground text-xs md:text-sm text-center py-1">{t.hub.overview.noMeal}</p>
              ) : (
                <p className="text-xs md:text-sm text-foreground leading-relaxed break-words overflow-wrap-anywhere text-center">{todaysMeal}</p>
              )}
            </Card>

            <Card className="p-4 md:p-6 bg-card border-2 hover:border-primary/40 transition-all duration-300">
              <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
                <div className="p-1.5 md:p-2 rounded-lg bg-gradient-to-br from-[oklch(0.58_0.25_25)] to-[oklch(0.65_0.26_340)]">
                  <FirstAidKit size={20} weight="duotone" className="text-white md:hidden" />
                  <FirstAidKit size={24} weight="duotone" className="text-white hidden md:block" />
                </div>
                <h3 className="text-base md:text-lg font-semibold text-foreground">{t.hub.overview.sickToday}</h3>
              </div>
              {peopleSick.length === 0 ? (
                <p className="text-muted-foreground text-xs md:text-sm text-center py-1">{t.hub.overview.noOneSick}</p>
              ) : (
                <div className="flex flex-col gap-1.5 md:gap-2 items-center">
                  {peopleSick.map((person, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <User size={14} className="text-muted-foreground md:hidden" />
                      <User size={16} className="text-muted-foreground hidden md:block" />
                      <span className="text-xs md:text-sm text-foreground">{person}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </motion.div>

        <motion.div 
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          {modules.filter(module => module.available).map((module, index) => {
            const cardAnimation = getCardAnimation(module.category)
            const iconAnimation = getIconAnimation(module.category)
            
            return (
              <motion.div
                key={module.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + index * 0.05, duration: 0.4 }}
              >
                <motion.div
                  initial={cardAnimation.initial}
                  whileHover={cardAnimation.hover}
                  whileTap={cardAnimation.tap}
                  transition={cardAnimation.transition}
                >
                  <Card
                    className="relative overflow-hidden border-2 transition-all duration-300 group h-full min-h-[180px] sm:min-h-[220px] flex flex-col cursor-pointer hover:border-primary/40"
                    onClick={() => handleModuleClick(module.id)}
                  >
                    {module.id === 'email' && unreadInboxCount > 0 && (
                      <Badge className="absolute top-4 right-4 md:top-5 md:right-5 z-10 bg-[oklch(0.58_0.25_25)] text-white px-3 py-1.5 md:px-4 md:py-2 text-xs max-w-[calc(100%-2rem)] text-center whitespace-nowrap">
                        {unreadInboxCount} {unreadInboxCount > 1 ? t.hub.newMessagesPlural : t.hub.newMessages}
                      </Badge>
                    )}
                    {module.id === 'manager' && pendingVacationRequests > 0 && (
                      <Badge className="absolute top-4 right-4 md:top-5 md:right-5 z-10 bg-[oklch(0.58_0.25_25)] text-white px-3 py-1.5 md:px-4 md:py-2 text-xs max-w-[calc(100%-2rem)] text-center whitespace-nowrap">
                        {pendingVacationRequests} {pendingVacationRequests > 1 ? (language === 'da' ? 'anmodninger' : 'requests') : (language === 'da' ? 'anmodning' : 'request')}
                      </Badge>
                    )}
                    <motion.div 
                      className="absolute inset-0 bg-gradient-to-br"
                      style={{
                        background: `radial-gradient(circle at top right, ${module.color}15, transparent)`
                      }}
                      initial={{ opacity: 0 }}
                      whileHover={{ opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    />
                    
                    <div className="relative p-4 md:p-6 flex flex-col flex-1">
                      <motion.div 
                        className={cn(
                          "mb-3 md:mb-4 inline-flex items-center justify-center rounded-2xl p-2 md:p-3 shadow-lg",
                          `bg-gradient-to-br ${module.gradient}`
                        )}
                        style={{ color: 'white' }}
                        initial={iconAnimation.initial}
                        whileHover={iconAnimation.hover}
                        transition={iconAnimation.transition}
                      >
                        <div className="[&>svg]:w-8 [&>svg]:h-8 md:[&>svg]:w-12 md:[&>svg]:h-12">
                          {module.icon}
                        </div>
                      </motion.div>

                      <h3 className="text-sm sm:text-base md:text-lg font-bold mb-1.5 md:mb-2 text-foreground text-center">
                        {module.title}
                      </h3>
                      
                      <p className="text-muted-foreground text-xs leading-relaxed mb-3 md:mb-4 flex-1">
                        {module.description}
                      </p>
                    </div>
                  </Card>
                </motion.div>
              </motion.div>
            )
          })}
        </motion.div>
      </div>

      <Dialog open={showQuickAssignDialog} onOpenChange={setShowQuickAssignDialog}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader className="text-center">
            <DialogTitle className="text-xl font-bold text-center">
              {language === 'da' ? 'Tildel opgave' : 'Assign task'}
              {selectedTaskForAssign && (
                <span className="block text-sm text-muted-foreground font-normal mt-1">
                  {selectedTaskForAssign.roleName}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="employee-select">
                {language === 'da' ? 'Vælg medarbejder' : 'Select employee'}
              </Label>
              <Select value={selectedEmployeeForAssign} onValueChange={setSelectedEmployeeForAssign}>
                <SelectTrigger id="employee-select">
                  <SelectValue placeholder={language === 'da' ? 'Vælg medarbejder...' : 'Select employee...'} />
                </SelectTrigger>
                <SelectContent>
                  {allEmployees.map((employee) => (
                    <SelectItem key={employee.email} value={employee.email}>
                      {employee.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowQuickAssignDialog(false)}>
              {language === 'da' ? 'Annuller' : 'Cancel'}
            </Button>
            <Button
              onClick={handleQuickAssign}
              className="bg-gradient-to-r from-[oklch(0.50_0.12_250)] to-[oklch(0.55_0.10_210)] text-white"
            >
              {language === 'da' ? 'Tildel' : 'Assign'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
