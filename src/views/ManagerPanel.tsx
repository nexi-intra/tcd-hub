import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, ShieldCheck, Check, Crown, User as UserIcon, Trash, FirstAidKit, X, Umbrella, ClockCounterClockwise, PencilSimple, Plus, Phone, CalendarBlank, Eye, WaveSine, RocketLaunch, Cube, Gift, Bird, SquaresFour, GameController, HardDrives } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { useKV } from '@/hooks/useKV'
import { UserProfile } from '@/components/UserProfile'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { DatePickerField } from '@/components/DatePickerField'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { format } from 'date-fns'
import { da } from 'date-fns/locale'
import { UserRole, ADMIN_EMAIL, hasManagerAccess, getRoleDisplayName, getRoleDescription } from '@/lib/userRoles'
import { hashPassword } from '@/lib/passwords'
import { newId } from '@/lib/utils'
import { parseLocalDate } from '@/lib/dateUtils'
import { appendToKvArray, updateKvArrayItem, removeFromKvArray, upsertInKvArray, setKvObjectField, deleteKvObjectField } from '@/lib/kvArrays'
import { cn } from '@/lib/utils'
import { isAnyModalOpen } from '@/lib/modalStack'
import { consumeNavigationParams } from '@/lib/appNavigation'
import { getEmployeeColorByEmail } from '@/lib/employeeColors'
import { getWeekNumber as getISOWeekNumber } from '@/lib/dateUtils'
import React from 'react'
import { ManualVacationGrant } from '@/components/ManualVacationGrant'
import { DataStorageManager } from '@/components/DataStorageManager'
import { UpdateManager } from '@/components/UpdateManager'
import { ClientVersionManager } from '@/components/ClientVersionManager'
import { GameLeaderboardAdmin } from '@/components/GameLeaderboardAdmin'
import { OnboardingWizard, OffboardingWizard } from '@/components/OnboardingWizard'
import { Checkbox } from '@/components/ui/checkbox'
import { vacationApprovedEmail, vacationRejectedEmail, vacationEditedEmail, vacationDeletedEmail, userApprovedEmail, userRejectedEmail } from '@/lib/emailTemplates'
import type { BirthdayEntry, SickLeaveEntry, VacationEntry, VacationStatus } from '@/lib/types'

interface User {
  email: string
  fullName: string
  role: UserRole
  phone?: string
  status?: 'pending' | 'approved' | 'rejected'
  username?: string
}

interface ManagerPanelProps {
  onNavigateBack: () => void
  onLogout: () => void
  userEmail: string
}

export function ManagerPanel({ onNavigateBack, onLogout, userEmail }: ManagerPanelProps) {
  // Deep-link (fx knappen i ferieanmodnings-mails) kan bede om en bestemt fane.
  const [initialTab] = useState(() => consumeNavigationParams()?.tab ?? 'permissions')
  const [activeTab, setActiveTab] = useState(initialTab)
  const [users, setUsers] = useState<User[]>([])
  const [pendingUsers, setPendingUsers] = useState<User[]>([])
  const [sickLeaveEntries, setSickLeaveEntries] = useState<SickLeaveEntry[]>([])
  const [vacationEntries, setVacationEntries] = useState<VacationEntry[]>([])
  const [allVacations, setAllVacations] = useState<VacationEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasAccess, setHasAccess] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
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
  const [isManualGrantDialogOpen, setIsManualGrantDialogOpen] = useState(false)
  const [birthdays, setBirthdays] = useState<BirthdayEntry[]>([])
  const [isEditBirthdayDialogOpen, setIsEditBirthdayDialogOpen] = useState(false)
  const [editingBirthday, setEditingBirthday] = useState<BirthdayEntry | null>(null)
  const [birthdayDate, setBirthdayDate] = useState('')
  const [birthYear, setBirthYear] = useState('')
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false)
  const [isOffboardingOpen, setIsOffboardingOpen] = useState(false)
  const [selectedVacationIds, setSelectedVacationIds] = useState<string[]>([])
  // Hvilke ferieanmodninger DENNE manager allerede har set — bruges til at fjerne
  // Hub-advarslen/notifikationen, uden at røre selve "afventer godkendelse"-status.
  const [seenVacationRequestIds, setSeenVacationRequestIds] = useKV<string[]>(`seen-vacation-requests-${userEmail}`, [])
  const [isBulkProcessing, setIsBulkProcessing] = useState(false)

  useEffect(() => {
    const checkAccess = async () => {
      const access = await hasManagerAccess(userEmail)
      setHasAccess(access)
      if (access) {
        loadUsers()
        loadSickLeaveEntries()
        loadVacationEntries()
        loadBirthdays()
      }
    }
    checkAccess()
  }, [userEmail])

  useEffect(() => {
    // Så snart manageren har fanen "Anmodninger" åben, regnes de synlige afventende
    // anmodninger for "set" — Hub-badge/notifikation forsvinder, men selve fanens
    // eget badge (nedenfor) fortsætter uændret med at vise alle afventende.
    if (activeTab !== 'vacation-requests' || vacationEntries.length === 0) return
    const pendingIds = vacationEntries.map(v => v.id)
    setSeenVacationRequestIds(current => {
      const currentIds = current || []
      const missing = pendingIds.filter(id => !currentIds.includes(id))
      return missing.length > 0 ? [...currentIds, ...missing] : currentIds
    })
  }, [activeTab, vacationEntries, setSeenVacationRequestIds])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isAnyModalOpen()) return
        onNavigateBack()
      }
    }
    
    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [onNavigateBack])

  const loadUsers = async () => {
    setIsLoading(true)
    const usersData = await window.kv.get<Record<string, { email: string; password: string; fullName: string; phone?: string; role?: UserRole; isManager?: boolean; status?: 'pending' | 'approved' | 'rejected'; username?: string }>>('users')
    if (usersData) {
      const allUsers = Object.values(usersData).map(u => {
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
          role,
          phone: u.phone,
          status: u.status,
          username: u.username,
        }
      })

      setPendingUsers(allUsers.filter(u => u.status === 'pending'))
      setUsers(allUsers.filter(u => u.status !== 'pending').sort((a, b) => {
        const roleOrder = { admin: 0, manager: 1, user: 2 }
        return roleOrder[a.role] - roleOrder[b.role]
      }))
    }
    setIsLoading(false)
  }

  const sendUserDecisionEmail = async (user: User, approved: boolean) => {
    try {
      const emailContent = approved ? userApprovedEmail(user.fullName, userEmail) : userRejectedEmail(user.fullName, userEmail)
      await appendToKvArray('emails', [{
        id: `${Date.now()}-user-decision`,
        from: userEmail,
        to: user.email,
        subject: emailContent.subject,
        message: emailContent.body,
        timestamp: Date.now(),
        read: false,
      }])
    } catch (error) {
      console.error('Error sending user decision email:', error)
    }
  }

  const handleApproveUser = async (user: User) => {
    const usersData = await window.kv.get<Record<string, { status?: string } & Record<string, unknown>>>('users')
    if (!usersData?.[user.email]) {
      toast.error('Bruger ikke fundet')
      return
    }
    await setKvObjectField('users', user.email, { ...usersData[user.email], status: 'approved' })
    await loadUsers()
    await sendUserDecisionEmail(user, true)
    toast.success(`${user.fullName} er godkendt og kan nu logge ind`)
  }

  const handleRejectUser = async (user: User) => {
    const usersData = await window.kv.get<Record<string, { status?: string } & Record<string, unknown>>>('users')
    if (!usersData?.[user.email]) {
      toast.error('Bruger ikke fundet')
      return
    }
    await setKvObjectField('users', user.email, { ...usersData[user.email], status: 'rejected' })
    await loadUsers()
    await sendUserDecisionEmail(user, false)
    toast.success(`Anmodningen fra ${user.fullName} er afvist`)
  }

  const loadSickLeaveEntries = async () => {
    const entries = await window.kv.get<SickLeaveEntry[]>('sick-leave-entries') || []
    setSickLeaveEntries(entries.sort((a, b) => {
      const dateA = new Date(b.submittedAt)
      const dateB = new Date(a.submittedAt)
      if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) return 0
      return dateA.getTime() - dateB.getTime()
    }))
  }

  const loadVacationEntries = async () => {
    const entries = await window.kv.get<VacationEntry[]>('vacation-entries') || []
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

  const loadBirthdays = async () => {
    const birthdaysData = await window.kv.get<BirthdayEntry[]>('employee-birthdays') || []
    setBirthdays(birthdaysData.sort((a, b) => {
      const dateA = new Date(`2000-${a.birthday}`)
      const dateB = new Date(`2000-${b.birthday}`)
      return dateA.getMonth() - dateB.getMonth() || dateA.getDate() - dateB.getDate()
    }))
  }

  const openEditBirthdayDialog = (entry: BirthdayEntry) => {
    setEditingBirthday(entry)
    setBirthdayDate(entry.birthday)
    setBirthYear(entry.birthYear?.toString() || '')
    setIsEditBirthdayDialogOpen(true)
  }

  const handleSaveBirthday = async () => {
    if (!editingBirthday || !birthdayDate) {
      toast.error('Vælg venligst en fødselsdato')
      return
    }

    const updatedEntry: BirthdayEntry = {
      email: editingBirthday.email,
      fullName: editingBirthday.fullName,
      birthday: birthdayDate,
      birthYear: birthYear ? parseInt(birthYear) : undefined
    }

    await upsertInKvArray('employee-birthdays', [{ ...updatedEntry, id: updatedEntry.email }])
    await loadBirthdays()
    
    setIsEditBirthdayDialogOpen(false)
    setEditingBirthday(null)
    setBirthdayDate('')
    setBirthYear('')
    toast.success('Fødselsdag gemt')
  }

  const deleteBirthday = async (email: string) => {
    await removeFromKvArray('employee-birthdays', [email])
    await loadBirthdays()
    toast.success('Fødselsdag slettet')
  }

  const changeUserRole = async (email: string, newRole: UserRole) => {
    if (email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      toast.error('Kan ikke ændre admin brugerens rettigheder')
      return
    }

    const usersData = await window.kv.get<Record<string, { email: string; password: string; fullName: string; role: UserRole; isManager: boolean }>>('users')
    if (usersData && usersData[email]) {
      await setKvObjectField('users', email, {
        ...usersData[email],
        role: newRole,
        isManager: newRole === 'manager' || newRole === 'admin',
      })
      await loadUsers()
      
      toast.success(`Bruger ændret til ${getRoleDisplayName(newRole)}`)
    }
  }

  const deleteUser = async (email: string) => {
    if (email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      toast.error('Kan ikke slette admin brugeren')
      return
    }

    const usersData = await window.kv.get<Record<string, { email: string; password: string; fullName: string; role: UserRole; isManager: boolean }>>('users')
    if (usersData && usersData[email]) {
      const userFullName = usersData[email].fullName
      
      await deleteKvObjectField('users', email)
      
      const assignments = (await window.kv.get<Array<{ id: string; employeeId: string; employeeName: string; roleId: string; date: string; comment?: string }>>('shift-assignments')) || []
      const assignmentIdsToRemove = assignments.filter(a => a.employeeName === userFullName).map(a => a.id)
      await removeFromKvArray('shift-assignments', assignmentIdsToRemove)
      
      await loadUsers()
      toast.success('Bruger slettet')
    }
  }

  const openEditNameDialog = async (user: User) => {
    const usersData = await window.kv.get<Record<string, { email: string; password: string; fullName: string; role: UserRole; isManager: boolean; phone?: string; username?: string }>>('users')
    const userData = usersData?.[user.email]

    setEditingUser(user)
    setNewName(user.fullName)
    setNewEmail(user.email)
    setNewPhone(userData?.phone || '')
    setNewUsername(userData?.username || '')
    setNewPassword('')
    setIsEditDialogOpen(true)
  }

  const handleSaveUserName = async () => {
    if (!editingUser || !newName.trim()) {
      toast.error('Navn kan ikke være tomt')
      return
    }

    if (!newEmail.trim()) {
      toast.error('Email kan ikke være tom')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(newEmail.trim())) {
      toast.error('Ugyldig email adresse')
      return
    }

    const trimmedUsername = newUsername.trim()
    if (trimmedUsername && !/^[a-zA-Z0-9._-]{3,32}$/.test(trimmedUsername)) {
      toast.error('Brugernavn skal være 3-32 tegn (bogstaver, tal, punktum, bindestreg, underscore)')
      return
    }

    const usersData = await window.kv.get<Record<string, { email: string; password: string; fullName: string; role: UserRole; isManager: boolean; phone?: string; username?: string }>>('users')
    if (!usersData || !usersData[editingUser.email]) {
      toast.error('Bruger ikke fundet')
      return
    }

    if (trimmedUsername) {
      const usernameTaken = Object.entries(usersData).some(([userEmail, u]) =>
        userEmail !== editingUser.email && u.username?.toLowerCase() === trimmedUsername.toLowerCase()
      )
      if (usernameTaken) {
        toast.error('Brugernavnet er allerede i brug')
        return
      }
    }

    const userData = usersData[editingUser.email]

    if (newPassword && newPassword.length < 6) {
      toast.error('Adgangskode skal være mindst 6 tegn')
      return
    }

    const updatedUserData = {
      ...userData,
      fullName: newName.trim(),
      email: newEmail.trim(),
      phone: newPhone.trim() || userData.phone,
      username: trimmedUsername || undefined,
      password: newPassword.trim() ? await hashPassword(newPassword.trim()) : userData.password,
    }

    if (newEmail.trim().toLowerCase() !== editingUser.email.toLowerCase()) {
      await deleteKvObjectField('users', editingUser.email)
      await setKvObjectField('users', newEmail.trim().toLowerCase(), updatedUserData)
    } else {
      await setKvObjectField('users', editingUser.email, updatedUserData)
    }

    await loadUsers()
    setIsEditDialogOpen(false)
    setEditingUser(null)
    setNewName('')
    setNewEmail('')
    setNewPhone('')
    setNewUsername('')
    setNewPassword('')
    toast.success('Bruger opdateret succesfuldt')
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

    const usersData = await window.kv.get<Record<string, { email: string; password: string; fullName: string; role: UserRole; isManager: boolean; phone?: string; status?: 'pending' | 'approved' | 'rejected' }>>('users') || {}
    
    if (usersData[newUserEmail.toLowerCase()]) {
      toast.error('En bruger med denne email eksisterer allerede')
      return
    }

    try {
      await setKvObjectField('users', newUserEmail.toLowerCase(), {
        email: newUserEmail.toLowerCase(),
        password: await hashPassword(newUserPassword.trim()),
        fullName: newUserName.trim(),
        role: 'user',
        isManager: false,
        phone: newUserPhone.trim(),
        // Manager-created accounts skip the approval flow.
        status: 'approved'
      })
    } catch (error) {
      console.error('Failed to save new user:', error)
      toast.error(`Kunne ikke gemme bruger: ${error instanceof Error ? error.message : String(error)}`)
      return
    }

    await loadUsers()
    
    setIsCreateDialogOpen(false)
    setNewUserName('')
    setNewUserEmail('')
    setNewUserPassword('')
    setNewUserPhone('')
    
    toast.success('Bruger oprettet succesfuldt')
  }

  const deleteSickLeave = async (id: string) => {
    await removeFromKvArray('sick-leave-entries', [id])
    await loadSickLeaveEntries()
    toast.success('Sygemelding slettet')
  }

  const handleApproveVacation = async (vacation: VacationEntry) => {
    // Atomar pr.-element-opdatering — to manageres samtidige beslutninger taber ikke hinanden.
    const updated = await updateKvArrayItem<VacationEntry>('vacation-entries', vacation.id, (v) => ({
      ...v, status: 'approved' as VacationStatus, reviewedBy: userEmail, reviewedAt: new Date().toISOString(),
    }))
    if (!updated) {
      toast.error('Ferieanmodningen findes ikke længere')
      await loadVacationEntries()
      return
    }
    await loadVacationEntries()
    toast.success('Ferie godkendt')

    try {
      const emailContent = vacationApprovedEmail(vacation.startDate, vacation.endDate, userEmail, vacation.notes)

      const newEmail = {
        id: newId('email'),
        from: userEmail,
        to: vacation.userEmail,
        subject: emailContent.subject,
        message: emailContent.body,
        timestamp: Date.now(),
        read: false
      }

      await appendToKvArray('emails', [newEmail])

      const notification = {
        id: newId('notif'),
        type: 'email' as const,
        message: `Din ferieansøgning blev godkendt!`,
        timestamp: Date.now(),
        read: false,
        from: userEmail,
        emailId: newEmail.id
      }

      await appendToKvArray('email-notifications', [notification])
    } catch (emailError) {
      console.error('Error sending vacation approval email:', emailError)
    }
  }

  const handleRejectVacation = async (vacation: VacationEntry) => {
    const updated = await updateKvArrayItem<VacationEntry>('vacation-entries', vacation.id, (v) => ({
      ...v, status: 'rejected' as VacationStatus, reviewedBy: userEmail, reviewedAt: new Date().toISOString(),
    }))
    if (!updated) {
      toast.error('Ferieanmodningen findes ikke længere')
      await loadVacationEntries()
      return
    }
    await loadVacationEntries()
    toast.error('Ferie afvist')

    try {
      const emailContent = vacationRejectedEmail(vacation.startDate, vacation.endDate, userEmail, vacation.notes)

      const newEmail = {
        id: newId('email'),
        from: userEmail,
        to: vacation.userEmail,
        subject: emailContent.subject,
        message: emailContent.body,
        timestamp: Date.now(),
        read: false
      }

      await appendToKvArray('emails', [newEmail])

      const notification = {
        id: newId('notif'),
        type: 'email' as const,
        message: `Din ferieansøgning blev afvist`,
        timestamp: Date.now(),
        read: false,
        from: userEmail,
        emailId: newEmail.id
      }

      await appendToKvArray('email-notifications', [notification])
    } catch (emailError) {
      console.error('Error sending vacation rejection email:', emailError)
    }
  }

  const openEditVacationDialog = (vacation: VacationEntry) => {
    setEditingVacation(vacation)
    setEditVacationStartDate(parseLocalDate(vacation.startDate))
    setEditVacationEndDate(parseLocalDate(vacation.endDate))
    setEditVacationNotes(vacation.notes || '')
    setIsEditVacationDialogOpen(true)
  }

  const toggleVacationSelected = (id: string) => {
    setSelectedVacationIds(current =>
      current.includes(id) ? current.filter(v => v !== id) : [...current, id]
    )
  }

  /** Batch-afgørelse: opdaterer hver valgt anmodning atomart og sender alle mails/notifikationer i ét skriv pr. nøgle. */
  const handleBulkVacationDecision = async (status: 'approved' | 'rejected') => {
    const selected = vacationEntries.filter(v => selectedVacationIds.includes(v.id))
    if (selected.length === 0) return
    setIsBulkProcessing(true)

    try {
      const emailItems: Array<{ id: string } & Record<string, unknown>> = []
      const notificationItems: Array<{ id: string } & Record<string, unknown>> = []
      let succeeded = 0

      for (const vacation of selected) {
        const updated = await updateKvArrayItem<VacationEntry>('vacation-entries', vacation.id, (v) => ({
          ...v, status: status as VacationStatus, reviewedBy: userEmail, reviewedAt: new Date().toISOString(),
        }))
        if (!updated) continue
        succeeded++

        const emailContent = status === 'approved'
          ? vacationApprovedEmail(vacation.startDate, vacation.endDate, userEmail, vacation.notes)
          : vacationRejectedEmail(vacation.startDate, vacation.endDate, userEmail, vacation.notes)
        const emailId = newId('email')
        emailItems.push({
          id: emailId,
          from: userEmail,
          to: vacation.userEmail,
          subject: emailContent.subject,
          message: emailContent.body,
          timestamp: Date.now(),
          read: false,
        })
        notificationItems.push({
          id: newId('notif'),
          type: 'email' as const,
          message: status === 'approved' ? 'Din ferieansøgning blev godkendt!' : 'Din ferieansøgning blev afvist',
          timestamp: Date.now(),
          read: false,
          from: userEmail,
          emailId,
        })
      }

      if (emailItems.length > 0) {
        await appendToKvArray('emails', emailItems)
        await appendToKvArray('email-notifications', notificationItems)
      }

      await loadVacationEntries()
      setSelectedVacationIds([])

      if (succeeded === 0) {
        toast.error('Ingen af anmodningerne findes længere')
      } else if (status === 'approved') {
        toast.success(`${succeeded} ${succeeded === 1 ? 'anmodning' : 'anmodninger'} godkendt`)
      } else {
        toast.success(`${succeeded} ${succeeded === 1 ? 'anmodning' : 'anmodninger'} afvist`)
      }
    } finally {
      setIsBulkProcessing(false)
    }
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

    const editedEntry = await updateKvArrayItem<VacationEntry>('vacation-entries', editingVacation.id, (v) => ({
      ...v,
      startDate: format(editVacationStartDate, 'yyyy-MM-dd'),
      endDate: format(editVacationEndDate, 'yyyy-MM-dd'),
      notes: editVacationNotes.trim() || undefined,
    }))
    if (!editedEntry) {
      toast.error('Ferieanmodningen findes ikke længere')
      await loadVacationEntries()
      setIsEditVacationDialogOpen(false)
      return
    }
    await loadVacationEntries()
    setIsEditVacationDialogOpen(false)

    try {
      const emailContent = vacationEditedEmail(
        editingVacation.startDate,
        editingVacation.endDate,
        editVacationStartDate,
        editVacationEndDate,
        userEmail,
        editVacationNotes.trim() || undefined,
      )

      const newEmail = {
        id: newId('email'),
        from: userEmail,
        to: editingVacation.userEmail,
        subject: emailContent.subject,
        message: emailContent.body,
        timestamp: Date.now(),
        read: false
      }

      await appendToKvArray('emails', [newEmail])

      const notification = {
        id: newId('notif'),
        type: 'email' as const,
        message: `Din ferie er blevet redigeret af en manager`,
        timestamp: Date.now(),
        read: false,
        from: userEmail,
        emailId: newEmail.id
      }

      await appendToKvArray('email-notifications', [notification])
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
    const allVacationsData = await window.kv.get<VacationEntry[]>('vacation-entries') || []
    const vacationToDelete = allVacationsData.find(v => v.id === id)
    
    if (!vacationToDelete) {
      toast.error('Ferie ikke fundet')
      return
    }

    await window.kv.update('vacation-entries', { op: 'remove', ids: [id] })
    await loadVacationEntries()
    toast.success('Ferie slettet')

    try {
      const emailContent = vacationDeletedEmail(
        vacationToDelete.startDate,
        vacationToDelete.endDate,
        vacationToDelete.status,
        userEmail,
        vacationToDelete.notes,
      )

      const newEmail = {
        id: newId('email'),
        from: userEmail,
        to: vacationToDelete.userEmail,
        subject: emailContent.subject,
        message: emailContent.body,
        timestamp: Date.now(),
        read: false
      }

      await appendToKvArray('emails', [newEmail])

      const notification = {
        id: newId('notif'),
        type: 'email' as const,
        message: `Din ferie er blevet slettet af en manager`,
        timestamp: Date.now(),
        read: false,
        from: userEmail,
        emailId: newEmail.id
      }

      await appendToKvArray('email-notifications', [notification])
    } catch (emailError) {
      console.error('Error sending vacation deletion email:', emailError)
    }
  }

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return (
          <Badge className="bg-gradient-to-r from-accent via-primary to-accent text-white">
            <Crown size={14} className="mr-1" weight="fill" />
            Administrator
          </Badge>
        )
      case 'manager':
        return (
          <Badge className="bg-gradient-to-r from-primary to-accent text-white">
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
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(0.45_0.18_270/0.12),transparent_50%),radial-gradient(ellipse_at_bottom_right,oklch(0.55_0.13_255/0.10),transparent_50%),radial-gradient(ellipse_at_bottom_left,oklch(0.60_0.10_250/0.08),transparent_50%)] pointer-events-none" />
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

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-36 pb-12 sm:pb-20 max-w-5xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-10 text-center"
        >
          <div className="flex flex-col items-center gap-6">
            <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-br from-primary to-accent bg-clip-text text-transparent">
              Manager Panel
            </h1>
          </div>
        </motion.div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-7 max-w-6xl">
            <TabsTrigger value="permissions" className="gap-2">
              <ShieldCheck size={18} />
              Rettigheder
              {pendingUsers.length > 0 && (
                <Badge className="ml-1 h-5 px-1.5 bg-accent text-accent-foreground">
                  {pendingUsers.length}
                </Badge>
              )}
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
            <TabsTrigger value="birthdays" className="gap-2">
              <Gift size={18} />
              Fødselsdage
            </TabsTrigger>
            <TabsTrigger value="games" className="gap-2">
              <GameController size={18} />
              Spil
            </TabsTrigger>
            <TabsTrigger value="data-storage" className="gap-2">
              <HardDrives size={18} />
              Datalagring
            </TabsTrigger>
          </TabsList>

          <TabsContent value="permissions" className="space-y-6">
            {pendingUsers.length > 0 && (
              <Card className="p-6 border-2 border-amber-400 bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/40 dark:to-amber-900/20 dark:border-amber-600">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <UserIcon size={28} className="text-amber-600 dark:text-amber-400" weight="duotone" />
                    <h2 className="text-2xl font-bold">Nye brugeranmodninger</h2>
                  </div>
                  <Badge className="bg-amber-500/20 text-amber-700 border-amber-500/30">
                    {pendingUsers.length} {pendingUsers.length === 1 ? 'anmodning' : 'anmodninger'}
                  </Badge>
                </div>
                <div className="mb-4 p-3 bg-background/60 rounded-lg border text-sm text-muted-foreground">
                  Disse personer har oprettet en konto og venter på din godkendelse, før de kan logge ind.
                </div>
                <div className="space-y-3">
                  {pendingUsers.map((user) => (
                    <motion.div
                      key={user.email}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl border-2 bg-card"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-lg">{user.fullName}</div>
                        <div className="text-sm text-muted-foreground truncate">{user.email}</div>
                        {user.phone && <div className="text-xs text-muted-foreground mt-0.5">Telefon: {user.phone}</div>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => handleApproveUser(user)}
                          className="gap-2 bg-gradient-to-r from-accent to-primary hover:from-accent/90 hover:to-primary/90"
                        >
                          <Check size={18} weight="bold" />
                          Godkend
                        </Button>
                        <Button
                          onClick={() => handleRejectUser(user)}
                          variant="destructive"
                          className="gap-2"
                        >
                          <X size={18} weight="bold" />
                          Afvis
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </Card>
            )}

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
                    onClick={() => setIsOnboardingOpen(true)}
                    variant="outline"
                    className="gap-2"
                  >
                    <UserIcon size={18} weight="bold" />
                    Onboarding
                  </Button>
                  <Button
                    onClick={() => setIsOffboardingOpen(true)}
                    variant="outline"
                    className="gap-2 text-destructive hover:text-destructive"
                  >
                    <UserIcon size={18} weight="bold" />
                    Offboarding
                  </Button>
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
                          {user.status === 'rejected' && (
                            <Badge variant="destructive" className="text-xs">Afvist</Badge>
                          )}
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

              <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {(() => {
                  const employeeStats = new Map<string, { 
                    name: string
                    email: string
                    count: number
                    lastDate: string 
                  }>()

                  const selfSickEntries = sickLeaveEntries.filter(e => e.type !== 'child')
                  const childSickEntries = sickLeaveEntries.filter(e => e.type === 'child')

                  sickLeaveEntries.forEach((entry) => {
                    const existing = employeeStats.get(entry.userEmail)
                    if (existing) {
                      existing.count++
                      const existingDate = new Date(existing.lastDate)
                      const currentDate = parseLocalDate(entry.startDate)
                      if (currentDate > existingDate) {
                        existing.lastDate = entry.startDate
                      }
                    } else {
                      employeeStats.set(entry.userEmail, {
                        name: entry.userName,
                        email: entry.userEmail,
                        count: 1,
                        lastDate: entry.startDate
                      })
                    }
                  })

                  const sortedStats = Array.from(employeeStats.values()).sort((a, b) => b.count - a.count)
                  const totalEmployees = users.length
                  const employeesWithSickLeave = employeeStats.size
                  const totalSickDays = sickLeaveEntries.length

                  return (
                    <>
                      <Card className="p-4 bg-gradient-to-br from-destructive/10 to-destructive/5 border-destructive/20">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-sm font-medium text-muted-foreground">Egen Sygdom</div>
                          <FirstAidKit size={20} className="text-destructive" weight="duotone" />
                        </div>
                        <div className="text-3xl font-bold text-destructive">{selfSickEntries.length}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          sygemeldinger
                        </div>
                      </Card>

                      <Card className="p-4 bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-sm font-medium text-muted-foreground">Barn Syg</div>
                          <UserIcon size={20} className="text-orange-600" weight="duotone" />
                        </div>
                        <div className="text-3xl font-bold text-orange-600">{childSickEntries.length}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          barn syg meldinger
                        </div>
                      </Card>

                      <Card className="p-4 bg-gradient-to-br from-accent/10 to-accent/5 border-accent/20">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-sm font-medium text-muted-foreground">Total Sygemeldinger</div>
                          <FirstAidKit size={20} className="text-accent" weight="duotone" />
                        </div>
                        <div className="text-3xl font-bold text-accent">{totalSickDays}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {employeesWithSickLeave} af {totalEmployees} medarbejdere
                        </div>
                      </Card>

                      <Card className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-sm font-medium text-muted-foreground">Mest Sygemeldinger</div>
                          <Crown size={20} className="text-primary" weight="duotone" />
                        </div>
                        {sortedStats.length > 0 ? (
                          <>
                            <div className="text-sm leading-snug font-bold text-primary break-words line-clamp-2" title={sortedStats[0].name}>{sortedStats[0].name}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {sortedStats[0].count} {sortedStats[0].count === 1 ? 'sygemelding' : 'sygemeldinger'}
                            </div>
                          </>
                        ) : (
                          <div className="text-lg font-bold text-muted-foreground">Ingen data</div>
                        )}
                      </Card>
                    </>
                  )
                })()}
              </div>

              {sickLeaveEntries.length > 0 && (() => {
                // Mønster-analyse: ugedags-heatmap (90 dage) + alarm ved ≥3 sygemeldinger på 30 dage.
                const now = Date.now()
                const DAY_MS = 86400000
                const last90 = sickLeaveEntries.filter(e => {
                  const d = parseLocalDate(e.startDate)
                  return !isNaN(d.getTime()) && now - d.getTime() <= 90 * DAY_MS
                })

                const weekdayLabels = ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn']
                const weekdayCounts = new Array(7).fill(0)
                last90.forEach(e => {
                  const d = parseLocalDate(e.startDate)
                  if (isNaN(d.getTime())) return
                  weekdayCounts[(d.getDay() + 6) % 7]++
                })
                const maxWeekday = Math.max(...weekdayCounts, 1)

                const last30ByEmployee = new Map<string, { name: string; count: number }>()
                sickLeaveEntries.forEach(e => {
                  const d = parseLocalDate(e.startDate)
                  if (isNaN(d.getTime()) || now - d.getTime() > 30 * DAY_MS) return
                  const existing = last30ByEmployee.get(e.userEmail)
                  if (existing) existing.count++
                  else last30ByEmployee.set(e.userEmail, { name: e.userName, count: 1 })
                })
                const frequencyAlerts = Array.from(last30ByEmployee.values())
                  .filter(s => s.count >= 3)
                  .sort((a, b) => b.count - a.count)

                return (
                  <Card className="p-4 mb-6 border">
                    <div className="flex items-center gap-2 mb-4">
                      <WaveSine size={20} className="text-primary" weight="duotone" />
                      <h3 className="font-bold text-lg">Mønstre & Alarmer</h3>
                      <span className="text-xs text-muted-foreground ml-1">(seneste 90 dage)</span>
                    </div>

                    <div className="grid grid-cols-7 gap-2 mb-2">
                      {weekdayLabels.map((label, i) => {
                        const count = weekdayCounts[i]
                        const intensity = count / maxWeekday
                        return (
                          <div key={label} className="flex flex-col items-center gap-1.5">
                            <div
                              className="w-full h-16 rounded-lg border flex items-end justify-center pb-1 transition-colors"
                              style={{
                                backgroundColor: count === 0
                                  ? 'transparent'
                                  : `oklch(0.55 0.18 25 / ${0.12 + intensity * 0.55})`
                              }}
                              title={`${count} ${count === 1 ? 'sygemelding' : 'sygemeldinger'} på ${label.toLowerCase()}dage`}
                            >
                              <span className={cn("text-sm font-bold", count === 0 ? "text-muted-foreground/40" : "text-foreground")}>
                                {count}
                              </span>
                            </div>
                            <span className="text-xs text-muted-foreground font-medium">{label}</span>
                          </div>
                        )
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground mb-4">
                      Ugedage hvor sygemeldinger typisk starter — en tydelig overvægt af mandage/fredage kan være værd at kigge nærmere på.
                    </p>

                    {frequencyAlerts.length > 0 && (
                      <div className="p-4 rounded-lg border-2 border-amber-400/60 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-600/60">
                        <div className="flex items-center gap-2 mb-2">
                          <FirstAidKit size={18} className="text-amber-600 dark:text-amber-400" weight="fill" />
                          <span className="font-semibold text-sm">Usædvanlig hyppighed (≥3 sygemeldinger på 30 dage)</span>
                        </div>
                        <div className="space-y-1.5">
                          {frequencyAlerts.map(alert => (
                            <div key={alert.name} className="flex items-center justify-between text-sm">
                              <span className="font-medium">{alert.name}</span>
                              <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30">
                                {alert.count} sygemeldinger
                              </Badge>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Overvej en omsorgssamtale — hyppigt fravær kan skyldes forhold der kræver støtte.
                        </p>
                      </div>
                    )}
                  </Card>
                )
              })()}

              {sickLeaveEntries.length > 0 && (() => {
                const employeeStats = new Map<string, { 
                  name: string
                  email: string
                  count: number
                  lastDate: string 
                }>()

                sickLeaveEntries.forEach((entry) => {
                  const existing = employeeStats.get(entry.userEmail)
                  if (existing) {
                    existing.count++
                    const existingDate = new Date(existing.lastDate)
                    const currentDate = parseLocalDate(entry.startDate)
                    if (currentDate > existingDate) {
                      existing.lastDate = entry.startDate
                    }
                  } else {
                    employeeStats.set(entry.userEmail, {
                      name: entry.userName,
                      email: entry.userEmail,
                      count: 1,
                      lastDate: entry.startDate
                    })
                  }
                })

                const sortedStats = Array.from(employeeStats.values()).sort((a, b) => b.count - a.count)

                return (
                  <Card className="p-4 mb-6 bg-muted/30 border">
                    <div className="flex items-center gap-2 mb-4">
                      <UserIcon size={20} className="text-primary" weight="duotone" />
                      <h3 className="font-bold text-lg">Medarbejder Statistik</h3>
                    </div>
                    <div className="space-y-2">
                      {sortedStats.map((stat, index) => (
                        <div 
                          key={stat.email}
                          className="flex items-center justify-between p-3 rounded-lg bg-card border hover:shadow-sm transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-destructive/20 to-destructive/10 text-destructive font-bold text-sm">
                              {index + 1}
                            </div>
                            <div>
                              <div className="font-semibold">{stat.name}</div>
                              <div className="text-xs text-muted-foreground">{stat.email}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="font-bold text-lg text-destructive">{stat.count}</div>
                              <div className="text-xs text-muted-foreground">
                                {stat.count === 1 ? 'sygemelding' : 'sygemeldinger'}
                              </div>
                            </div>
                            <div className="text-right min-w-[100px]">
                              <div className="text-xs text-muted-foreground">Seneste</div>
                              <div className="text-sm font-medium">
                                {(() => {
                                  try {
                                    const date = new Date(stat.lastDate)
                                    if (isNaN(date.getTime())) return 'Ugyldig'
                                    return format(date, 'd. MMM', { locale: da })
                                  } catch {
                                    return 'Ugyldig'
                                  }
                                })()}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                )
              })()}

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
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[oklch(0.42_0.19_270)] to-[oklch(0.52_0.15_262)] flex items-center justify-center text-white font-bold text-lg shadow-lg">
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-lg mb-1">{entry.userName}</div>
                          <div className="text-sm text-muted-foreground">{entry.userEmail}</div>
                          <div className="flex flex-col gap-1 mt-2 text-sm">
                            <span className="font-medium">
                              {(() => {
                                try {
                                  const startDate = parseLocalDate(entry.startDate)
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
                          <Badge className={entry.type === 'child' ? "bg-orange-500 text-white" : "bg-green-500 text-white"}>
                            <Check size={14} className="mr-1" />
                            {entry.type === 'child' ? 'Barn syg' : 'Sygemeldt'}
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

              {vacationEntries.length > 1 && (
                <div className="mb-4 flex flex-wrap items-center gap-3 p-3 rounded-lg border bg-card">
                  <label className="flex items-center gap-2 text-sm font-medium cursor-pointer select-none">
                    <Checkbox
                      checked={selectedVacationIds.length === vacationEntries.length && vacationEntries.length > 0}
                      onCheckedChange={(checked) =>
                        setSelectedVacationIds(checked ? vacationEntries.map(v => v.id) : [])
                      }
                    />
                    Vælg alle
                  </label>
                  {selectedVacationIds.length > 0 && (
                    <>
                      <Badge variant="secondary">{selectedVacationIds.length} valgt</Badge>
                      <div className="flex gap-2 ml-auto">
                        <Button
                          size="sm"
                          disabled={isBulkProcessing}
                          onClick={() => handleBulkVacationDecision('approved')}
                          className="gap-2 bg-gradient-to-r from-accent to-primary hover:from-accent/90 hover:to-primary/90"
                        >
                          <Check size={16} weight="bold" />
                          {isBulkProcessing ? 'Behandler…' : `Godkend valgte (${selectedVacationIds.length})`}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={isBulkProcessing}
                          onClick={() => handleBulkVacationDecision('rejected')}
                          className="gap-2"
                        >
                          <X size={16} weight="bold" />
                          Afvis valgte
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {vacationEntries.length === 0 ? (
                <div className="text-center py-12">
                  <Umbrella size={64} className="text-muted-foreground mx-auto mb-4" weight="duotone" />
                  <p className="text-muted-foreground">Ingen afventende ferie anmodninger</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {vacationEntries.map((vacation) => {
                    const requestingUser = users.find(u => u.email.toLowerCase() === vacation.userEmail.toLowerCase())
                    const displayName = requestingUser?.fullName || vacation.userEmail
                    const firstLetter = requestingUser?.fullName?.charAt(0).toUpperCase() || vacation.userEmail.charAt(0).toUpperCase()
                    
                    return (
                    <motion.div
                      key={vacation.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "flex flex-col gap-4 p-5 rounded-xl border-2 bg-card hover:shadow-md transition-all",
                        selectedVacationIds.includes(vacation.id) && "border-primary/60 bg-primary/[0.03]"
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <Checkbox
                            checked={selectedVacationIds.includes(vacation.id)}
                            onCheckedChange={() => toggleVacationSelected(vacation.id)}
                            className="shrink-0"
                          />
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-primary flex items-center justify-center text-white font-bold text-lg shadow-lg">
                            {firstLetter}
                          </div>
                          <div className="flex-1">
                            <div className="font-bold text-lg mb-1">{displayName}</div>
                            <div className="flex flex-col gap-1 text-sm">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-muted-foreground">Fra:</span>
                                <span className="font-semibold">
                                  {(() => {
                                    try {
                                      const date = parseLocalDate(vacation.startDate)
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
                                      const date = parseLocalDate(vacation.endDate)
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
                            const startDate = parseLocalDate(vacation.startDate)
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
                          className="flex-1 gap-2 bg-gradient-to-r from-accent to-primary hover:from-accent/90 hover:to-primary/90"
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
                  )})}
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
                  <Button 
                    onClick={() => setIsManualGrantDialogOpen(true)}
                    className="gap-2 bg-gradient-to-r from-accent to-primary hover:from-accent/90 hover:to-primary/90"
                  >
                    <Gift size={18} weight="bold" />
                    Giv Ferie/Fridag
                  </Button>
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
                          <div className="flex-1">
                            <div className="font-bold text-lg mb-1">{getUserName()}</div>
                            <div className="text-sm text-muted-foreground mb-2">{vacation.userEmail}</div>
                            <div className="flex items-center gap-3 text-sm">
                              <span className="font-medium">
                                {(() => {
                                  try {
                                    const date = parseLocalDate(vacation.startDate)
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
                                    const date = parseLocalDate(vacation.endDate)
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

          <TabsContent value="birthdays" className="space-y-6">
            <Card className="p-6 border-2">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Gift size={28} className="text-accent" weight="duotone" />
                  <h2 className="text-2xl font-bold">Medarbejder Fødselsdage</h2>
                </div>
                <Badge variant="outline" className="text-sm">
                  {birthdays.length} {birthdays.length === 1 ? 'Fødselsdag' : 'Fødselsdage'}
                </Badge>
              </div>

              <div className="mb-4 p-4 bg-muted/50 rounded-lg border">
                <p className="text-sm text-muted-foreground">
                  Her kan du registrere og redigere medarbejdernes fødselsdage. Klik på en bruger for at tilføje eller ændre deres fødselsdag.
                </p>
              </div>

              {isLoading ? (
                <p className="text-muted-foreground text-center py-12">Indlæser brugere...</p>
              ) : users.length === 0 ? (
                <p className="text-muted-foreground text-center py-12">Ingen brugere fundet</p>
              ) : (
                <div className="space-y-3">
                  {users.map((user) => {
                    const birthdayEntry = birthdays.find(b => b.email === user.email)
                    const hasBirthday = !!birthdayEntry
                    
                    let birthdayDisplay = 'Ingen fødselsdag registreret'
                    let daysUntilBirthday: number | null = null
                    
                    if (birthdayEntry) {
                      try {
                        const [month, day] = birthdayEntry.birthday.split('-').map(Number)
                        const today = new Date()
                        const thisYear = today.getFullYear()
                        let nextBirthday = new Date(thisYear, month - 1, day)
                        
                        if (nextBirthday < today) {
                          nextBirthday = new Date(thisYear + 1, month - 1, day)
                        }
                        
                        const diffTime = nextBirthday.getTime() - today.getTime()
                        daysUntilBirthday = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                        
                        const monthNames = ['Januar', 'Februar', 'Marts', 'April', 'Maj', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'December']
                        birthdayDisplay = `${day}. ${monthNames[month - 1]}`
                      } catch (error) {
                        birthdayDisplay = birthdayEntry.birthday
                      }
                    }

                    return (
                      <motion.div
                        key={user.email}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-between p-5 rounded-xl border-2 bg-card hover:shadow-md transition-all cursor-pointer"
                        onClick={() => openEditBirthdayDialog({
                          email: user.email,
                          fullName: user.fullName,
                          birthday: birthdayEntry?.birthday || ''
                        })}
                      >
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="font-bold text-lg">{user.fullName}</div>
                            </div>
                            <div className="text-sm text-muted-foreground truncate">{user.email}</div>
                            <div className={cn(
                              "text-sm mt-1 flex items-center gap-2",
                              hasBirthday ? "text-foreground font-medium" : "text-muted-foreground"
                            )}>
                              <Gift size={16} weight={hasBirthday ? "fill" : "regular"} />
                              {birthdayDisplay}
                              {daysUntilBirthday !== null && daysUntilBirthday <= 7 && (
                                <Badge className="ml-2 bg-accent/20 text-accent border-accent/30">
                                  {daysUntilBirthday === 0 ? '🎉 I dag!' : daysUntilBirthday === 1 ? 'I morgen' : `Om ${daysUntilBirthday} dage`}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="ml-4 flex items-center gap-2">
                          {hasBirthday ? (
                            <>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={(e) => {
                                  e.stopPropagation()
                                  openEditBirthdayDialog(birthdayEntry)
                                }}
                                className="hover:bg-primary/10"
                              >
                                <PencilSimple size={20} />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                  >
                                    <Trash size={20} />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Slet fødselsdag?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Er du sikker på at du vil slette fødselsdagen for <strong>{user.fullName}</strong>? Denne handling kan ikke fortrydes.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Annuller</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => deleteBirthday(user.email)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Slet fødselsdag
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                openEditBirthdayDialog({
                                  email: user.email,
                                  fullName: user.fullName,
                                  birthday: ''
                                })
                              }}
                              className="gap-2"
                            >
                              <Plus size={16} weight="bold" />
                              Tilføj fødselsdag
                            </Button>
                          )}
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="games" className="space-y-6">
            <Tabs defaultValue="neon-snake-scores" className="space-y-6">
              <TabsList className="grid w-full grid-cols-5 max-w-4xl">
                <TabsTrigger value="neon-snake-scores" className="gap-2">
                  <WaveSine size={18} />
                  Neon Snake
                </TabsTrigger>
                <TabsTrigger value="dodger-scores" className="gap-2">
                  <RocketLaunch size={18} />
                  Hønseinvasionen
                </TabsTrigger>
                <TabsTrigger value="brick-break-scores" className="gap-2">
                  <Cube size={18} />
                  Brick Break
                </TabsTrigger>
                <TabsTrigger value="nexiflyer-scores" className="gap-2">
                  <Bird size={18} />
                  Nexi Flyer
                </TabsTrigger>
                <TabsTrigger value="tetris-scores" className="gap-2">
                  <SquaresFour size={18} />
                  Tetris
                </TabsTrigger>
              </TabsList>

          <TabsContent value="neon-snake-scores" className="space-y-6">
            <GameLeaderboardAdmin
              gameTitle="Neon Snake"
              icon={<WaveSine size={28} className="text-primary" weight="duotone" />}
              leaderboardKey="neon-snake-global-leaderboard"
              playCountsKey="neon-snake-play-counts"
              users={users}
            />
          </TabsContent>

          <TabsContent value="dodger-scores" className="space-y-6">
            <GameLeaderboardAdmin
              gameTitle="Hønseinvasionen"
              icon={<RocketLaunch size={28} className="text-primary" weight="duotone" />}
              leaderboardKey="endless-dodger-global-leaderboard"
              playCountsKey="endless-dodger-play-counts"
              users={users}
            />
          </TabsContent>

          <TabsContent value="brick-break-scores" className="space-y-6">
            <GameLeaderboardAdmin
              gameTitle="Brick Break"
              icon={<Cube size={28} className="text-primary" weight="duotone" />}
              leaderboardKey="brickbreak-global-leaderboard"
              playCountsKey="brickbreak-play-counts"
              hasLevel
              users={users}
            />
          </TabsContent>

          <TabsContent value="nexiflyer-scores" className="space-y-6">
            <GameLeaderboardAdmin
              gameTitle="Nexi Flyer"
              icon={<Bird size={28} className="text-primary" weight="duotone" />}
              leaderboardKey="nexi-flyer-global-leaderboard"
              playCountsKey="nexi-flyer-play-counts"
              users={users}
            />
          </TabsContent>

          <TabsContent value="tetris-scores" className="space-y-6">
            <GameLeaderboardAdmin
              gameTitle="Tetris"
              icon={<SquaresFour size={28} className="text-primary" weight="duotone" />}
              leaderboardKey="tetris-global-leaderboard"
              playCountsKey="tetris-play-counts"
              categories={['all']}
              categorySettings={{ all: { label: 'Highscores', color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/30', statBg: 'bg-primary/10', statBorder: 'border-primary/20', statText: 'text-primary' } }}
              users={users}
            />
          </TabsContent>

            </Tabs>
          </TabsContent>

          <TabsContent value="data-storage" className="space-y-6">
            <UpdateManager userEmail={userEmail} />
            <ClientVersionManager managerEmail={userEmail} users={users} />
            <DataStorageManager />
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
              <DatePickerField
                value={editVacationStartDate ? format(editVacationStartDate, 'yyyy-MM-dd') : ''}
                onChange={(value) => setEditVacationStartDate(value ? new Date(value) : undefined)}
              />
            </div>
            <div className="space-y-2">
              <Label>Slutdato *</Label>
              <DatePickerField
                value={editVacationEndDate ? format(editVacationEndDate, 'yyyy-MM-dd') : ''}
                onChange={(value) => setEditVacationEndDate(value ? new Date(value) : undefined)}
                min={editVacationStartDate ? format(editVacationStartDate, 'yyyy-MM-dd') : undefined}
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rediger bruger</DialogTitle>
            <DialogDescription>
              Rediger information for brugeren {editingUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="user-name">Fulde navn *</Label>
              <Input
                id="user-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Indtast fuldt navn"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-email">Email *</Label>
              <Input
                id="user-email"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="f.eks. jacob@nexigroup.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-phone">Telefon nummer</Label>
              <div className="flex gap-2">
                <Phone size={20} className="text-muted-foreground mt-2.5" />
                <Input
                  id="user-phone"
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="f.eks. +45 12 34 56 78"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-username">Brugernavn (valgfri)</Label>
              <Input
                id="user-username"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="f.eks. jremmer"
              />
              <p className="text-xs text-muted-foreground">Kan bruges til at logge ind i stedet for email. Begge dele virker.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-password">Ny adgangskode (valgfri)</Label>
              <Input
                id="user-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Lad være tom for at beholde nuværende"
              />
              {newPassword && newPassword.length > 0 && newPassword.length < 6 && (
                <p className="text-xs text-destructive">Adgangskode skal være mindst 6 tegn</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsEditDialogOpen(false)
              setEditingUser(null)
              setNewName('')
              setNewEmail('')
              setNewPhone('')
              setNewUsername('')
              setNewPassword('')
            }}>
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
              return getISOWeekNumber(date)
            }

            const isDateInVacation = (day: number, vacation: VacationEntry, month: number, year: number) => {
              const checkDate = new Date(year, month, day)
              const start = parseLocalDate(vacation.startDate)
              const end = parseLocalDate(vacation.endDate)
              
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
              const start = parseLocalDate(v.startDate)
              const end = parseLocalDate(v.endDate)
              
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
                                          "text-[9px] leading-[1.6] px-1 py-0.5 rounded truncate font-medium",
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
                  className="gap-2 bg-gradient-to-r from-accent to-primary hover:from-accent/90 hover:to-primary/90"
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

      <ManualVacationGrant 
        open={isManualGrantDialogOpen}
        onOpenChange={setIsManualGrantDialogOpen}
        managerEmail={userEmail}
        onSuccess={loadVacationEntries}
      />

      <OnboardingWizard
        open={isOnboardingOpen}
        onOpenChange={setIsOnboardingOpen}
        onCompleted={() => {
          loadUsers()
          loadBirthdays()
        }}
      />

      <OffboardingWizard
        open={isOffboardingOpen}
        onOpenChange={setIsOffboardingOpen}
        currentUserEmail={userEmail}
        onCompleted={() => {
          loadUsers()
          loadBirthdays()
          loadVacationEntries()
        }}
      />

      <Dialog open={isEditBirthdayDialogOpen} onOpenChange={setIsEditBirthdayDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rediger fødselsdag</DialogTitle>
            <DialogDescription>
              Indtast fødselsdato for {editingBirthday?.fullName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="birthday-date">Fødselsdato *</Label>
              <DatePickerField
                id="birthday-date"
                value={birthdayDate && birthYear ? `${birthYear}-${birthdayDate}` : birthdayDate ? `2000-${birthdayDate}` : ''}
                enableYearDropdown
                onChange={(value) => {
                  if (value) {
                    const [year, month, day] = value.split('-')
                    setBirthdayDate(`${month}-${day}`)
                    setBirthYear(year)
                  } else {
                    setBirthdayDate('')
                    setBirthYear('')
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                Vælg den fulde fødselsdato inklusive år for at vise alderen på kalenderen
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsEditBirthdayDialogOpen(false)
              setEditingBirthday(null)
              setBirthdayDate('')
              setBirthYear('')
            }}>
              Annuller
            </Button>
            <Button onClick={handleSaveBirthday} className="gap-2">
              <Check size={18} weight="bold" />
              Gem fødselsdag
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
