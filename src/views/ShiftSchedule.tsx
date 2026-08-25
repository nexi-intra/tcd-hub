import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Plus, Trash, UserCircle, Tag, Calendar as CalendarIcon, PencilSimple, ChatText, Phone, FirstAidKit, Airplane, Gift } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useKV } from '@/hooks/useKV'
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

interface BirthdayEntry {
  email: string
  fullName: string
  birthday: string
  birthYear?: number
}

interface ShiftScheduleProps {
  onNavigateBack: () => void
  onLogout: () => void
  userEmail: string
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

export function ShiftSchedule({ onNavigateBack, onLogout, userEmail: propUserEmail }: ShiftScheduleProps) {
  const [roles, setRoles] = useKV<ShiftRole[]>('shift-roles', [])
  const [assignments, setAssignments] = useKV<ShiftAssignment[]>('shift-assignments', [])
  const [employees, setEmployees] = useState<TeamEmployee[]>([])
  const [sickLeaveEntries, setSickLeaveEntries] = useKV<SickLeaveEntry[]>('sick-leave-entries', [])
  const [vacationEntries, setVacationEntries] = useKV<VacationEntry[]>('vacation-entries', [])
  const [birthdays, setBirthdays] = useState<BirthdayEntry[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const userEmail = propUserEmail
  
  const [showRoleDialog, setShowRoleDialog] = useState(false)
  const [showAssignmentDialog, setShowAssignmentDialog] = useState(false)
  const [showWeekAssignmentDialog, setShowWeekAssignmentDialog] = useState(false)
  const [showWeekClearDialog, setShowWeekClearDialog] = useState(false)
  const [showCommentDialog, setShowCommentDialog] = useState(false)
  const [showDuplicateTaskDialog, setShowDuplicateTaskDialog] = useState(false)
  const [duplicateTaskInfo, setDuplicateTaskInfo] = useState<{ employeeName: string; roleName: string } | null>(null)
  const [editingRole, setEditingRole] = useState<ShiftRole | null>(null)
  const [editingComment, setEditingComment] = useState<{ employeeId: string; date: string } | null>(null)
  const [commentText, setCommentText] = useState('')
  
  const [newRoleName, setNewRoleName] = useState('')
  const [newRoleColor, setNewRoleColor] = useState('#8b5cf6')

  const colorPresets = [
    { name: 'Lilla', value: '#a855f7' },
    { name: 'Blå', value: '#3b82f6' },
    { name: 'Cyan', value: '#06b6d4' },
    { name: 'Grøn', value: '#10b981' },
    { name: 'Gul', value: '#eab308' },
    { name: 'Orange', value: '#f97316' },
    { name: 'Rød', value: '#ef4444' },
    { name: 'Pink', value: '#ec4899' },
    { name: 'Indigo', value: '#6366f1' },
    { name: 'Teal', value: '#14b8a6' },
    { name: 'Lime', value: '#84cc16' },
    { name: 'Rose', value: '#f43f5e' },
    { name: 'Emerald', value: '#059669' },
    { name: 'Sky', value: '#0ea5e9' },
    { name: 'Violet', value: '#8b5cf6' },
    { name: 'Amber', value: '#f59e0b' },
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
  const [scrollToToday, setScrollToToday] = useState(false)

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
      const usersData = await window.kv.get<Record<string, { email: string; fullName: string; role?: string }>>('users')
      if (usersData && usersData[userEmail]?.role === 'admin') {
        setIsAdmin(true)
      }

      const birthdaysData = await window.kv.get<BirthdayEntry[]>('employee-birthdays') || []
      setBirthdays(birthdaysData)
    }
    if (userEmail) {
      loadUserAndCheckAdmin()
    }
  }, [userEmail])

  useEffect(() => {
    loadEmployees()
  }, [])

  const loadEmployees = async () => {
    const usersData = await window.kv.get<Record<string, { email: string; fullName: string; role?: string; phone?: string }>>('users')
    const userSettings = (await window.kv.get<Record<string, { phoneNumber?: string }>>('user-settings')) || {}
    
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
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        if (selectedMonth === 0) {
          setSelectedMonth(11)
          setSelectedYear(selectedYear - 1)
        } else {
          setSelectedMonth(selectedMonth - 1)
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        if (selectedMonth === 11) {
          setSelectedMonth(0)
          setSelectedYear(selectedYear + 1)
        } else {
          setSelectedMonth(selectedMonth + 1)
        }
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onNavigateBack, selectedMonth, selectedYear])

  useEffect(() => {
    if (activeTab === 'schedule' && scheduleScrollRef.current && (!hasScrolledToToday.current || scrollToToday)) {
      const scrollToCurrentWeek = () => {
        const today = new Date()
        const currentWeekNumber = getWeekNumber(today)
        const currentMonth = today.getMonth()
        const currentYear = today.getFullYear()
        
        if (selectedMonth !== currentMonth || selectedYear !== currentYear) {
          hasScrolledToToday.current = true
          setScrollToToday(false)
          return
        }
        
        const daysInMonth = getDaysInMonth(selectedMonth, selectedYear)
        let targetDay = 1
        let foundCurrentWeek = false
        
        for (let day = 1; day <= daysInMonth; day++) {
          const date = new Date(selectedYear, selectedMonth, day)
          if (getWeekNumber(date) === currentWeekNumber && date.getFullYear() === today.getFullYear()) {
            targetDay = day
            foundCurrentWeek = true
            break
          }
        }
        
        if (foundCurrentWeek) {
          const rowHeight = 80
          const headerHeight = 60
          const offsetRows = 2
          const scrollPosition = Math.max(0, (targetDay - 1 - offsetRows) * rowHeight)
          
          scheduleScrollRef.current?.scrollTo({
            top: scrollPosition,
            behavior: 'smooth'
          })
        }
        
        hasScrolledToToday.current = true
        setScrollToToday(false)
      }

      setTimeout(scrollToCurrentWeek, 300)
    }
  }, [activeTab, selectedMonth, selectedYear, scrollToToday])

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

    const existingTask = (assignments || []).find(
      a => a.employeeId === selectedEmployee && a.roleId === selectedRole && a.date === selectedDate
    )
    
    if (existingTask) {
      const role = (roles || []).find(r => r.id === selectedRole)
      setDuplicateTaskInfo({ 
        employeeName: employee.name, 
        roleName: role?.name || 'denne opgave'
      })
      setShowDuplicateTaskDialog(true)
      return
    }

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
      const sickLeave = getEmployeeSickLeaveForDate(employee.email, dateString)
      if (vacation) {
        toast.error('Kan ikke tildele vagter når medarbejderen er på ferie')
      } else if (sickLeave) {
        toast.error('Kan ikke tildele vagter når medarbejderen er sygemeldt')
      } else {
        toast.error('Kan ikke tildele vagter på weekender eller helligdage')
      }
      return
    }

    const existingTask = (assignments || []).find(
      a => a.employeeId === employeeId && a.roleId === roleId && a.date === dateString
    )
    
    if (existingTask) {
      const role = (roles || []).find(r => r.id === roleId)
      setDuplicateTaskInfo({ 
        employeeName: employee.name, 
        roleName: role?.name || 'denne opgave'
      })
      setShowDuplicateTaskDialog(true)
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
    const sickLeave = getEmployeeSickLeaveForDate(employeeEmail, dateString)
    return isWeekend(date) || isDanishHoliday(dateString) || !!vacation || !!sickLeave
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
              "text-[11px] px-3 py-1 font-bold shadow-md border-2 transition-all",
              currentWeek && "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground border-primary/30 shadow-lg shadow-primary/20",
              !currentWeek && "border-border/40",
              todayDate && "ring-2 ring-accent ring-offset-1 animate-pulse"
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
          "border-b border-border/40 transition-all hover:bg-muted/20",
          isLocked && "bg-muted/30",
          currentWeek && "bg-gradient-to-r from-primary/5 via-primary/8 to-primary/5 shadow-sm",
          todayDate && "bg-gradient-to-r from-accent/15 via-accent/20 to-accent/15 shadow-md ring-2 ring-accent/30"
        )}>
          <td className={cn(
            "sticky left-0 bg-card border-r-2 border-border px-3 py-5 font-semibold transition-all z-40 shadow-[2px_0_8px_rgba(0,0,0,0.15)] w-[200px]",
            isWeekend(date) && "text-destructive",
            currentWeek && "bg-gradient-to-r from-primary/5 via-primary/8 to-primary/5",
            todayDate && "bg-gradient-to-r from-accent/15 via-accent/20 to-accent/15 ring-2 ring-accent/30"
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

            const dateParts = dateString.split('-')
            const dateMonth = dateParts[1]
            const dateDay = dateParts[2]
            const dateMonthDay = `${dateMonth}-${dateDay}`
            const birthdayEntry = birthdays.find(b => b.email === employee.email && b.birthday === dateMonthDay)
            const hasBirthday = !!birthdayEntry
            
            let age: number | undefined
            if (birthdayEntry?.birthYear) {
              age = selectedYear - birthdayEntry.birthYear
            }

            return (
              <td
                key={employee.id}
                className={cn(
                  "border-x border-border/40 p-3 text-center transition-all min-w-[160px]",
                  isLocked && "bg-muted/20",
                  sickLeave && "bg-gradient-to-br from-red-50 to-red-100/80 dark:from-red-950/30 dark:to-red-900/40",
                  vacation && "bg-gradient-to-br from-blue-50 to-blue-100/80 dark:from-blue-950/30 dark:to-blue-900/40",
                  currentWeek && !sickLeave && !vacation && "ring-1 ring-inset ring-primary/20",
                  todayDate && !sickLeave && !vacation && "ring-2 ring-inset ring-accent/40",
                  todayDate && sickLeave && "bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/50 dark:to-red-800/60 ring-2 ring-red-400/50",
                  todayDate && vacation && "bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/50 dark:to-blue-800/60 ring-2 ring-blue-400/50"
                )}
              >
                <div className="space-y-2">
                  {hasBirthday && birthdayEntry && (
                    <div className="relative group">
                      <div
                        className="px-2 py-1.5 rounded-md text-xs font-bold bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300 border-2 border-red-400 dark:border-red-600 flex items-center gap-1.5 cursor-default"
                        title={`${birthdayEntry.fullName} har fødselsdag i dag! 🎉${age ? ` Fylder ${age} år` : ''}`}
                      >
                        <span className="text-base">🇩🇰</span>
                        <span className="truncate flex-1 text-left">
                          {birthdayEntry.fullName}
                          {age && ` (${age})`}
                        </span>
                      </div>
                    </div>
                  )}
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
                        
                        const bgColor = role.color || '#8b5cf6'
                        
                        return (
                          <div key={assignment.id} className="group relative">
                            <div
                              className="task-badge-colored px-3 py-2.5 rounded-lg text-sm font-bold truncate transition-all hover:scale-105 shadow-lg border-2"
                              style={{ 
                                ['--task-color' as any]: bgColor,
                                backgroundColor: bgColor,
                                borderColor: `${bgColor}CC`,
                                color: 'white',
                                boxShadow: `0 6px 16px ${bgColor}60, 0 2px 4px ${bgColor}40`
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
                            <button 
                              className="w-full h-full min-h-[32px] rounded-lg transition-all flex items-center justify-center gap-2 text-sm font-bold shadow-md hover:shadow-xl border-2 text-white"
                              style={{
                                backgroundColor: '#10b981',
                                borderColor: '#059669'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#059669'
                                e.currentTarget.style.transform = 'scale(1.05)'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = '#10b981'
                                e.currentTarget.style.transform = 'scale(1)'
                              }}
                            >
                              <Plus size={16} weight="bold" />
                              <span className="text-xs">Opgave</span>
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-64 p-2" align="center">
                            <div className="space-y-1">
                              <p className="text-sm font-semibold mb-2 px-2">Vælg Opgave</p>
                              {(roles || []).map(r => (
                                <button
                                  key={r.id}
                                  onClick={() => handleAddTaskToCell(employee.id, dateString, r.id)}
                                  className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-muted transition-all flex items-center gap-3"
                                >
                                  <div
                                    className="w-5 h-5 rounded-full shadow-md"
                                    style={{ 
                                      backgroundColor: r.color || '#8b5cf6',
                                      border: `2px solid ${r.color || '#8b5cf6'}`,
                                      boxShadow: `0 2px 6px ${r.color || '#8b5cf6'}50`
                                    }}
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
                          <button 
                            className="w-full h-full min-h-[36px] rounded-lg transition-all flex items-center justify-center gap-2 text-sm font-bold shadow-md hover:shadow-xl border-2 text-white"
                            style={{
                              backgroundColor: '#10b981',
                              borderColor: '#059669'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#059669'
                              e.currentTarget.style.transform = 'scale(1.05)'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#10b981'
                              e.currentTarget.style.transform = 'scale(1)'
                            }}
                          >
                            <Plus size={18} weight="bold" />
                            <span className="text-xs">Tilføj Opgave</span>
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-2" align="center">
                          <div className="space-y-1">
                            <p className="text-sm font-semibold mb-2 px-2">Vælg Opgave</p>
                            {(roles || []).map(r => (
                              <button
                                key={r.id}
                                onClick={() => handleAddTaskToCell(employee.id, dateString, r.id)}
                                className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-muted transition-all flex items-center gap-3"
                              >
                                <div
                                  className="w-5 h-5 rounded-full shadow-md"
                                  style={{ 
                                    backgroundColor: r.color || '#8b5cf6',
                                    border: `2px solid ${r.color || '#8b5cf6'}`,
                                    boxShadow: `0 2px 6px ${r.color || '#8b5cf6'}50`
                                  }}
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
                      className="w-full h-full min-h-[32px] rounded-lg transition-all flex items-center justify-center gap-2 text-sm font-bold shadow-md hover:shadow-xl border-2 text-white"
                      style={cellComment ? {
                        backgroundColor: '#f59e0b',
                        borderColor: '#d97706'
                      } : {
                        backgroundColor: '#06b6d4',
                        borderColor: '#0891b2'
                      }}
                      onMouseEnter={(e) => {
                        if (cellComment) {
                          e.currentTarget.style.backgroundColor = '#d97706'
                          e.currentTarget.style.transform = 'scale(1.05)'
                        } else {
                          e.currentTarget.style.backgroundColor = '#0891b2'
                          e.currentTarget.style.transform = 'scale(1.05)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (cellComment) {
                          e.currentTarget.style.backgroundColor = '#f59e0b'
                          e.currentTarget.style.transform = 'scale(1)'
                        } else {
                          e.currentTarget.style.backgroundColor = '#06b6d4'
                          e.currentTarget.style.transform = 'scale(1)'
                        }
                      }}
                      title={cellComment ? "Rediger kommentar" : "Tilføj kommentar"}
                    >
                      <ChatText size={16} weight={cellComment ? "fill" : "bold"} />
                      {!cellComment && <span className="text-xs">Kommentar</span>}
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
                <ArrowLeft size={20} />
                Tilbage
              </Button>
            </motion.div>
          </div>
        </div>
      </div>
      <div className="w-full px-4 sm:px-6 pt-40 pb-12 sm:pb-20 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 text-center"
        >
          <div className="flex flex-col items-center gap-6">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-br from-primary to-accent bg-clip-text text-transparent">Vagtplan</h1>
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
                    <SelectTrigger className="w-[160px] font-semibold shadow-sm border-2 hover:border-primary/50 transition-all">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {months.map((month, index) => (
                        <SelectItem 
                          key={index} 
                          value={index.toString()}
                          className="font-medium"
                        >
                          {month}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    value={selectedYear.toString()}
                    onValueChange={(value) => setSelectedYear(parseInt(value))}
                  >
                    <SelectTrigger className="w-[130px] font-semibold shadow-sm border-2 hover:border-primary/50 transition-all">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2024" className="font-medium">2024</SelectItem>
                      <SelectItem value="2025" className="font-medium">2025</SelectItem>
                      <SelectItem value="2026" className="font-medium">2026</SelectItem>
                      <SelectItem value="2027" className="font-medium">2027</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex items-center gap-3">
                  <Button
                    onClick={() => setShowWeekAssignmentDialog(true)}
                    variant="default"
                    className="gap-2 shadow-md hover:shadow-lg transition-all bg-gradient-to-r from-primary to-primary/90"
                  >
                    <Plus size={18} weight="bold" />
                    Tilføj Opgaver til Hel Uge
                  </Button>
                  <Button
                    onClick={() => setShowWeekClearDialog(true)}
                    variant="destructive"
                    className="gap-2 shadow-md hover:shadow-lg transition-all"
                  >
                    <Trash size={18} weight="bold" />
                    Ryd Hel Uge
                  </Button>
                  <Button
                    onClick={() => {
                      const today = new Date()
                      setSelectedMonth(today.getMonth())
                      setSelectedYear(today.getFullYear())
                      hasScrolledToToday.current = false
                      setScrollToToday(true)
                    }}
                    variant="outline"
                    className="gap-2 shadow-md hover:shadow-lg transition-all border-2 hover:border-accent hover:bg-accent/10"
                  >
                    <CalendarIcon size={18} weight="bold" />
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
                                      "border-x border-border p-2 text-center transition-all bg-card",
                                      isLocked && "bg-muted/10",
                                      sickLeave && "bg-card",
                                      vacation && "bg-card",
                                      currentWeek && !sickLeave && !vacation && "ring-1 ring-inset ring-border",
                                      todayDate && !sickLeave && !vacation && "ring-2 ring-inset ring-primary/30",
                                      todayDate && sickLeave && "bg-card ring-1 ring-border",
                                      todayDate && vacation && "bg-card ring-1 ring-border"
                                    )}
                                    style={{
                                      width: '120px',
                                      minWidth: '120px',
                                      maxWidth: '120px'
                                    }}
                                  >
                                    <div className="space-y-1.5 min-h-[60px]">
                                      {vacation && (
                                        <div className="relative group">
                                          <div
                                            className="px-1.5 py-1 rounded text-[10px] font-semibold bg-card text-foreground border border-border flex items-center gap-1 cursor-pointer justify-center"
                                            title={vacation.notes || 'På ferie'}
                                          >
                                            <Airplane size={12} weight="duotone" className="text-muted-foreground" />
                                            <span className="truncate">Ferie</span>
                                          </div>
                                        </div>
                                      )}
                                      {sickLeave && (
                                        <div className="relative group">
                                          <div
                                            className="px-1.5 py-1 rounded text-[10px] font-semibold bg-card text-foreground border border-border flex items-center gap-1 cursor-pointer justify-center"
                                            title={sickLeave.reason || 'Sygemeldt'}
                                          >
                                            <FirstAidKit size={12} weight="duotone" className="text-muted-foreground" />
                                            <span className="truncate">Syg</span>
                                          </div>
                                        </div>
                                      )}
                                      {cellComment && (
                                        <div className="relative group">
                                          <div
                                            className="px-1.5 py-1 rounded text-[10px] font-medium bg-muted/50 text-foreground border border-border flex items-center gap-1 cursor-pointer hover:bg-muted transition-all justify-center"
                                            onClick={() => openCommentDialog(employee.id, dateString)}
                                            title={cellComment}
                                          >
                                            <ChatText size={11} weight="duotone" className="text-muted-foreground" />
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
                                                  className="px-1.5 py-1.5 rounded text-[11px] font-medium truncate bg-muted/70 text-foreground border border-border hover:bg-muted transition-colors"
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
                                                <button className="w-full h-full min-h-[24px] text-muted-foreground/60 hover:text-foreground hover:bg-muted/40 rounded text-[10px] transition-colors flex items-center justify-center gap-1 border border-border/50 hover:border-border font-medium">
                                                  <Plus size={12} weight="regular" />
                                                  <span>Tilføj</span>
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
                                              <button className="w-full h-full min-h-[28px] text-muted-foreground/60 hover:text-foreground hover:bg-muted/40 rounded text-[11px] transition-colors flex items-center justify-center gap-1.5 border border-border/50 hover:border-border font-medium">
                                                <Plus size={13} weight="regular" />
                                                <span>Tilføj opgave</span>
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
                                            "w-full h-full min-h-[24px] rounded text-[10px] font-medium border transition-colors flex items-center justify-center gap-1",
                                            cellComment 
                                              ? "text-foreground/80 hover:text-foreground bg-muted/50 hover:bg-muted border-border" 
                                              : "text-muted-foreground/70 hover:text-foreground bg-card hover:bg-muted/30 border-border/50 hover:border-border"
                                          )}
                                          title={cellComment ? "Rediger kommentar" : "Tilføj kommentar"}
                                        >
                                          <ChatText size={11} weight={cellComment ? "duotone" : "regular"} />
                                          <span>Note</span>
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
                  <Tag size={28} className="text-accent" weight="duotone" />
                  <h2 className="text-2xl font-bold">Opgaver / Roller</h2>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-sm">
                    {(roles || []).length} {(roles || []).length === 1 ? 'Opgave' : 'Opgaver'}
                  </Badge>
                  <Button
                    onClick={openAddRoleDialog}
                    size="sm"
                    className="gap-2 bg-gradient-to-r from-primary to-accent"
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
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full gap-2" disabled={clearWeekNumber === null}>
                  <Trash size={18} />
                  Ryd Hele Ugen
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-destructive">⚠️ Bekræft Sletning</AlertDialogTitle>
                  <AlertDialogDescription>
                    Er du helt sikker på at du vil rydde alle opgaver for uge {clearWeekNumber}?
                    <br /><br />
                    <strong>Dette vil fjerne alle opgaver for alle medarbejdere i denne uge.</strong>
                    <br /><br />
                    Denne handling kan <strong>IKKE</strong> fortrydes!
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuller</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleClearWeek}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Ja, Ryd Hele Ugen
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
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
      <AlertDialog open={showDuplicateTaskDialog} onOpenChange={setShowDuplicateTaskDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Tag size={24} weight="duotone" className="text-amber-600" />
              Opgave Findes Allerede
            </AlertDialogTitle>
            <AlertDialogDescription className="pt-4">
              {duplicateTaskInfo && (
                <div className="space-y-2">
                  <p className="text-base">
                    <strong>{duplicateTaskInfo.employeeName}</strong> har allerede opgaven <strong>{duplicateTaskInfo.roleName}</strong> tildelt på denne dato.
                  </p>
                  <p className="text-sm text-muted-foreground pt-2">
                    En bruger kan ikke have den samme opgave tildelt flere gange på samme dag.
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowDuplicateTaskDialog(false)}>
              Forstået
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
