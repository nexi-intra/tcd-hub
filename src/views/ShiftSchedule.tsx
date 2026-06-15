import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Plus, Trash, UserCircle, Tag, Calendar as CalendarIcon, PencilSimple, ChatText, Phone, FirstAidKit, Airplane } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useKV } from '@github/spark/hooks'
import { UserProfile } from '@/components/UserProfile'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { format } from 'date-fns'
import { da, enUS } from 'date-fns/locale'
import { Textarea } from '@/components/ui/textarea'
import type { TeamEmployee } from '@/views/TeamOverview'
import { getEmployeeColorByEmail } from '@/lib/employeeColors'
import { useLanguage } from '@/contexts/LanguageContext'

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

interface ShiftScheduleProps {
  onNavigateBack: () => void
  onLogout: () => void
}

const danishHolidays2024 = [
  '2024-01-01', '2024-03-28', '2024-03-29', '2024-03-31', '2024-04-01',
  '2024-04-26', '2024-05-09', '2024-05-19', '2024-05-20', '2024-06-05',
  '2024-12-24', '2024-12-25', '2024-12-26', '2024-12-31'
]

const danishHolidays2025 = [
  '2025-01-01', '2025-04-17', '2025-04-18', '2025-04-20', '2025-04-21',
  '2025-05-15', '2025-05-29', '2025-06-08', '2025-06-09', '2025-12-24',
  '2025-12-25', '2025-12-26', '2025-12-31'
]

const danishHolidays2026 = [
  '2026-01-01', '2026-04-02', '2026-04-03', '2026-04-05', '2026-04-06',
  '2026-05-14', '2026-05-21', '2026-05-24', '2026-06-04', '2026-12-24',
  '2026-12-25', '2026-12-26', '2026-12-31'
]

const allDanishHolidays = [...danishHolidays2024, ...danishHolidays2025, ...danishHolidays2026]

export function ShiftSchedule({ onNavigateBack, onLogout }: ShiftScheduleProps) {
  const [roles, setRoles] = useKV<ShiftRole[]>('shift-roles', [])
  const [assignments, setAssignments] = useKV<ShiftAssignment[]>('shift-assignments', [])
  const [employees, setEmployees] = useState<TeamEmployee[]>([])
  const [sickLeaveEntries, setSickLeaveEntries] = useKV<SickLeaveEntry[]>('sick-leave-entries', [])
  const [vacationEntries, setVacationEntries] = useKV<VacationEntry[]>('vacation-entries', [])
  const [isAdmin, setIsAdmin] = useState(false)
  const [userEmail, setUserEmail] = useState<string>('')
  
  const [showRoleDialog, setShowRoleDialog] = useState(false)
  const [showAssignmentDialog, setShowAssignmentDialog] = useState(false)
  const [showWeekAssignmentDialog, setShowWeekAssignmentDialog] = useState(false)
  const [showWeekClearDialog, setShowWeekClearDialog] = useState(false)
  const [showCommentDialog, setShowCommentDialog] = useState(false)
  const [editingRole, setEditingRole] = useState<ShiftRole | null>(null)
  const [editingComment, setEditingComment] = useState<{ employeeId: string; date: string } | null>(null)
  const [commentText, setCommentText] = useState('')
  
  const [newRoleName, setNewRoleName] = useState('')
  const [newRoleColor, setNewRoleColor] = useState('#8b5cf6')

  const colorPresets = [
    { name: 'Lilla', value: '#8b5cf6' },
    { name: 'Blå', value: '#3b82f6' },
    { name: 'Cyan', value: '#06b6d4' },
    { name: 'Grøn', value: '#10b981' },
    { name: 'Gul', value: '#f59e0b' },
    { name: 'Orange', value: '#f97316' },
    { name: 'Rød', value: '#ef4444' },
    { name: 'Pink', value: '#ec4899' },
    { name: 'Indigo', value: '#6366f1' },
    { name: 'Teal', value: '#14b8a6' },
    { name: 'Lime', value: '#84cc16' },
    { name: 'Rose', value: '#f43f5e' },
  ]
  
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [selectedRole, setSelectedRole] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  
  const [weekEmployee, setWeekEmployee] = useState('')
  const [weekRole, setWeekRole] = useState('')
  const [weekNumber, setWeekNumber] = useState<number | null>(null)
  
  const [clearWeekNumber, setClearWeekNumber] = useState<number | null>(null)
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  
  const [activeTab, setActiveTab] = useState('schedule')
  const dateScrollRef = useRef<HTMLDivElement>(null)
  const contentScrollRef = useRef<HTMLDivElement>(null)
  const scheduleScrollRef = useRef<HTMLDivElement>(null)
  const hasScrolledToToday = useRef(false)

  const syncScroll = (source: 'date' | 'content') => {
    if (source === 'date' && dateScrollRef.current && contentScrollRef.current) {
      contentScrollRef.current.scrollTop = dateScrollRef.current.scrollTop
    } else if (source === 'content' && dateScrollRef.current && contentScrollRef.current) {
      dateScrollRef.current.scrollTop = contentScrollRef.current.scrollTop
    }
  }

  const months = [
    'Januar', 'Februar', 'Marts', 'April', 'Maj', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'December'
  ]

  useEffect(() => {
    const loadUserAndCheckAdmin = async () => {
      const session = await window.spark.kv.get<{ userId: string; email: string }>('user-session')
      if (session) {
        setUserEmail(session.email)
        
        const usersData = await window.spark.kv.get<Record<string, { email: string; fullName: string; role?: string }>>('users')
        if (usersData && usersData[session.email]?.role === 'admin') {
          setIsAdmin(true)
        }
      }
    }
    loadUserAndCheckAdmin()
  }, [])

  useEffect(() => {
    loadEmployees()
  }, [])

  const loadEmployees = async () => {
    const usersData = await window.spark.kv.get<Record<string, { email: string; fullName: string; role?: string; phone?: string }>>('users')
    const userSettings = await window.spark.kv.get<Record<string, { phoneNumber?: string }>>('user-settings') || {}
    
    if (usersData && typeof usersData === 'object' && !Array.isArray(usersData)) {
      const userList: TeamEmployee[] = Object.values(usersData).map(user => {
        const settingsPhone = userSettings[user.email]?.phoneNumber
        const phone = user.phone || settingsPhone || ''
        
        return {
          id: user.email,
          name: user.fullName,
          email: user.email,
          phone,
          role: user.role as any
        }
      })
      setEmployees(userList)
    } else if (Array.isArray(usersData)) {
      setEmployees(usersData as TeamEmployee[])
    } else {
      setEmployees([])
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onNavigateBack()
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onNavigateBack])

  useEffect(() => {
    if (activeTab === 'schedule' && scheduleScrollRef.current && !hasScrolledToToday.current) {
      const scrollToCurrentWeek = () => {
        const today = new Date()
        const currentDay = today.getDate()
        const rowHeight = 80
        const headerHeight = 50
        const scrollPosition = Math.max(0, (currentDay - 1) * rowHeight - headerHeight)
        
        scheduleScrollRef.current?.scrollTo({
          top: scrollPosition,
          behavior: 'smooth'
        })
        
        hasScrolledToToday.current = true
      }

      setTimeout(scrollToCurrentWeek, 300)
    }
  }, [activeTab, selectedMonth, selectedYear])

  const isWeekend = (date: Date) => {
    const day = date.getDay()
    return day === 0 || day === 6
  }

  const isDanishHoliday = (dateString: string) => {
    return allDanishHolidays.includes(dateString)
  }

  const isDateLocked = (dateString: string) => {
    const date = new Date(dateString)
    return isWeekend(date) || isDanishHoliday(dateString)
  }

  const handleAddRole = () => {
    if (!newRoleName.trim()) {
      toast.error('Indtast et rolle navn')
      return
    }

    const newRole: ShiftRole = {
      id: Date.now().toString(),
      name: newRoleName.trim(),
      color: newRoleColor
    }

    setRoles((current) => [...(current || []), newRole])
    setNewRoleName('')
    setNewRoleColor('#8b5cf6')
    setShowRoleDialog(false)
    toast.success('Rolle tilføjet')
  }

  const handleUpdateRole = () => {
    if (!editingRole) return
    if (!newRoleName.trim()) {
      toast.error('Indtast et rolle navn')
      return
    }

    setRoles((current) => 
      (current || []).map(r => 
        r.id === editingRole.id 
          ? { ...r, name: newRoleName.trim(), color: newRoleColor }
          : r
      )
    )
    setNewRoleName('')
    setNewRoleColor('#8b5cf6')
    setEditingRole(null)
    setShowRoleDialog(false)
    toast.success('Rolle opdateret')
  }

  const handleDeleteRole = (roleId: string) => {
    setRoles((current) => (current || []).filter(r => r.id !== roleId))
    setAssignments((current) => (current || []).filter(a => a.roleId !== roleId))
    toast.success('Rolle slettet')
  }

  const handleAddAssignment = () => {
    if (!selectedEmployee || !selectedRole || !selectedDate) {
      toast.error('Udfyld alle felter')
      return
    }

    if (isDateLocked(selectedDate)) {
      toast.error('Kan ikke tildele vagter på weekender eller helligdage')
      return
    }

    const employee = (employees || []).find(e => e.id === selectedEmployee)
    if (!employee) return

    const newAssignment: ShiftAssignment = {
      id: Date.now().toString(),
      employeeId: selectedEmployee,
      employeeName: employee.name,
      roleId: selectedRole,
      date: selectedDate
    }

    setAssignments((current) => [...(current || []), newAssignment])
    setSelectedEmployee('')
    setSelectedRole('')
    setSelectedDate('')
    setShowAssignmentDialog(false)
    toast.success('Vagt tildelt')
  }

  const handleDeleteAssignment = (assignmentId: string) => {
    setAssignments((current) => (current || []).filter(a => a.id !== assignmentId))
    toast.success('Vagt fjernet')
  }

  const openEditRoleDialog = (role: ShiftRole) => {
    setEditingRole(role)
    setNewRoleName(role.name)
    setNewRoleColor(role.color)
    setShowRoleDialog(true)
  }

  const openAddRoleDialog = () => {
    setEditingRole(null)
    setNewRoleName('')
    setNewRoleColor('#8b5cf6')
    setShowRoleDialog(true)
  }

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay()
  }

  const getWeekNumber = (date: Date) => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    const dayNum = d.getUTCDay() || 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  }

  const isCurrentWeek = (date: Date) => {
    const today = new Date()
    return getWeekNumber(date) === getWeekNumber(today) && date.getFullYear() === today.getFullYear()
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear()
  }

  const getAssignmentsForEmployeeAndDate = (employeeId: string, dateString: string) => {
    return (assignments || []).filter(a => a.employeeId === employeeId && a.date === dateString)
  }

  const handleAddTaskToCell = (employeeId: string, dateString: string, roleId: string) => {
    const employee = (employees || []).find(e => e.id === employeeId)
    if (!employee) return

    if (isDateLockedForEmployee(employee.email, dateString)) {
      const vacation = getEmployeeVacationForDate(employee.email, dateString)
      if (vacation) {
        toast.error('Kan ikke tildele vagter når medarbejderen er på ferie')
      } else {
        toast.error('Kan ikke tildele vagter på weekender eller helligdage')
      }
      return
    }

    const newAssignment: ShiftAssignment = {
      id: Date.now().toString(),
      employeeId: employeeId,
      employeeName: employee.name,
      roleId: roleId,
      date: dateString
    }

    setAssignments((current) => [...(current || []), newAssignment])
    toast.success('Opgave tilføjet')
  }

  const getWeekDates = (weekNum: number, year: number) => {
    const firstDayOfYear = new Date(year, 0, 1)
    const daysOffset = (weekNum - 1) * 7
    const firstDayOfWeek = new Date(firstDayOfYear.getTime() + daysOffset * 24 * 60 * 60 * 1000)
    
    while (firstDayOfWeek.getDay() !== 1) {
      firstDayOfWeek.setDate(firstDayOfWeek.getDate() - 1)
    }
    
    const dates = []
    for (let i = 0; i < 5; i++) {
      const date = new Date(firstDayOfWeek)
      date.setDate(firstDayOfWeek.getDate() + i)
      const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      dates.push(dateString)
    }
    
    return dates
  }

  const handleAssignWeek = () => {
    if (!weekEmployee || !weekRole || weekNumber === null) {
      toast.error('Udfyld alle felter')
      return
    }

    const employee = (employees || []).find(e => e.id === weekEmployee)
    if (!employee) return

    const weekDates = getWeekDates(weekNumber, selectedYear)
    const newAssignments: ShiftAssignment[] = []
    let skippedCount = 0
    let addedCount = 0

    weekDates.forEach(dateString => {
      if (isDateLockedForEmployee(employee.email, dateString)) {
        skippedCount++
        return
      }

      newAssignments.push({
        id: `${Date.now()}-${dateString}`,
        employeeId: weekEmployee,
        employeeName: employee.name,
        roleId: weekRole,
        date: dateString
      })
      addedCount++
    })

    if (newAssignments.length > 0) {
      setAssignments((current) => [...(current || []), ...newAssignments])
    }

    setWeekEmployee('')
    setWeekRole('')
    setWeekNumber(null)
    setShowWeekAssignmentDialog(false)

    if (addedCount > 0) {
      toast.success(`${addedCount} vagt${addedCount > 1 ? 'er' : ''} tildelt${skippedCount > 0 ? ` (${skippedCount} sprunget over)` : ''}`)
    } else {
      toast.error('Ingen vagter kunne tildeles')
    }
  }

  const handleClearWeek = () => {
    if (clearWeekNumber === null) {
      toast.error('Vælg en uge')
      return
    }

    const weekDates = getWeekDates(clearWeekNumber, selectedYear)
    
    setAssignments((current) => {
      const filteredAssignments = (current || []).filter(assignment => {
        return !weekDates.includes(assignment.date)
      })
      return filteredAssignments
    })

    const removedCount = (assignments || []).filter(assignment => weekDates.includes(assignment.date)).length

    setClearWeekNumber(null)
    setShowWeekClearDialog(false)

    if (removedCount > 0) {
      toast.success(`${removedCount} opgave${removedCount > 1 ? 'r' : ''} fjernet fra uge ${clearWeekNumber}`)
    } else {
      toast.info('Ingen opgaver fundet i den valgte uge')
    }
  }

  const openCommentDialog = (employeeId: string, dateString: string) => {
    const cellAssignments = getAssignmentsForEmployeeAndDate(employeeId, dateString)
    const existingComment = cellAssignments.find(a => a.comment)?.comment || ''
    
    setEditingComment({ employeeId, date: dateString })
    setCommentText(existingComment)
    setShowCommentDialog(true)
  }

  const handleSaveComment = () => {
    if (!editingComment) return

    const { employeeId, date } = editingComment
    const cellAssignments = getAssignmentsForEmployeeAndDate(employeeId, date)

    if (commentText.trim()) {
      if (cellAssignments.length > 0) {
        setAssignments((current) => 
          (current || []).map(a => 
            a.employeeId === employeeId && a.date === date
              ? { ...a, comment: commentText.trim() }
              : a
          )
        )
        toast.success('Kommentar gemt')
      } else {
        const employee = (employees || []).find(e => e.id === employeeId)
        if (employee) {
          const newAssignment: ShiftAssignment = {
            id: Date.now().toString(),
            employeeId: employeeId,
            employeeName: employee.name,
            roleId: '',
            date: date,
            comment: commentText.trim()
          }
          setAssignments((current) => [...(current || []), newAssignment])
          toast.success('Kommentar tilføjet')
        }
      }
    } else {
      setAssignments((current) => 
        (current || []).map(a => 
          a.employeeId === employeeId && a.date === date
            ? { ...a, comment: undefined }
            : a
        )
      )
      toast.success('Kommentar fjernet')
    }

    setShowCommentDialog(false)
    setEditingComment(null)
    setCommentText('')
  }

  const getCellComment = (employeeId: string, dateString: string) => {
    const cellAssignments = getAssignmentsForEmployeeAndDate(employeeId, dateString)
    const commentAssignment = cellAssignments.find(a => a.comment)
    return commentAssignment?.comment || ''
  }

  const handleDeleteComment = (employeeId: string, dateString: string) => {
    setAssignments((current) => 
      (current || []).map(a => 
        a.employeeId === employeeId && a.date === dateString && a.comment
          ? { ...a, comment: undefined }
          : a
      ).filter(a => !(a.employeeId === employeeId && a.date === dateString && !a.roleId && !a.comment))
    )
    toast.success('Kommentar slettet')
  }

  const getEmployeeSickLeaveForDate = (employeeEmail: string, dateString: string) => {
    if (!sickLeaveEntries || sickLeaveEntries.length === 0) return null
    
    const targetDate = new Date(dateString)
    if (isNaN(targetDate.getTime())) return null
    targetDate.setHours(0, 0, 0, 0)
    
    return (sickLeaveEntries || []).find(entry => {
      if (entry.userEmail !== employeeEmail) return false
      if (entry.status !== 'approved') return false
      
      try {
        const sickDate = new Date(entry.startDate)
        if (isNaN(sickDate.getTime())) return false
        sickDate.setHours(0, 0, 0, 0)
        
        return sickDate.getTime() === targetDate.getTime()
      } catch {
        return false
      }
    })
  }

  const getEmployeeVacationForDate = (employeeEmail: string, dateString: string) => {
    if (!vacationEntries || vacationEntries.length === 0) return null
    
    const targetDate = new Date(dateString)
    if (isNaN(targetDate.getTime())) return null
    targetDate.setHours(0, 0, 0, 0)
    
    return (vacationEntries || []).find(entry => {
      if (entry.userEmail !== employeeEmail) return false
      if (entry.status !== 'approved') return false
      
      try {
        const startDate = new Date(entry.startDate)
        const endDate = new Date(entry.endDate)
        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return false
        
        startDate.setHours(0, 0, 0, 0)
        endDate.setHours(0, 0, 0, 0)
        
        return targetDate.getTime() >= startDate.getTime() && targetDate.getTime() <= endDate.getTime()
      } catch {
        return false
      }
    })
  }

  const isDateLockedForEmployee = (employeeEmail: string, dateString: string) => {
    const date = new Date(dateString)
    const vacation = getEmployeeVacationForDate(employeeEmail, dateString)
    return isWeekend(date) || isDanishHoliday(dateString) || !!vacation
  }



  const renderScheduleTable = () => {
    const daysInMonth = getDaysInMonth(selectedMonth, selectedYear)
    const rows = []

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(selectedYear, selectedMonth, day)
      const dateString = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const isLocked = isDateLocked(dateString)
      const currentWeek = isCurrentWeek(date)
      const todayDate = isToday(date)
      
      const dayNames = ['Søn', 'Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør']
      const dayName = dayNames[date.getDay()]
      const weekNumber = getWeekNumber(date)

      const dateCell = (
        <div className="flex items-center gap-3">
          <Badge 
            variant={currentWeek ? "default" : "outline"} 
            className={cn(
              "text-[11px] px-2 py-0.5 font-bold",
              currentWeek && "bg-primary text-primary-foreground shadow-lg",
              todayDate && "ring-2 ring-accent"
            )}
          >
            U{weekNumber}
          </Badge>
          <span className={cn(todayDate && "font-extrabold text-accent")}>{dayName}</span>
          <span className={cn(todayDate && "font-extrabold text-accent")}>{day}/{selectedMonth + 1}</span>
          {isDanishHoliday(dateString) && (
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0.5">
              Helligdag
            </Badge>
          )}
          {todayDate && (
            <Badge className="text-[10px] px-1.5 py-0.5 bg-accent text-accent-foreground">
              I dag
            </Badge>
          )}
        </div>
      )

      rows.push(
        <tr key={day} className={cn(
          "border-b-2 border-border transition-all",
          isLocked && "bg-muted/30",
          currentWeek && "bg-primary/10",
          todayDate && "bg-accent/20 ring-2 ring-accent/50"
        )}>
          <td className={cn(
            "sticky left-0 bg-card border-r-2 border-border px-3 py-5 font-semibold transition-all z-40 shadow-[2px_0_8px_rgba(0,0,0,0.15)] w-[200px]",
            isWeekend(date) && "text-destructive",
            currentWeek && "bg-primary/10",
            todayDate && "bg-accent/20 ring-2 ring-accent/50"
          )}>
            {dateCell}
          </td>
          {(employees || []).map((employee, employeeIndex) => {
            const cellAssignments = getAssignmentsForEmployeeAndDate(employee.id, dateString)
            const cellComment = getCellComment(employee.id, dateString)
            const sickLeave = getEmployeeSickLeaveForDate(employee.email, dateString)
            const vacation = getEmployeeVacationForDate(employee.email, dateString)
            const isEmployeeCellLocked = isDateLockedForEmployee(employee.email, dateString)
            
            const employeeColor = getEmployeeColorByEmail(employee.email)

            return (
              <td
                key={employee.id}
                className={cn(
                  "border-x-2 border-border p-3 text-center transition-all min-w-[160px]",
                  isLocked && "bg-muted/20",
                  sickLeave && "bg-red-50",
                  vacation && "bg-blue-50",
                  currentWeek && !sickLeave && !vacation && "ring-1 ring-inset",
                  todayDate && !sickLeave && !vacation && "ring-2 ring-inset",
                  todayDate && sickLeave && "bg-red-100 ring-2 ring-red-300",
                  todayDate && vacation && "bg-blue-100 ring-2 ring-blue-300"
                )}
                style={{
                  backgroundColor: sickLeave 
                    ? undefined 
                    : vacation
                    ? undefined
                    : `color-mix(in oklch, ${employeeColor.bg} 15%, transparent)`,
                  ...(currentWeek && !sickLeave && !vacation && { 
                    boxShadow: `inset 0 0 0 1px ${employeeColor.bg}` 
                  }),
                  ...(todayDate && !sickLeave && !vacation && { 
                    boxShadow: `inset 0 0 0 2px ${employeeColor.bg}` 
                  })
                }}
              >
                <div className="space-y-2">
                  {vacation && (
                    <div className="relative group">
                      <div
                        className="px-2 py-1.5 rounded-md text-xs font-bold bg-blue-100 text-blue-800 border-2 border-blue-400 flex items-center gap-1.5 cursor-pointer"
                        title={vacation.notes || 'På ferie'}
                      >
                        <Airplane size={16} weight="fill" />
                        <span className="truncate flex-1 text-left">Ferie</span>
                      </div>
                    </div>
                  )}
                  {sickLeave && (
                    <div className="relative group">
                      <div
                        className="px-2 py-1.5 rounded-md text-xs font-bold bg-red-100 text-red-800 border-2 border-red-400 flex items-center gap-1.5 cursor-pointer"
                        title={sickLeave.reason || 'Sygemeldt'}
                      >
                        <FirstAidKit size={16} weight="fill" />
                        <span className="truncate flex-1 text-left">Syg</span>
                      </div>
                    </div>
                  )}
                  {cellComment && (
                    <div className="relative group">
                      <div
                        className="px-2 py-1.5 rounded-md text-xs font-medium bg-amber-100 text-amber-800 border-2 border-amber-400 flex items-center gap-1.5 cursor-pointer hover:bg-amber-200 transition-all"
                        onClick={() => openCommentDialog(employee.id, dateString)}
                        title={cellComment}
                      >
                        <ChatText size={14} weight="fill" />
                        <span className="truncate flex-1 text-left">{cellComment}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteComment(employee.id, dateString)
                        }}
                      >
                        <Trash size={12} />
                      </Button>
                    </div>
                  )}
                  {cellAssignments.length > 0 ? (
                    <>
                      {cellAssignments.map((assignment) => {
                        const role = (roles || []).find(r => r.id === assignment.roleId)
                        if (!role) return null
                        
                        return (
                          <div key={assignment.id} className="group relative">
                            <div
                              className="px-2 py-1.5 rounded-md text-xs font-semibold truncate"
                              style={{ 
                                backgroundColor: `${role.color}30`,
                                color: role.color,
                                border: `2px solid ${role.color}`
                              }}
                              title={role.name}
                            >
                              {role.name}
                            </div>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteAssignment(assignment.id)
                              }}
                            >
                              <Trash size={12} />
                            </Button>
                          </div>
                        )
                      })}
                      {!isEmployeeCellLocked && (roles || []).length > 0 && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <button className="w-full h-full min-h-[28px] text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/50 rounded-md transition-all flex items-center justify-center border-2 border-dashed border-muted-foreground/20">
                              <Plus size={14} />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-64 p-2" align="center">
                            <div className="space-y-1">
                              <p className="text-sm font-semibold mb-2 px-2">Vælg Opgave</p>
                              {(roles || []).map(r => (
                                <button
                                  key={r.id}
                                  onClick={() => handleAddTaskToCell(employee.id, dateString, r.id)}
                                  className="w-full text-left px-3 py-2 rounded-md hover:bg-muted transition-all flex items-center gap-3"
                                >
                                  <div
                                    className="w-4 h-4 rounded-full"
                                    style={{ backgroundColor: r.color }}
                                  />
                                  <span className="text-sm font-medium">{r.name}</span>
                                </button>
                              ))}
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
                    </>
                  ) : (
                    !isEmployeeCellLocked && (roles || []).length > 0 ? (
                      <Popover>
                        <PopoverTrigger asChild>
                          <button className="w-full h-full min-h-[32px] text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/50 rounded-md transition-all flex items-center justify-center">
                            <Plus size={16} />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-2" align="center">
                          <div className="space-y-1">
                            <p className="text-sm font-semibold mb-2 px-2">Vælg Opgave</p>
                            {(roles || []).map(r => (
                              <button
                                key={r.id}
                                onClick={() => handleAddTaskToCell(employee.id, dateString, r.id)}
                                className="w-full text-left px-3 py-2 rounded-md hover:bg-muted transition-all flex items-center gap-3"
                              >
                                <div
                                  className="w-4 h-4 rounded-full"
                                  style={{ backgroundColor: r.color }}
                                />
                                <span className="text-sm font-medium">{r.name}</span>
                              </button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    ) : (
                      <div className="text-muted-foreground/40 text-xs">
                        {!isLocked ? '−' : ''}
                      </div>
                    )
                  )}
                  {!isLocked && (
                    <button
                      onClick={() => openCommentDialog(employee.id, dateString)}
                      className={cn(
                        "w-full h-full min-h-[28px] rounded-md transition-all flex items-center justify-center gap-1.5 text-xs font-medium",
                        cellComment 
                          ? "text-amber-700 hover:text-amber-800 hover:bg-amber-50" 
                          : "text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/30"
                      )}
                      title={cellComment ? "Rediger kommentar" : "Tilføj kommentar"}
                    >
                      <ChatText size={14} weight={cellComment ? "fill" : "regular"} />
                      {!cellComment && <span className="text-[10px]">Kommentar</span>}
                    </button>
                  )}
                </div>
              </td>
            )
          })}
        </tr>
      )
    }

    return rows
  }

  return (
    <div className="min-h-screen w-full relative overflow-hidden">
      <div className="absolute top-4 right-4 z-20">
        <UserProfile 
          userEmail={userEmail} 
          onLogout={onLogout}
          showAdmin={isAdmin}
          onAdminClick={() => {}}
          hideEmail={true}
        />
      </div>
      <div className="w-full px-4 sm:px-6 py-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center gap-6 mb-8">
            <Button
              variant="ghost"
              size="icon"
              onClick={onNavigateBack}
              className="hover:bg-primary/10 h-12 w-12"
            >
              <ArrowLeft size={28} />
            </Button>
            <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-br from-primary via-secondary to-accent bg-clip-text text-transparent">
              Vagtplan
            </h1>
          </div>
        </motion.div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 max-w-2xl">
            <TabsTrigger value="schedule" className="gap-2">
              <CalendarIcon size={18} />
              Vagtplan
            </TabsTrigger>
            <TabsTrigger value="employees" className="gap-2">
              <UserCircle size={18} />
              Medarbejdere
            </TabsTrigger>
            <TabsTrigger value="tasks" className="gap-2">
              <Tag size={18} />
              Opgaver
            </TabsTrigger>
          </TabsList>

          <TabsContent value="schedule" className="space-y-4">

            <div className="w-full">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <Select
                    value={selectedMonth.toString()}
                    onValueChange={(value) => setSelectedMonth(parseInt(value))}
                  >
                    <SelectTrigger className="w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((month, index) => (
                        <SelectItem key={index} value={index.toString()}>
                          {month}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={selectedYear.toString()}
                    onValueChange={(value) => setSelectedYear(parseInt(value))}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2024">2024</SelectItem>
                      <SelectItem value="2025">2025</SelectItem>
                      <SelectItem value="2026">2026</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center gap-3">
                  <Button
                    onClick={() => setShowWeekAssignmentDialog(true)}
                    variant="default"
                    className="gap-2"
                  >
                    <Plus size={18} />
                    Tilføj Opgaver til Hel Uge
                  </Button>
                  <Button
                    onClick={() => setShowWeekClearDialog(true)}
                    variant="destructive"
                    className="gap-2"
                  >
                    <Trash size={18} />
                    Ryd Hel Uge
                  </Button>
                  <Button
                    onClick={() => {
                      const today = new Date()
                      setSelectedMonth(today.getMonth())
                      setSelectedYear(today.getFullYear())
                      toast.success('Navigeret til i dag')
                    }}
                    variant="outline"
                    className="gap-2"
                  >
                    <CalendarIcon size={18} />
                    Gå til i dag
                  </Button>
                </div>
              </div>

              <div className="shadow-inner rounded-lg border-2 border-border bg-card overflow-hidden">
                <div ref={scheduleScrollRef} className="overflow-auto relative" style={{ maxHeight: 'calc(100vh - 200px)', maxWidth: '100%' }}>
                  <table className="w-full border-collapse relative" style={{ tableLayout: 'fixed', width: 'max-content' }}>
                    <thead className="sticky top-0 z-50 bg-card shadow-lg" style={{ position: 'sticky', top: 0 }}>
                      <tr>
                        <th className="sticky left-0 z-[60] bg-card border-r-2 border-b-2 border-border px-3 py-4 text-left font-bold shadow-[2px_0_8px_rgba(0,0,0,0.15)]" style={{ position: 'sticky', left: 0, width: '160px', minWidth: '160px', maxWidth: '160px' }}>
                          <span className="text-sm font-bold">Dato</span>
                        </th>
                        {(employees || []).map((employee) => {
                          const firstName = employee.name.split(' ')[0]
                          const employeeColor = getEmployeeColorByEmail(employee.email)
                          return (
                            <th
                              key={employee.id}
                              className="border-x-2 border-b-2 border-border px-2 py-4 text-center font-bold bg-card"
                              style={{ 
                                width: '120px', 
                                minWidth: '120px', 
                                maxWidth: '120px',
                                position: 'sticky',
                                top: 0,
                                backgroundColor: 'var(--card)'
                              }}
                            >
                              <div 
                                className="text-xs font-extrabold truncate" 
                                title={employee.name}
                                style={{ 
                                  color: employeeColor.bg
                                }}
                              >
                                {firstName}
                              </div>
                            </th>
                          )
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const daysInMonth = getDaysInMonth(selectedMonth, selectedYear)
                        const rows = []
                        for (let day = 1; day <= daysInMonth; day++) {
                          const date = new Date(selectedYear, selectedMonth, day)
                          const dateString = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                          const isLocked = isDateLocked(dateString)
                          const currentWeek = isCurrentWeek(date)
                          const todayDate = isToday(date)
                          
                          const dayNames = ['Søn', 'Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør']
                          const dayName = dayNames[date.getDay()]
                          const weekNumber = getWeekNumber(date)

                          rows.push(
                            <tr 
                              key={day} 
                              className={cn(
                                "border-b-2 border-border transition-all",
                                isLocked && "bg-muted/30",
                                currentWeek && "bg-primary/10",
                                todayDate && "bg-accent/20 ring-2 ring-accent/50"
                              )}
                            >
                              <td 
                                className={cn(
                                  "sticky left-0 z-40 bg-card border-r-2 border-border px-2 py-3 font-semibold transition-all shadow-[2px_0_8px_rgba(0,0,0,0.1)]",
                                  isWeekend(date) && "text-destructive",
                                  currentWeek && "bg-primary/10",
                                  todayDate && "bg-accent/20"
                                )}
                                style={{ width: '160px', minWidth: '160px', maxWidth: '160px' }}
                              >
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <Badge 
                                    variant={currentWeek ? "default" : "outline"} 
                                    className={cn(
                                      "text-[10px] px-1.5 py-0.5 font-bold",
                                      currentWeek && "bg-primary text-primary-foreground shadow-lg",
                                      todayDate && "ring-2 ring-accent"
                                    )}
                                  >
                                    U{weekNumber}
                                  </Badge>
                                  <span className={cn("text-xs", todayDate && "font-extrabold text-accent")}>{dayName}</span>
                                  <span className={cn("text-xs", todayDate && "font-extrabold text-accent")}>{day}/{selectedMonth + 1}</span>
                                  {isDanishHoliday(dateString) && (
                                    <Badge variant="destructive" className="text-[9px] px-1 py-0">
                                      Hel
                                    </Badge>
                                  )}
                                  {todayDate && (
                                    <Badge className="text-[9px] px-1 py-0 bg-accent text-accent-foreground">
                                      I dag
                                    </Badge>
                                  )}
                                </div>
                              </td>
                              {(employees || []).map((employee) => {
                                const cellAssignments = getAssignmentsForEmployeeAndDate(employee.id, dateString)
                                const cellComment = getCellComment(employee.id, dateString)
                                const sickLeave = getEmployeeSickLeaveForDate(employee.email, dateString)
                                const vacation = getEmployeeVacationForDate(employee.email, dateString)
                                const isEmployeeCellLocked = isDateLockedForEmployee(employee.email, dateString)
                                
                                const employeeColor = getEmployeeColorByEmail(employee.email)

                                return (
                                  <td
                                    key={employee.id}
                                    className={cn(
                                      "border-x-2 border-border p-2 text-center transition-all",
                                      isLocked && "bg-muted/20",
                                      sickLeave && "bg-red-50",
                                      vacation && "bg-blue-50",
                                      currentWeek && !sickLeave && !vacation && "ring-1 ring-inset",
                                      todayDate && !sickLeave && !vacation && "ring-2 ring-inset",
                                      todayDate && sickLeave && "bg-red-100 ring-2 ring-red-300",
                                      todayDate && vacation && "bg-blue-100 ring-2 ring-blue-300"
                                    )}
                                    style={{
                                      width: '120px',
                                      minWidth: '120px',
                                      maxWidth: '120px',
                                      backgroundColor: sickLeave 
                                        ? undefined 
                                        : vacation
                                        ? undefined
                                        : `color-mix(in oklch, ${employeeColor.bg} 12%, transparent)`,
                                      ...(currentWeek && !sickLeave && !vacation && { 
                                        boxShadow: `inset 0 0 0 1px ${employeeColor.bg}` 
                                      }),
                                      ...(todayDate && !sickLeave && !vacation && { 
                                        boxShadow: `inset 0 0 0 2px ${employeeColor.bg}` 
                                      })
                                    }}
                                  >
                                    <div className="space-y-1.5 min-h-[60px]">
                                      {vacation && (
                                        <div className="relative group">
                                          <div
                                            className="px-1 py-1 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-400 flex items-center gap-1 cursor-pointer justify-center"
                                            title={vacation.notes || 'På ferie'}
                                          >
                                            <Airplane size={12} weight="fill" />
                                            <span className="truncate">Ferie</span>
                                          </div>
                                        </div>
                                      )}
                                      {sickLeave && (
                                        <div className="relative group">
                                          <div
                                            className="px-1 py-1 rounded text-[10px] font-bold bg-red-100 text-red-800 border border-red-400 flex items-center gap-1 cursor-pointer justify-center"
                                            title={sickLeave.reason || 'Sygemeldt'}
                                          >
                                            <FirstAidKit size={12} weight="fill" />
                                            <span className="truncate">Syg</span>
                                          </div>
                                        </div>
                                      )}
                                      {cellComment && (
                                        <div className="relative group">
                                          <div
                                            className="px-1 py-1 rounded text-[10px] font-medium bg-amber-100 text-amber-800 border border-amber-400 flex items-center gap-1 cursor-pointer hover:bg-amber-200 transition-all justify-center"
                                            onClick={() => openCommentDialog(employee.id, dateString)}
                                            title={cellComment}
                                          >
                                            <ChatText size={11} weight="fill" />
                                            <span className="truncate flex-1">{cellComment}</span>
                                          </div>
                                          <Button
                                            size="sm"
                                            variant="destructive"
                                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                            onClick={(e) => {
                                              e.stopPropagation()
                                              handleDeleteComment(employee.id, dateString)
                                            }}
                                          >
                                            <Trash size={10} />
                                          </Button>
                                        </div>
                                      )}
                                      {cellAssignments.length > 0 ? (
                                        <>
                                          {cellAssignments.map((assignment) => {
                                            const role = (roles || []).find(r => r.id === assignment.roleId)
                                            if (!role) return null
                                            
                                            return (
                                              <div key={assignment.id} className="group relative">
                                                <div
                                                  className="px-1 py-1 rounded text-[10px] font-semibold truncate"
                                                  style={{ 
                                                    backgroundColor: `${role.color}30`,
                                                    color: role.color,
                                                    border: `1px solid ${role.color}`
                                                  }}
                                                  title={role.name}
                                                >
                                                  {role.name}
                                                </div>
                                                <Button
                                                  size="sm"
                                                  variant="destructive"
                                                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                                  onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleDeleteAssignment(assignment.id)
                                                  }}
                                                >
                                                  <Trash size={10} />
                                                </Button>
                                              </div>
                                            )
                                          })}
                                          {!isEmployeeCellLocked && (roles || []).length > 0 && (
                                            <Popover>
                                              <PopoverTrigger asChild>
                                                <button className="w-full h-full min-h-[20px] text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/50 rounded transition-all flex items-center justify-center border border-dashed border-muted-foreground/20">
                                                  <Plus size={12} />
                                                </button>
                                              </PopoverTrigger>
                                              <PopoverContent className="w-64 p-2" align="center">
                                                <div className="space-y-1">
                                                  <p className="text-sm font-semibold mb-2 px-2">Vælg Opgave</p>
                                                  {(roles || []).map(r => (
                                                    <button
                                                      key={r.id}
                                                      onClick={() => handleAddTaskToCell(employee.id, dateString, r.id)}
                                                      className="w-full text-left px-3 py-2 rounded-md hover:bg-muted transition-all flex items-center gap-3"
                                                    >
                                                      <div
                                                        className="w-4 h-4 rounded-full flex-shrink-0"
                                                        style={{ backgroundColor: r.color }}
                                                      />
                                                      <span className="text-sm font-medium truncate">{r.name}</span>
                                                    </button>
                                                  ))}
                                                </div>
                                              </PopoverContent>
                                            </Popover>
                                          )}
                                        </>
                                      ) : (
                                        !isEmployeeCellLocked && (roles || []).length > 0 ? (
                                          <Popover>
                                            <PopoverTrigger asChild>
                                              <button className="w-full h-full min-h-[24px] text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/50 rounded transition-all flex items-center justify-center">
                                                <Plus size={14} />
                                              </button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-64 p-2" align="center">
                                              <div className="space-y-1">
                                                <p className="text-sm font-semibold mb-2 px-2">Vælg Opgave</p>
                                                {(roles || []).map(r => (
                                                  <button
                                                    key={r.id}
                                                    onClick={() => handleAddTaskToCell(employee.id, dateString, r.id)}
                                                    className="w-full text-left px-3 py-2 rounded-md hover:bg-muted transition-all flex items-center gap-3"
                                                  >
                                                    <div
                                                      className="w-4 h-4 rounded-full flex-shrink-0"
                                                      style={{ backgroundColor: r.color }}
                                                    />
                                                    <span className="text-sm font-medium truncate">{r.name}</span>
                                                  </button>
                                                ))}
                                              </div>
                                            </PopoverContent>
                                          </Popover>
                                        ) : (
                                          <div className="text-muted-foreground/40 text-xs">
                                            {!isLocked ? '−' : ''}
                                          </div>
                                        )
                                      )}
                                      {!isLocked && (
                                        <button
                                          onClick={() => openCommentDialog(employee.id, dateString)}
                                          className={cn(
                                            "w-full h-full min-h-[20px] rounded transition-all flex items-center justify-center gap-1 text-[10px] font-medium",
                                            cellComment 
                                              ? "text-amber-700 hover:text-amber-800 hover:bg-amber-50" 
                                              : "text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/30"
                                          )}
                                          title={cellComment ? "Rediger kommentar" : "Tilføj kommentar"}
                                        >
                                          <ChatText size={11} weight={cellComment ? "fill" : "regular"} />
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                )
                              })}
                            </tr>
                          )
                        }
                        return rows
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="employees" className="space-y-6">
            <Card className="p-6 border-2">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <UserCircle size={28} className="text-primary" weight="duotone" />
                  <h2 className="text-2xl font-bold">Medarbejdere</h2>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-sm">
                    {(employees || []).length} {(employees || []).length === 1 ? 'Medarbejder' : 'Medarbejdere'}
                  </Badge>
                </div>
              </div>

              <div className="mb-4 p-4 bg-muted/50 rounded-lg border">
                <p className="text-sm text-muted-foreground">
                  Medarbejdere administreres via <strong>Team Oversigt</strong> menuen. Gå til Team Oversigt for at tilføje, redigere eller slette medarbejdere.
                </p>
              </div>

              {!(employees || []).length ? (
                <div className="text-center py-12">
                  <UserCircle size={48} className="text-muted-foreground mx-auto mb-4" weight="duotone" />
                  <p className="text-muted-foreground mb-4">Ingen medarbejdere endnu</p>
                  <p className="text-sm text-muted-foreground">Gå til Team Oversigt for at tilføje medarbejdere</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(employees || []).map((employee) => {
                    const employeeColor = getEmployeeColorByEmail(employee.email)
                    return (
                      <motion.div
                        key={employee.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="p-5 rounded-xl border-2 bg-card hover:shadow-md transition-all group"
                      >
                        <div className="flex items-start gap-3 mb-3">
                          <div 
                            className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg shadow-md"
                            style={{
                              backgroundColor: employeeColor.bg,
                              color: employeeColor.text
                            }}
                          >
                            {employee.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-lg truncate mb-1">{employee.name}</div>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone size={16} className="flex-shrink-0" />
                            <a 
                              href={`tel:${employee.phone}`}
                              className="hover:text-primary transition-colors"
                            >
                              {employee.phone}
                            </a>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="tasks" className="space-y-6">
            <Card className="p-6 border-2">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Tag size={28} className="text-secondary" weight="duotone" />
                  <h2 className="text-2xl font-bold">Opgaver / Roller</h2>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-sm">
                    {(roles || []).length} {(roles || []).length === 1 ? 'Opgave' : 'Opgaver'}
                  </Badge>
                  <Button
                    onClick={openAddRoleDialog}
                    size="sm"
                    className="gap-2 bg-gradient-to-r from-primary to-secondary"
                  >
                    <Plus size={16} />
                    Tilføj Opgave
                  </Button>
                </div>
              </div>

              <div className="mb-4 p-4 bg-muted/50 rounded-lg border">
                <p className="text-sm text-muted-foreground">
                  Disse opgaver/roller kan tildeles medarbejdere i vagtplanen. Alle kan tilføje og slette opgaver.
                </p>
              </div>

              {!roles || roles.length === 0 ? (
                <div className="text-center py-12">
                  <Tag size={48} className="text-muted-foreground mx-auto mb-4" weight="duotone" />
                  <p className="text-muted-foreground mb-4">Ingen opgaver endnu</p>
                  <Button
                    onClick={openAddRoleDialog}
                    className="gap-2"
                  >
                    <Plus size={20} />
                    Tilføj Din Første Opgave
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {roles.map((role) => (
                    <motion.div
                      key={role.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center justify-between p-5 rounded-xl border-2 bg-card hover:shadow-md transition-all group"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div
                          className="w-14 h-14 rounded-xl flex items-center justify-center shadow-md"
                          style={{ 
                            backgroundColor: `${role.color}30`,
                            border: `2px solid ${role.color}`
                          }}
                        >
                          <Tag size={28} style={{ color: role.color }} weight="duotone" />
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-lg mb-1">{role.name}</div>
                        </div>
                        <div
                          className="px-5 py-2.5 rounded-lg font-semibold text-sm"
                          style={{ 
                            backgroundColor: `${role.color}20`,
                            color: role.color,
                            border: `2px solid ${role.color}`
                          }}
                        >
                          Eksempel
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditRoleDialog(role)}
                          className="gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <PencilSimple size={16} />
                          Rediger
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-destructive hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash size={20} />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Slet opgave?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Er du sikker på at du vil slette <strong>{role.name}</strong>? Alle vagter tildelt til denne opgave vil også blive fjernet. Denne handling kan ikke fortrydes.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuller</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteRole(role.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Slet opgave
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      <Dialog open={showRoleDialog} onOpenChange={(open) => {
        setShowRoleDialog(open)
        if (!open) {
          setEditingRole(null)
          setNewRoleName('')
          setNewRoleColor('#8b5cf6')
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRole ? 'Rediger Rolle' : 'Tilføj Ny Rolle'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label htmlFor="role-name">Rolle Navn</Label>
              <Input
                id="role-name"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                placeholder="F.eks. Supervisor, Tekniker, Support"
              />
            </div>
            <div>
              <Label>Vælg Farve</Label>
              <div className="grid grid-cols-4 gap-3 mt-3">
                {colorPresets.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setNewRoleColor(color.value)}
                    className={cn(
                      "relative flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all hover:scale-105",
                      newRoleColor === color.value
                        ? "border-foreground shadow-lg scale-105"
                        : "border-border hover:border-muted-foreground"
                    )}
                  >
                    <div
                      className="w-10 h-10 rounded-full shadow-md"
                      style={{ backgroundColor: color.value }}
                    />
                    <span className="text-xs font-medium">{color.name}</span>
                  </button>
                ))}
              </div>
            </div>
            <Button onClick={editingRole ? handleUpdateRole : handleAddRole} className="w-full">
              {editingRole ? 'Gem Ændringer' : 'Opret Rolle'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={showAssignmentDialog} onOpenChange={(open) => {
        setShowAssignmentDialog(open)
        if (!open) {
          setSelectedEmployee('')
          setSelectedRole('')
          setSelectedDate('')
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tildel Vagt</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label htmlFor="employee">Medarbejder</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger>
                  <SelectValue placeholder="Vælg medarbejder" />
                </SelectTrigger>
                <SelectContent>
                  {(employees || []).map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="role">Rolle</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Vælg rolle" />
                </SelectTrigger>
                <SelectContent>
                  {(roles || []).map(role => (
                    <SelectItem key={role.id} value={role.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: role.color }}
                        />
                        {role.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="date">Dato</Label>
              <Input
                id="date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
            <Button onClick={handleAddAssignment} className="w-full">
              Tildel Vagt
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={showWeekAssignmentDialog} onOpenChange={(open) => {
        setShowWeekAssignmentDialog(open)
        if (!open) {
          setWeekEmployee('')
          setWeekRole('')
          setWeekNumber(null)
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tildel Opgave for Hel Uge</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label htmlFor="week-employee">Medarbejder</Label>
              <Select value={weekEmployee} onValueChange={setWeekEmployee}>
                <SelectTrigger>
                  <SelectValue placeholder="Vælg medarbejder" />
                </SelectTrigger>
                <SelectContent>
                  {(employees || []).map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="week-role">Opgave</Label>
              <Select value={weekRole} onValueChange={setWeekRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Vælg opgave" />
                </SelectTrigger>
                <SelectContent>
                  {(roles || []).map(role => (
                    <SelectItem key={role.id} value={role.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: role.color }}
                        />
                        {role.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="week-number">Uge Nummer</Label>
              <Select 
                value={weekNumber?.toString() || ''} 
                onValueChange={(value) => setWeekNumber(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Vælg uge" />
                </SelectTrigger>
                <SelectContent>
                  {(() => {
                    const currentWeek = getWeekNumber(new Date())
                    const weeks = []
                    for (let i = currentWeek; i <= 52; i++) {
                      weeks.push(
                        <SelectItem key={i} value={i.toString()}>
                          Uge {i}
                        </SelectItem>
                      )
                    }
                    return weeks
                  })()}
                </SelectContent>
              </Select>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg border">
              <p className="text-xs text-muted-foreground">
                Denne opgave vil blive tildelt til alle hverdage (mandag-fredag) i den valgte uge. Du kan tildele flere opgaver til samme dag. Weekender og helligdage springes automatisk over.
              </p>
            </div>
            <Button onClick={handleAssignWeek} className="w-full">
              Tildel Hel Uge
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={showWeekClearDialog} onOpenChange={(open) => {
        setShowWeekClearDialog(open)
        if (!open) {
          setClearWeekNumber(null)
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash size={24} weight="duotone" className="text-destructive" />
              Ryd Opgaver for Hel Uge
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label htmlFor="clear-week-number">Uge Nummer</Label>
              <Select 
                value={clearWeekNumber?.toString() || ''} 
                onValueChange={(value) => setClearWeekNumber(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Vælg uge" />
                </SelectTrigger>
                <SelectContent>
                  {(() => {
                    const currentWeek = getWeekNumber(new Date())
                    const weeks = []
                    for (let i = 1; i <= 52; i++) {
                      weeks.push(
                        <SelectItem key={i} value={i.toString()}>
                          Uge {i}
                        </SelectItem>
                      )
                    }
                    return weeks
                  })()}
                </SelectContent>
              </Select>
            </div>
            <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
              <p className="text-xs text-destructive font-medium">
                ⚠️ Advarsel: Alle opgaver for alle medarbejdere i den valgte uge vil blive fjernet. Denne handling kan ikke fortrydes.
              </p>
            </div>
            <Button onClick={handleClearWeek} variant="destructive" className="w-full gap-2">
              <Trash size={18} />
              Ryd Hele Ugen
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={showCommentDialog} onOpenChange={(open) => {
        setShowCommentDialog(open)
        if (!open) {
          setEditingComment(null)
          setCommentText('')
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ChatText size={24} weight="duotone" className="text-amber-600" />
              Kommentar
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-sm text-amber-900">Tilføj en kommentar</p>
            </div>
            <div>
              <Label htmlFor="comment-text">Kommentar</Label>
              <Textarea
                id="comment-text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="F.eks. Går kl. 14:00 til tandlæge"
                rows={4}
                className="resize-none"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSaveComment} className="flex-1">
                Gem Kommentar
              </Button>
              <Button 
                onClick={() => {
                  setCommentText('')
                  handleSaveComment()
                }} 
                variant="outline"
                className="flex-1"
              >
                Fjern Kommentar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
