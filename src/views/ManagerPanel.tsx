import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, ShieldCheck, Check, Crown, User as UserIcon, Trash, FirstAidKit, X, Umbrella, ClockCounterClockwise, PencilSimple, Plus, Phone, CalendarBlank, Eye } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { format } from 'date-fns'
import { da } from 'date-fns/locale'
import { UserRole, ADMIN_EMAIL, hasManagerAccess, getRoleDisplayName, getRoleDescription } from '@/lib/userRoles'
import { cn } from '@/lib/utils'
import { getEmployeeColorByEmail } from '@/lib/employeeColors'
import React from 'react'

interface User {
  email: string
  fullName: string
  role: UserRole
  phone?: string
}

interface SickLeaveEntry {
  id: string
  userEmail: string
  userName: string
  startDate: string
  endDate: string
  reason?: string
  status: 'pending' | 'approved' | 'rejected'
  submittedAt: string
}

type VacationStatus = 'pending' | 'approved' | 'rejected'

interface VacationEntry {
  id: string
  userId: string
  userEmail: string
  startDate: string
  endDate: string
  notes?: string
  status: VacationStatus
  reviewedBy?: string
  reviewedAt?: string
}

interface ManagerPanelProps {
  onNavigateBack: () => void
  onLogout: () => void
}

export function ManagerPanel({ onNavigateBack, onLogout }: ManagerPanelProps) {
  const [users, setUsers] = useState<User[]>([])
  const [sickLeaveEntries, setSickLeaveEntries] = useState<SickLeaveEntry[]>([])
  const [vacationEntries, setVacationEntries] = useState<VacationEntry[]>([])
  const [allVacations, setAllVacations] = useState<VacationEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasAccess, setHasAccess] = useState(false)
  const [userEmail, setUserEmail] = useState<string>('')
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [newName, setNewName] = useState('')
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [newUserName, setNewUserName] = useState('')
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserPassword, setNewUserPassword] = useState('')
  const [newUserPhone, setNewUserPhone] = useState('')
  const [isEditVacationDialogOpen, setIsEditVacationDialogOpen] = useState(false)
  const [editingVacation, setEditingVacation] = useState<VacationEntry | null>(null)
  const [editVacationStartDate, setEditVacationStartDate] = useState<Date | undefined>()
  const [editVacationEndDate, setEditVacationEndDate] = useState<Date | undefined>()
  const [editVacationNotes, setEditVacationNotes] = useState('')
  const [vacationFilter, setVacationFilter] = useState<'all' | 'pending' | 'approved'>('all')
  const [previewVacation, setPreviewVacation] = useState<VacationEntry | null>(null)
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false)
  const [previewMonth, setPreviewMonth] = useState(new Date().getMonth())
  const [previewYear, setPreviewYear] = useState(new Date().getFullYear())

  useEffect(() => {
    const loadUserAndCheckAccess = async () => {
      const session = await window.spark.kv.get<{ userId: string; email: string }>('user-session')
      if (session) {
        setUserEmail(session.email)
        
        const access = await hasManagerAccess(session.email)
        setHasAccess(access)
        if (access) {
          loadUsers()
          loadSickLeaveEntries()
          loadVacationEntries()
        }
      }
    }
    loadUserAndCheckAccess()
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onNavigateBack()
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onNavigateBack])

  const loadUsers = async () => {
    setIsLoading(true)
    const usersData = await window.spark.kv.get<Record<string, { email: string; password: string; fullName: string; role?: UserRole; isManager?: boolean }>>('users')
    if (usersData) {
      const userList = Object.values(usersData).map(u => {
        let role: UserRole = 'user'
        if (u.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
          role = 'admin'
        } else if (u.role) {
          role = u.role
        } else if (u.isManager) {
          role = 'manager'
        }
        
        return {
          email: u.email,
          fullName: u.fullName,
          role
        }
      }).sort((a, b) => {
        const roleOrder = { admin: 0, manager: 1, user: 2 }
        return roleOrder[a.role] - roleOrder[b.role]
      })
      setUsers(userList)
    }
    setIsLoading(false)
  }

  const loadSickLeaveEntries = async () => {
    const entries = await window.spark.kv.get<SickLeaveEntry[]>('sick-leave-entries') || []
    setSickLeaveEntries(entries.sort((a, b) => {
      const dateA = new Date(b.submittedAt)
      const dateB = new Date(a.submittedAt)
      if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) return 0
      return dateA.getTime() - dateB.getTime()
    }))
  }

  const loadVacationEntries = async () => {
    const entries = await window.spark.kv.get<VacationEntry[]>('vacation-entries') || []
    setVacationEntries(entries.filter(e => e.status === 'pending').sort((a, b) => {
      const dateA = new Date(a.startDate)
      const dateB = new Date(b.startDate)
      if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) return 0
      return dateA.getTime() - dateB.getTime()
    }))
    setAllVacations(entries.filter(e => e.status !== 'rejected').sort((a, b) => {
      const dateA = new Date(a.startDate)
      const dateB = new Date(b.startDate)
      if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) return 0
      return dateA.getTime() - dateB.getTime()
    }))
  }

  const changeUserRole = async (email: string, newRole: UserRole) => {
    if (email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      toast.error('Kan ikke ændre admin brugerens rettigheder')
      return
    }

    const usersData = await window.spark.kv.get<Record<string, { email: string; password: string; fullName: string; role: UserRole; isManager: boolean }>>('users')
    if (usersData && usersData[email]) {
      usersData[email].role = newRole
      usersData[email].isManager = newRole === 'manager' || newRole === 'admin'
      await window.spark.kv.set('users', usersData)
      await loadUsers()
      
      toast.success(`Bruger ændret til ${getRoleDisplayName(newRole)}`)
    }
  }

  const deleteUser = async (email: string) => {
    if (email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      toast.error('Kan ikke slette admin brugeren')
      return
    }

    const usersData = await window.spark.kv.get<Record<string, { email: string; password: string; fullName: string; role: UserRole; isManager: boolean }>>('users')
    if (usersData && usersData[email]) {
      delete usersData[email]
      await window.spark.kv.set('users', usersData)
      await loadUsers()
      toast.success('Bruger slettet')
    }
  }

  const openEditNameDialog = (user: User) => {
    setEditingUser(user)
    setNewName(user.fullName)
    setIsEditDialogOpen(true)
  }

  const handleSaveUserName = async () => {
    if (!editingUser || !newName.trim()) {
      toast.error('Navn kan ikke være tomt')
      return
    }

    const usersData = await window.spark.kv.get<Record<string, { email: string; password: string; fullName: string; role: UserRole; isManager: boolean; phone?: string }>>('users')
    if (usersData && usersData[editingUser.email]) {
      usersData[editingUser.email].fullName = newName.trim()
      await window.spark.kv.set('users', usersData)
      await loadUsers()
      setIsEditDialogOpen(false)
      setEditingUser(null)
      setNewName('')
      toast.success('Navn opdateret')
    }
  }

  const handleCreateUser = async () => {
    if (!newUserName.trim()) {
      toast.error('Navn er påkrævet')
      return
    }
    if (!newUserEmail.trim()) {
      toast.error('Email er påkrævet')
      return
    }
    if (!newUserPassword.trim()) {
      toast.error('Kode er påkrævet')
      return
    }
    if (!newUserPhone.trim()) {
      toast.error('Telefon nummer er påkrævet')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(newUserEmail.trim())) {
      toast.error('Ugyldig email adresse')
      return
    }

    const usersData = await window.spark.kv.get<Record<string, { email: string; password: string; fullName: string; role: UserRole; isManager: boolean; phone?: string }>>('users') || {}
    
    if (usersData[newUserEmail.toLowerCase()]) {
      toast.error('En bruger med denne email eksisterer allerede')
      return
    }

    usersData[newUserEmail.toLowerCase()] = {
      email: newUserEmail.toLowerCase(),
      password: newUserPassword.trim(),
      fullName: newUserName.trim(),
      role: 'user',
      isManager: false,
      phone: newUserPhone.trim()
    }

    await window.spark.kv.set('users', usersData)
    await loadUsers()
    
    setIsCreateDialogOpen(false)
    setNewUserName('')
    setNewUserEmail('')
    setNewUserPassword('')
    setNewUserPhone('')
    
    toast.success('Bruger oprettet succesfuldt')
  }

  const deleteSickLeave = async (id: string) => {
    const entries = await window.spark.kv.get<SickLeaveEntry[]>('sick-leave-entries') || []
    const updatedEntries = entries.filter(e => e.id !== id)
    await window.spark.kv.set('sick-leave-entries', updatedEntries)
    await loadSickLeaveEntries()
    toast.success('Sygemelding slettet')
  }

  const handleApproveVacation = async (vacation: VacationEntry) => {
    const allVacations = await window.spark.kv.get<VacationEntry[]>('vacation-entries') || []
    const updatedVacations = allVacations.map((v) =>
      v.id === vacation.id
        ? { ...v, status: 'approved' as VacationStatus, reviewedBy: userEmail, reviewedAt: new Date().toISOString() }
        : v
    )
    await window.spark.kv.set('vacation-entries', updatedVacations)
    await loadVacationEntries()
    toast.success('Ferie godkendt')

    const startDateFormatted = new Date(vacation.startDate).toLocaleDateString('da-DK', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
    const endDateFormatted = new Date(vacation.endDate).toLocaleDateString('da-DK', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })

    try {
      const prompt = window.spark.llmPrompt`Generate a professional email notification to send to ${vacation.userEmail} about their vacation request being APPROVED.

Vacation Request Details:
Start Date: ${startDateFormatted}
End Date: ${endDateFormatted}
${vacation.notes ? `Notes: ${vacation.notes}` : 'No notes'}
Approved by: ${userEmail}

The email should be in Danish, friendly yet professional, and include:
- A clear subject line that indicates approval
- Confirmation that the vacation request has been approved
- The vacation period details
- The name/email of who approved it
- A congratulatory or positive tone
- A brief note that this is an automatic notification

Return ONLY a JSON object with this exact structure:
{
  "subject": "subject line here",
  "body": "email body here with proper line breaks"
}`

      const emailContentJson = await window.spark.llm(prompt, "gpt-4o-mini", true)
      const emailContent = JSON.parse(emailContentJson)

      const emails = await window.spark.kv.get<Array<{
        id: string
        from: string
        to: string
        subject: string
        message: string
        timestamp: number
        read: boolean
      }>>('emails') || []

      const newEmail = {
        id: Date.now().toString() + '-approval',
        from: userEmail,
        to: vacation.userEmail,
        subject: emailContent.subject,
        message: emailContent.body,
        timestamp: Date.now(),
        read: false
      }

      await window.spark.kv.set('emails', [...emails, newEmail])

      const notification = {
        id: Date.now().toString(),
        type: 'email' as const,
        message: `Din ferieansøgning blev godkendt!`,
        timestamp: Date.now(),
        read: false,
        from: userEmail,
        emailId: newEmail.id
      }

      const notifications = await window.spark.kv.get<any[]>('email-notifications') || []
      await window.spark.kv.set('email-notifications', [...notifications, notification])
    } catch (emailError) {
      console.error('Error sending vacation approval email:', emailError)
    }
  }

  const handleRejectVacation = async (vacation: VacationEntry) => {
    const allVacations = await window.spark.kv.get<VacationEntry[]>('vacation-entries') || []
    const updatedVacations = allVacations.map((v) =>
      v.id === vacation.id
        ? { ...v, status: 'rejected' as VacationStatus, reviewedBy: userEmail, reviewedAt: new Date().toISOString() }
        : v
    )
    await window.spark.kv.set('vacation-entries', updatedVacations)
    await loadVacationEntries()
    toast.error('Ferie afvist')

    const startDateFormatted = new Date(vacation.startDate).toLocaleDateString('da-DK', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
    const endDateFormatted = new Date(vacation.endDate).toLocaleDateString('da-DK', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })

    try {
      const prompt = window.spark.llmPrompt`Generate a professional email notification to send to ${vacation.userEmail} about their vacation request being REJECTED.

Vacation Request Details:
Start Date: ${startDateFormatted}
End Date: ${endDateFormatted}
${vacation.notes ? `Notes: ${vacation.notes}` : 'No notes'}
Rejected by: ${userEmail}

The email should be in Danish, professional and respectful, and include:
- A clear subject line that indicates rejection
- Polite notification that the vacation request has been rejected
- The vacation period details
- The name/email of who rejected it
- A professional and understanding tone
- Suggestion that they can contact the manager for more information or to discuss alternative dates
- A brief note that this is an automatic notification

Return ONLY a JSON object with this exact structure:
{
  "subject": "subject line here",
  "body": "email body here with proper line breaks"
}`

      const emailContentJson = await window.spark.llm(prompt, "gpt-4o-mini", true)
      const emailContent = JSON.parse(emailContentJson)

      const emails = await window.spark.kv.get<Array<{
        id: string
        from: string
        to: string
        subject: string
        message: string
        timestamp: number
        read: boolean
      }>>('emails') || []

      const newEmail = {
        id: Date.now().toString() + '-rejection',
        from: userEmail,
        to: vacation.userEmail,
        subject: emailContent.subject,
        message: emailContent.body,
        timestamp: Date.now(),
        read: false
      }

      await window.spark.kv.set('emails', [...emails, newEmail])

      const notification = {
        id: Date.now().toString(),
        type: 'email' as const,
        message: `Din ferieansøgning blev afvist`,
        timestamp: Date.now(),
        read: false,
        from: userEmail,
        emailId: newEmail.id
      }

      const notifications = await window.spark.kv.get<any[]>('email-notifications') || []
      await window.spark.kv.set('email-notifications', [...notifications, notification])
    } catch (emailError) {
      console.error('Error sending vacation rejection email:', emailError)
    }
  }

  const openEditVacationDialog = (vacation: VacationEntry) => {
    setEditingVacation(vacation)
    setEditVacationStartDate(new Date(vacation.startDate))
    setEditVacationEndDate(new Date(vacation.endDate))
    setEditVacationNotes(vacation.notes || '')
    setIsEditVacationDialogOpen(true)
  }

  const handleSaveVacationEdit = async () => {
    if (!editingVacation || !editVacationStartDate || !editVacationEndDate) {
      toast.error('Start- og slutdato skal udfyldes')
      return
    }

    if (editVacationStartDate > editVacationEndDate) {
      toast.error('Startdato skal være før slutdato')
      return
    }

    const allVacationsData = await window.spark.kv.get<VacationEntry[]>('vacation-entries') || []
    const updatedVacations = allVacationsData.map((v) =>
      v.id === editingVacation.id
        ? { 
            ...v, 
            startDate: editVacationStartDate.toISOString(), 
            endDate: editVacationEndDate.toISOString(),
            notes: editVacationNotes.trim() || undefined
          }
        : v
    )
    await window.spark.kv.set('vacation-entries', updatedVacations)
    await loadVacationEntries()
    setIsEditVacationDialogOpen(false)
    
    const originalStartDate = new Date(editingVacation.startDate).toLocaleDateString('da-DK', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
    const originalEndDate = new Date(editingVacation.endDate).toLocaleDateString('da-DK', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
    const newStartDate = editVacationStartDate.toLocaleDateString('da-DK', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
    const newEndDate = editVacationEndDate.toLocaleDateString('da-DK', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })

    try {
      const prompt = window.spark.llmPrompt`Generate a professional email notification to send to ${editingVacation.userEmail} about their vacation being EDITED/MODIFIED by a manager.

Original Vacation Details:
Original Start Date: ${originalStartDate}
Original End Date: ${originalEndDate}
${editingVacation.notes ? `Original Notes: ${editingVacation.notes}` : 'No original notes'}

New Vacation Details:
New Start Date: ${newStartDate}
New End Date: ${newEndDate}
${editVacationNotes.trim() ? `New Notes: ${editVacationNotes.trim()}` : 'No new notes'}
Modified by: ${userEmail}

The email should be in Danish, professional and informative, and include:
- A clear subject line that indicates vacation modification
- Notification that their vacation dates have been changed by a manager
- Clear comparison showing original dates vs new dates
- The name/email of who made the changes
- A professional tone
- Suggestion that they can contact the manager if they have questions
- A brief note that this is an automatic notification

Return ONLY a JSON object with this exact structure:
{
  "subject": "subject line here",
  "body": "email body here with proper line breaks"
}`

      const emailContentJson = await window.spark.llm(prompt, "gpt-4o-mini", true)
      const emailContent = JSON.parse(emailContentJson)

      const emails = await window.spark.kv.get<Array<{
        id: string
        from: string
        to: string
        subject: string
        message: string
        timestamp: number
        read: boolean
      }>>('emails') || []

      const newEmail = {
        id: Date.now().toString() + '-vacation-edit',
        from: userEmail,
        to: editingVacation.userEmail,
        subject: emailContent.subject,
        message: emailContent.body,
        timestamp: Date.now(),
        read: false
      }

      await window.spark.kv.set('emails', [...emails, newEmail])

      const notification = {
        id: Date.now().toString(),
        type: 'email' as const,
        message: `Din ferie er blevet redigeret af en manager`,
        timestamp: Date.now(),
        read: false,
        from: userEmail,
        emailId: newEmail.id
      }

      const notifications = await window.spark.kv.get<any[]>('email-notifications') || []
      await window.spark.kv.set('email-notifications', [...notifications, notification])
    } catch (emailError) {
      console.error('Error sending vacation edit email:', emailError)
    }

    setEditingVacation(null)
    setEditVacationStartDate(undefined)
    setEditVacationEndDate(undefined)
    setEditVacationNotes('')
    toast.success('Ferie opdateret')
  }

  const deleteVacation = async (id: string) => {
    const allVacationsData = await window.spark.kv.get<VacationEntry[]>('vacation-entries') || []
    const vacationToDelete = allVacationsData.find(v => v.id === id)
    
    if (!vacationToDelete) {
      toast.error('Ferie ikke fundet')
      return
    }

    const updatedVacations = allVacationsData.filter(v => v.id !== id)
    await window.spark.kv.set('vacation-entries', updatedVacations)
    await loadVacationEntries()
    toast.success('Ferie slettet')

    const startDateFormatted = new Date(vacationToDelete.startDate).toLocaleDateString('da-DK', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
    const endDateFormatted = new Date(vacationToDelete.endDate).toLocaleDateString('da-DK', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })

    try {
      const prompt = window.spark.llmPrompt`Generate a professional email notification to send to ${vacationToDelete.userEmail} about their vacation being DELETED by a manager.

Deleted Vacation Details:
Start Date: ${startDateFormatted}
End Date: ${endDateFormatted}
${vacationToDelete.notes ? `Notes: ${vacationToDelete.notes}` : 'No notes'}
Status at deletion: ${vacationToDelete.status === 'approved' ? 'Godkendt (Approved)' : vacationToDelete.status === 'pending' ? 'Afventende (Pending)' : 'Status ukendt'}
Deleted by: ${userEmail}

The email should be in Danish, professional and clear, and include:
- A clear subject line that indicates vacation deletion
- Clear notification that their vacation has been removed from the system
- The vacation period that was deleted
- The status it had before deletion (approved/pending)
- The name/email of who deleted it
- A professional and understanding tone
- Suggestion that they can contact the manager if they have questions or if this was done in error
- A brief note that this is an automatic notification

Return ONLY a JSON object with this exact structure:
{
  "subject": "subject line here",
  "body": "email body here with proper line breaks"
}`

      const emailContentJson = await window.spark.llm(prompt, "gpt-4o-mini", true)
      const emailContent = JSON.parse(emailContentJson)

      const emails = await window.spark.kv.get<Array<{
        id: string
        from: string
        to: string
        subject: string
        message: string
        timestamp: number
        read: boolean
      }>>('emails') || []

      const newEmail = {
        id: Date.now().toString() + '-vacation-delete',
        from: userEmail,
        to: vacationToDelete.userEmail,
        subject: emailContent.subject,
        message: emailContent.body,
        timestamp: Date.now(),
        read: false
      }

      await window.spark.kv.set('emails', [...emails, newEmail])

      const notification = {
        id: Date.now().toString(),
        type: 'email' as const,
        message: `Din ferie er blevet slettet af en manager`,
        timestamp: Date.now(),
        read: false,
        from: userEmail,
        emailId: newEmail.id
      }

      const notifications = await window.spark.kv.get<any[]>('email-notifications') || []
      await window.spark.kv.set('email-notifications', [...notifications, notification])
    } catch (emailError) {
      console.error('Error sending vacation deletion email:', emailError)
    }
  }

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return (
          <Badge className="bg-gradient-to-r from-accent via-primary to-secondary text-white">
            <Crown size={14} className="mr-1" weight="fill" />
            Administrator
          </Badge>
        )
      case 'manager':
        return (
          <Badge className="bg-gradient-to-r from-primary to-secondary text-white">
            <ShieldCheck size={14} className="mr-1" weight="fill" />
            Manager
          </Badge>
        )
      default:
        return (
          <Badge variant="secondary">
            <UserIcon size={14} className="mr-1" />
            Bruger
          </Badge>
        )
    }
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(0.55_0.22_265/0.15),transparent_50%),radial-gradient(ellipse_at_bottom_right,oklch(0.65_0.26_340/0.12),transparent_50%),radial-gradient(ellipse_at_bottom_left,oklch(0.55_0.24_192/0.10),transparent_50%)] pointer-events-none" />
        <div className="absolute inset-0" style={{
          backgroundImage: `repeating-linear-gradient(90deg, oklch(0.55 0.22 265 / 0.02) 0px, transparent 1px, transparent 100px, oklch(0.55 0.22 265 / 0.02) 101px),
                           repeating-linear-gradient(0deg, oklch(0.55 0.22 265 / 0.02) 0px, transparent 1px, transparent 100px, oklch(0.55 0.22 265 / 0.02) 101px)`
        }} />
        
        <Card className="p-8 max-w-md relative z-10 border-2">
          <div className="text-center space-y-4">
            <ShieldCheck size={64} className="text-destructive mx-auto" weight="duotone" />
            <h2 className="text-2xl font-bold">Ingen Adgang</h2>
            <p className="text-muted-foreground">Du skal have manager eller administrator rettigheder for at tilgå denne side.</p>
            <Button onClick={onNavigateBack} className="w-full">
              <ArrowLeft size={20} className="mr-2" />
              Tilbage til Hub
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden">

      <div className="absolute top-6 right-6 left-6 z-20">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-12">
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

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-56 sm:pt-60 pb-12 sm:pb-20 max-w-5xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-10"
        >
          <div className="flex items-center gap-6 mb-8">
            <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-br from-primary via-secondary to-accent bg-clip-text text-transparent">
              Manager Panel
            </h1>
          </div>
        </motion.div>

        <Tabs defaultValue="permissions" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 max-w-5xl">
            <TabsTrigger value="permissions" className="gap-2">
              <ShieldCheck size={18} />
              Rettigheder
            </TabsTrigger>
            <TabsTrigger value="sick-leave" className="gap-2">
              <FirstAidKit size={18} />
              Sygemeldinger
            </TabsTrigger>
            <TabsTrigger value="vacation-requests" className="gap-2">
              <Umbrella size={18} />
              Anmodninger
              {vacationEntries.length > 0 && (
                <Badge className="ml-1 h-5 px-1.5 bg-accent text-accent-foreground">
                  {vacationEntries.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="vacation-overview" className="gap-2">
              <CalendarBlank size={18} />
              Ferie Oversigt
            </TabsTrigger>
          </TabsList>

          <TabsContent value="permissions" className="space-y-6">
            <Card className="p-6 border-2">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={28} className="text-primary" weight="duotone" />
                  <h2 className="text-2xl font-bold">Brugeroversigt & Rettigheder</h2>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-sm">
                    {users.length} {users.length === 1 ? 'Bruger' : 'Brugere'}
                  </Badge>
                  <Button 
                    onClick={() => setIsCreateDialogOpen(true)}
                    className="gap-2"
                  >
                    <Plus size={18} weight="bold" />
                    Opret Bruger
                  </Button>
                </div>
              </div>

              {isLoading ? (
                <p className="text-muted-foreground text-center py-12">Indlæser brugere...</p>
              ) : users.length === 0 ? (
                <p className="text-muted-foreground text-center py-12">Ingen brugere fundet</p>
              ) : (
                <div className="space-y-3">
                  {users.map((user) => (
                    <motion.div
                      key={user.email}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-between p-5 rounded-xl border-2 bg-card hover:shadow-md transition-all"
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg ${
                          user.role === 'admin' 
                            ? 'bg-gradient-to-br from-accent via-primary to-secondary' 
                            : user.role === 'manager'
                            ? 'bg-gradient-to-br from-primary to-secondary'
                            : 'bg-gradient-to-br from-secondary to-accent'
                        }`}>
                          {user.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="font-bold text-lg">{user.fullName}</div>
                            {user.role === 'admin' && (
                              <Crown size={18} className="text-accent" weight="fill" />
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground truncate">{user.email}</div>
                          <div className="text-xs text-muted-foreground mt-1">{getRoleDescription(user.role)}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          {getRoleBadge(user.role)}
                        </div>
                      </div>
                      <div className="ml-4 flex items-center gap-2">
                        {user.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase() ? (
                          <>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => openEditNameDialog(user)}
                              className="hover:bg-primary/10"
                            >
                              <PencilSimple size={20} />
                            </Button>
                            <Select
                              value={user.role}
                              onValueChange={(value) => changeUserRole(user.email, value as UserRole)}
                            >
                              <SelectTrigger className="w-40 h-10">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="user">
                                  <div className="flex items-center gap-2">
                                    <UserIcon size={16} />
                                    Bruger
                                  </div>
                                </SelectItem>
                                <SelectItem value="manager">
                                  <div className="flex items-center gap-2">
                                    <ShieldCheck size={16} />
                                    Manager
                                  </div>
                                </SelectItem>
                                <SelectItem value="admin">
                                  <div className="flex items-center gap-2">
                                    <Crown size={16} />
                                    Administrator
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                                  <Trash size={20} />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Slet bruger?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Er du sikker på at du vil slette <strong>{user.fullName}</strong>? Denne handling kan ikke fortrydes.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annuller</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => deleteUser(user.email)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Slet bruger
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        ) : (
                          <Badge variant="outline" className="ml-2">
                            Permanent Admin
                          </Badge>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-6 border-2 bg-muted/30">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Crown size={24} className="text-accent mt-0.5" weight="fill" />
                  <div>
                    <h3 className="font-bold text-lg mb-1">Administrator</h3>
                    <p className="text-sm text-muted-foreground">{getRoleDescription('admin')}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <ShieldCheck size={24} className="text-primary mt-0.5" weight="fill" />
                  <div>
                    <h3 className="font-bold text-lg mb-1">Manager</h3>
                    <p className="text-sm text-muted-foreground">{getRoleDescription('manager')}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <UserIcon size={24} className="text-secondary mt-0.5" />
                  <div>
                    <h3 className="font-bold text-lg mb-1">Bruger</h3>
                    <p className="text-sm text-muted-foreground">{getRoleDescription('user')}</p>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="sick-leave" className="space-y-6">
            <Card className="p-6 border-2">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <FirstAidKit size={28} className="text-destructive" weight="duotone" />
                  <h2 className="text-2xl font-bold">Sygemeldinger</h2>
                </div>
                <Badge variant="outline" className="text-sm">
                  {sickLeaveEntries.length} {sickLeaveEntries.length === 1 ? 'sygemelding' : 'sygemeldinger'}
                </Badge>
              </div>

              <div className="mb-4 p-4 bg-muted/50 rounded-lg border">
                <p className="text-sm text-muted-foreground">
                  Her kan du se og håndtere alle sygemeldinger. Du kan slette sygemeldinger hvis der er fejl eller dobbeltindberetninger.
                </p>
              </div>

              {sickLeaveEntries.length === 0 ? (
                <div className="text-center py-12">
                  <FirstAidKit size={64} className="text-muted-foreground mx-auto mb-4" weight="duotone" />
                  <p className="text-muted-foreground">Ingen sygemeldinger endnu</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sickLeaveEntries.map((entry) => (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-between p-5 rounded-xl border-2 bg-card hover:shadow-md transition-all group"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[oklch(0.58_0.25_25)] to-[oklch(0.65_0.26_340)] flex items-center justify-center text-white font-bold text-lg shadow-lg">
                          {entry.userName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-lg mb-1">{entry.userName}</div>
                          <div className="text-sm text-muted-foreground">{entry.userEmail}</div>
                          <div className="flex flex-col gap-1 mt-2 text-sm">
                            <span className="font-medium">
                              {(() => {
                                try {
                                  const startDate = new Date(entry.startDate)
                                  if (isNaN(startDate.getTime())) return 'Ugyldig dato'
                                  return format(startDate, 'd. MMM yyyy', { locale: da })
                                } catch {
                                  return 'Ugyldig dato'
                                }
                              })()}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Indsendt: {(() => {
                                try {
                                  const date = new Date(entry.submittedAt)
                                  if (isNaN(date.getTime())) return 'Ugyldig dato'
                                  return format(date, 'd. MMM yyyy HH:mm', { locale: da })
                                } catch {
                                  return 'Ugyldig dato'
                                }
                              })()}
                            </span>
                            {entry.reason && (
                              <span className="text-muted-foreground mt-1">Bemærkninger: {entry.reason}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className="bg-green-500 text-white">
                            <Check size={14} className="mr-1" />
                            Registreret
                          </Badge>
                        </div>
                      </div>
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
                            <AlertDialogTitle>Slet sygemelding?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Er du sikker på at du vil slette denne sygemelding for <strong>{entry.userName}</strong>? Denne handling kan ikke fortrydes.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuller</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteSickLeave(entry.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Slet sygemelding
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </motion.div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="vacation-requests" className="space-y-6">
            <Card className="p-6 border-2">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Umbrella size={28} className="text-accent" weight="duotone" />
                  <h2 className="text-2xl font-bold">Ferie Anmodninger</h2>
                </div>
                <Badge variant="outline" className="text-sm">
                  {vacationEntries.length} {vacationEntries.length === 1 ? 'anmodning' : 'anmodninger'}
                </Badge>
              </div>

              <div className="mb-4 p-4 bg-muted/50 rounded-lg border">
                <p className="text-sm text-muted-foreground">
                  Her kan du se og håndtere alle afventende ferie anmodninger. Du kan godkende eller afvise hver anmodning, og medarbejderne vil automatisk få besked via email.
                </p>
              </div>

              {vacationEntries.length === 0 ? (
                <div className="text-center py-12">
                  <Umbrella size={64} className="text-muted-foreground mx-auto mb-4" weight="duotone" />
                  <p className="text-muted-foreground">Ingen afventende ferie anmodninger</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {vacationEntries.map((vacation) => (
                    <motion.div
                      key={vacation.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex flex-col gap-4 p-5 rounded-xl border-2 bg-card hover:shadow-md transition-all"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-secondary flex items-center justify-center text-white font-bold text-lg shadow-lg">
                            {vacation.userEmail.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <div className="font-bold text-lg mb-1">{vacation.userEmail}</div>
                            <div className="flex flex-col gap-1 text-sm">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-muted-foreground">Fra:</span>
                                <span className="font-semibold">
                                  {(() => {
                                    try {
                                      const date = new Date(vacation.startDate)
                                      if (isNaN(date.getTime())) return 'Ugyldig dato'
                                      return format(date, 'd. MMM yyyy', { locale: da })
                                    } catch {
                                      return 'Ugyldig dato'
                                    }
                                  })()}
                                </span>
                                <span className="text-muted-foreground">→</span>
                                <span className="font-medium text-muted-foreground">Til:</span>
                                <span className="font-semibold">
                                  {(() => {
                                    try {
                                      const date = new Date(vacation.endDate)
                                      if (isNaN(date.getTime())) return 'Ugyldig dato'
                                      return format(date, 'd. MMM yyyy', { locale: da })
                                    } catch {
                                      return 'Ugyldig dato'
                                    }
                                  })()}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <Badge className="bg-amber-500/20 text-amber-700 border-amber-500/30">
                          <ClockCounterClockwise size={14} className="mr-1" />
                          Afventer
                        </Badge>
                      </div>

                      {vacation.notes && (
                        <div className="pl-16">
                          <div className="text-sm bg-muted p-3 rounded-lg">
                            <span className="font-semibold text-muted-foreground">Bemærkninger: </span>
                            {vacation.notes}
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2 pl-16">
                        <Button
                          onClick={() => {
                            const startDate = new Date(vacation.startDate)
                            setPreviewMonth(startDate.getMonth())
                            setPreviewYear(startDate.getFullYear())
                            setPreviewVacation(vacation)
                            setIsPreviewDialogOpen(true)
                          }}
                          variant="outline"
                          className="gap-2"
                        >
                          <Eye size={18} weight="bold" />
                          Preview
                        </Button>
                        <Button
                          onClick={() => handleApproveVacation(vacation)}
                          className="flex-1 gap-2 bg-gradient-to-r from-accent to-secondary hover:from-accent/90 hover:to-secondary/90"
                        >
                          <Check size={18} weight="bold" />
                          Godkend
                        </Button>
                        <Button
                          onClick={() => handleRejectVacation(vacation)}
                          variant="destructive"
                          className="flex-1 gap-2"
                        >
                          <X size={18} weight="bold" />
                          Afvis
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="vacation-overview" className="space-y-6">
            <Card className="p-6 border-2">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <CalendarBlank size={28} className="text-primary" weight="duotone" />
                  <h2 className="text-2xl font-bold">Ferie Oversigt</h2>
                </div>
                <div className="flex items-center gap-3">
                  <Select value={vacationFilter} onValueChange={(value: 'all' | 'pending' | 'approved') => setVacationFilter(value)}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle</SelectItem>
                      <SelectItem value="pending">Afventer</SelectItem>
                      <SelectItem value="approved">Godkendte</SelectItem>
                    </SelectContent>
                  </Select>
                  <Badge variant="outline" className="text-sm">
                    {allVacations.filter(v => vacationFilter === 'all' || v.status === vacationFilter).length} {allVacations.filter(v => vacationFilter === 'all' || v.status === vacationFilter).length === 1 ? 'ferie' : 'ferier'}
                  </Badge>
                </div>
              </div>

              <div className="mb-4 p-4 bg-muted/50 rounded-lg border">
                <p className="text-sm text-muted-foreground">
                  Her kan du se, redigere og slette alle ferier i systemet. Du kan filtrere efter status og redigere datoer og bemærkninger.
                </p>
              </div>

              {allVacations.filter(v => vacationFilter === 'all' || v.status === vacationFilter).length === 0 ? (
                <div className="text-center py-12">
                  <CalendarBlank size={64} className="text-muted-foreground mx-auto mb-4" weight="duotone" />
                  <p className="text-muted-foreground">Ingen ferier at vise</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {allVacations.filter(v => vacationFilter === 'all' || v.status === vacationFilter).map((vacation) => {
                    const getUserName = () => {
                      const user = users.find(u => u.email === vacation.userEmail)
                      return user ? user.fullName : vacation.userEmail
                    }

                    return (
                      <motion.div
                        key={vacation.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-between p-5 rounded-xl border-2 bg-card hover:shadow-md transition-all group"
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-secondary flex items-center justify-center text-white font-bold text-lg shadow-lg">
                            {getUserName().charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <div className="font-bold text-lg mb-1">{getUserName()}</div>
                            <div className="text-sm text-muted-foreground mb-2">{vacation.userEmail}</div>
                            <div className="flex items-center gap-3 text-sm">
                              <span className="font-medium">
                                {(() => {
                                  try {
                                    const date = new Date(vacation.startDate)
                                    if (isNaN(date.getTime())) return 'Ugyldig dato'
                                    return format(date, 'd. MMM yyyy', { locale: da })
                                  } catch {
                                    return 'Ugyldig dato'
                                  }
                                })()}
                              </span>
                              <span className="text-muted-foreground">→</span>
                              <span className="font-medium">
                                {(() => {
                                  try {
                                    const date = new Date(vacation.endDate)
                                    if (isNaN(date.getTime())) return 'Ugyldig dato'
                                    return format(date, 'd. MMM yyyy', { locale: da })
                                  } catch {
                                    return 'Ugyldig dato'
                                  }
                                })()}
                              </span>
                            </div>
                            {vacation.notes && (
                              <div className="text-xs text-muted-foreground mt-2">
                                {vacation.notes}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            {vacation.status === 'pending' && (
                              <Badge className="bg-amber-500/20 text-amber-700 border-amber-500/30">
                                <ClockCounterClockwise size={14} className="mr-1" />
                                Afventer
                              </Badge>
                            )}
                            {vacation.status === 'approved' && (
                              <Badge className="bg-green-500/20 text-green-700 border-green-500/30">
                                <Check size={14} className="mr-1" />
                                Godkendt
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="ml-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => openEditVacationDialog(vacation)}
                            className="hover:bg-primary/10"
                          >
                            <PencilSimple size={20} />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              >
                                <Trash size={20} />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Slet ferie?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Er du sikker på at du vil slette denne ferie for <strong>{getUserName()}</strong>? Denne handling kan ikke fortrydes.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuller</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteVacation(vacation.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Slet ferie
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={isEditVacationDialogOpen} onOpenChange={setIsEditVacationDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rediger ferie</DialogTitle>
            <DialogDescription>
              Ændre datoer og bemærkninger for ferien
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Startdato *</Label>
              <Input
                type="date"
                value={editVacationStartDate ? format(editVacationStartDate, 'yyyy-MM-dd') : ''}
                onChange={(e) => setEditVacationStartDate(e.target.value ? new Date(e.target.value) : undefined)}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label>Slutdato *</Label>
              <Input
                type="date"
                value={editVacationEndDate ? format(editVacationEndDate, 'yyyy-MM-dd') : ''}
                onChange={(e) => setEditVacationEndDate(e.target.value ? new Date(e.target.value) : undefined)}
                min={editVacationStartDate ? format(editVacationStartDate, 'yyyy-MM-dd') : undefined}
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-vacation-notes">Bemærkninger</Label>
              <Textarea
                id="edit-vacation-notes"
                value={editVacationNotes}
                onChange={(e) => setEditVacationNotes(e.target.value)}
                placeholder="Tilføj evt. bemærkninger..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsEditVacationDialogOpen(false)
              setEditingVacation(null)
              setEditVacationStartDate(undefined)
              setEditVacationEndDate(undefined)
              setEditVacationNotes('')
            }}>
              Annuller
            </Button>
            <Button onClick={handleSaveVacationEdit} className="gap-2">
              <Check size={18} weight="bold" />
              Gem ændringer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rediger brugernavn</DialogTitle>
            <DialogDescription>
              Ændre navnet på brugeren {editingUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="user-name">Fulde navn</Label>
              <Input
                id="user-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Indtast fuldt navn"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Annuller
            </Button>
            <Button onClick={handleSaveUserName}>
              Gem ændringer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Opret ny bruger</DialogTitle>
            <DialogDescription>
              Udfyld alle felter for at oprette en ny bruger i systemet
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-user-name">Fulde navn *</Label>
              <Input
                id="new-user-name"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                placeholder="f.eks. Jacob Remmer"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-user-email">Email *</Label>
              <Input
                id="new-user-email"
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                placeholder="f.eks. jacob@nexigroup.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-user-password">Kode *</Label>
              <Input
                id="new-user-password"
                type="password"
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                placeholder="Indtast adgangskode"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-user-phone">Telefon nummer *</Label>
              <div className="flex gap-2">
                <Phone size={20} className="text-muted-foreground mt-2.5" />
                <Input
                  id="new-user-phone"
                  type="tel"
                  value={newUserPhone}
                  onChange={(e) => setNewUserPhone(e.target.value)}
                  placeholder="f.eks. +45 12 34 56 78"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsCreateDialogOpen(false)
              setNewUserName('')
              setNewUserEmail('')
              setNewUserPassword('')
              setNewUserPhone('')
            }}>
              Annuller
            </Button>
            <Button onClick={handleCreateUser} className="gap-2">
              <Plus size={18} weight="bold" />
              Opret bruger
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Eye size={24} weight="duotone" className="text-accent" />
              Feriekalender Preview
            </DialogTitle>
            <DialogDescription>
              Sådan vil feriekalenderen se ud hvis du godkender denne anmodning
            </DialogDescription>
          </DialogHeader>
          
          {previewVacation && (() => {
            const months = [
              'Januar', 'Februar', 'Marts', 'April', 'Maj', 'Juni',
              'Juli', 'August', 'September', 'Oktober', 'November', 'December'
            ]
            
            const getDaysInMonth = (month: number, year: number) => {
              return new Date(year, month + 1, 0).getDate()
            }

            const getFirstDayOfMonth = (month: number, year: number) => {
              const day = new Date(year, month, 1).getDay()
              return day === 0 ? 6 : day - 1
            }

            const getWeekNumber = (date: Date) => {
              const firstDayOfYear = new Date(date.getFullYear(), 0, 1)
              const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000
              return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7)
            }

            const isDateInVacation = (day: number, vacation: VacationEntry, month: number, year: number) => {
              const checkDate = new Date(year, month, day)
              const start = new Date(vacation.startDate)
              const end = new Date(vacation.endDate)
              
              start.setHours(0, 0, 0, 0)
              end.setHours(23, 59, 59, 999)
              checkDate.setHours(12, 0, 0, 0)

              return checkDate >= start && checkDate <= end
            }

            const getFirstName = (email: string) => {
              const user = users.find(u => u.email === email)
              if (user?.fullName) {
                return user.fullName.split(' ')[0]
              }
              return email.split('@')[0].split('.')[0]
            }

            const daysInMonth = getDaysInMonth(previewMonth, previewYear)
            const firstDay = getFirstDayOfMonth(previewMonth, previewYear)

            const approvedVacations = allVacations.filter((v) => {
              const start = new Date(v.startDate)
              const end = new Date(v.endDate)
              
              if (isNaN(start.getTime()) || isNaN(end.getTime())) return false
              
              const monthStart = new Date(previewYear, previewMonth, 1)
              const monthEnd = new Date(previewYear, previewMonth + 1, 0)

              return (start <= monthEnd && end >= monthStart) && v.status === 'approved'
            })

            const previewVacations = [...approvedVacations, previewVacation]

            return (
              <div className="py-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (previewMonth === 0) {
                          setPreviewMonth(11)
                          setPreviewYear(previewYear - 1)
                        } else {
                          setPreviewMonth(previewMonth - 1)
                        }
                      }}
                    >
                      ←
                    </Button>
                    <h3 className="text-lg font-bold">
                      {months[previewMonth]} {previewYear}
                    </h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (previewMonth === 11) {
                          setPreviewMonth(0)
                          setPreviewYear(previewYear + 1)
                        } else {
                          setPreviewMonth(previewMonth + 1)
                        }
                      }}
                    >
                      →
                    </Button>
                  </div>
                  <Badge className="bg-amber-500/20 text-amber-700 border-amber-500/30">
                    <Eye size={14} className="mr-1" />
                    Preview Mode
                  </Badge>
                </div>

                <div className="mb-4 p-3 bg-accent/10 border border-accent/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className="w-4 h-4 rounded"
                      style={{ 
                        backgroundColor: getEmployeeColorByEmail(previewVacation.userEmail).bg
                      }}
                    />
                    <span className="font-semibold">Ny ferie anmodning:</span>
                    <span>{getFirstName(previewVacation.userEmail)}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {format(new Date(previewVacation.startDate), 'd. MMMM yyyy', { locale: da })} → {format(new Date(previewVacation.endDate), 'd. MMMM yyyy', { locale: da })}
                  </div>
                  {previewVacation.notes && (
                    <div className="text-sm text-muted-foreground mt-1">
                      Note: {previewVacation.notes}
                    </div>
                  )}
                </div>

                <div className="border-2 rounded-lg p-4">
                  <div className="grid grid-cols-8 gap-2">
                    <div className="text-center font-semibold text-xs py-2 text-muted-foreground">
                      Uge
                    </div>
                    {['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'].map((day, index) => (
                      <div
                        key={day}
                        className={cn(
                          "text-center font-semibold text-xs py-2",
                          index >= 5 ? "text-muted-foreground/60" : "text-muted-foreground"
                        )}
                      >
                        {day}
                      </div>
                    ))}

                    {Array.from({ length: Math.ceil((firstDay + daysInMonth) / 7) }).map((_, weekIndex) => {
                      const firstDateOfWeek = new Date(previewYear, previewMonth, weekIndex * 7 - firstDay + 1)
                      const weekNumber = getWeekNumber(firstDateOfWeek)
                      
                      return (
                        <React.Fragment key={`week-${weekIndex}`}>
                          <div className="flex items-center justify-center text-xs font-bold text-muted-foreground border rounded bg-muted/30">
                            {weekNumber}
                          </div>
                          {Array.from({ length: 7 }).map((_, dayIndex) => {
                            const cellIndex = weekIndex * 7 + dayIndex
                            const day = cellIndex - firstDay + 1
                            
                            if (cellIndex < firstDay || day > daysInMonth) {
                              return <div key={`empty-${cellIndex}`} className="aspect-square" />
                            }

                            const dayVacations = previewVacations.filter((vacation) =>
                              isDateInVacation(day, vacation, previewMonth, previewYear)
                            )
                            const currentDate = new Date(previewYear, previewMonth, day)
                            const dayOfWeek = currentDate.getDay()
                            const isWeekendDay = dayOfWeek === 0 || dayOfWeek === 6
                            const isToday =
                              day === new Date().getDate() &&
                              previewMonth === new Date().getMonth() &&
                              previewYear === new Date().getFullYear()

                            return (
                              <div
                                key={day}
                                className={cn(
                                  "aspect-square border rounded p-1 relative text-xs",
                                  isToday && "ring-2 ring-primary",
                                  isWeekendDay && "bg-muted/50 opacity-60"
                                )}
                              >
                                <div className={cn(
                                  "font-semibold mb-1 text-[10px]",
                                  isWeekendDay && "text-muted-foreground"
                                )}>
                                  {day}
                                </div>
                                {isWeekendDay ? (
                                  <div className="text-[8px] text-muted-foreground text-center mt-1">
                                    Lukket
                                  </div>
                                ) : (
                                  <div className="space-y-0.5">
                                    {dayVacations.slice(0, 3).map((vacation) => (
                                      <div
                                        key={vacation.id}
                                        className={cn(
                                          "text-[9px] px-1 py-0.5 rounded truncate font-medium",
                                          vacation.id === previewVacation.id && "ring-1 ring-amber-500"
                                        )}
                                        style={{ 
                                          backgroundColor: getEmployeeColorByEmail(vacation.userEmail).bg,
                                          color: getEmployeeColorByEmail(vacation.userEmail).text
                                        }}
                                        title={`${getFirstName(vacation.userEmail)}${vacation.notes ? ': ' + vacation.notes : ''}`}
                                      >
                                        {getFirstName(vacation.userEmail)}
                                      </div>
                                    ))}
                                    {dayVacations.length > 3 && (
                                      <div className="text-[8px] text-muted-foreground">
                                        +{dayVacations.length - 3}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </React.Fragment>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })()}

          <DialogFooter className="gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsPreviewDialogOpen(false)}
            >
              Luk Preview
            </Button>
            {previewVacation && (
              <>
                <Button
                  onClick={() => {
                    setIsPreviewDialogOpen(false)
                    handleApproveVacation(previewVacation)
                  }}
                  className="gap-2 bg-gradient-to-r from-accent to-secondary hover:from-accent/90 hover:to-secondary/90"
                >
                  <Check size={18} weight="bold" />
                  Godkend Ferie
                </Button>
                <Button
                  onClick={() => {
                    setIsPreviewDialogOpen(false)
                    handleRejectVacation(previewVacation)
                  }}
                  variant="destructive"
                  className="gap-2"
                >
                  <X size={18} weight="bold" />
                  Afvis Ferie
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
