import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, UserGear, Check, Crown, ShieldCheck, User as UserIcon, Trash, FirstAidKit, Plus, Tag, UserCircle, PencilSimple } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { UserProfile } from '@/components/UserProfile'
import { toast } from 'sonner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { format } from 'date-fns'
import { da } from 'date-fns/locale'
import { UserRole, ADMIN_EMAIL, hasAdminAccess, getRoleDisplayName, getRoleDescription } from '@/lib/userRoles'

interface User {
  email: string
  fullName: string
  role: UserRole
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

interface ShiftRole {
  id: string
  name: string
  color: string
}

interface AdminPanelProps {
  onNavigateBack: () => void
  onLogout: () => void
}

export function AdminPanel({ onNavigateBack, onLogout }: AdminPanelProps) {
  const [users, setUsers] = useState<User[]>([])
  const [sickLeaveEntries, setSickLeaveEntries] = useState<SickLeaveEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [userEmail, setUserEmail] = useState<string>('')

  const [shiftRoles, setShiftRoles] = useState<ShiftRole[]>([])
  const [showRoleDialog, setShowRoleDialog] = useState(false)
  const [newRoleName, setNewRoleName] = useState('')
  const [newRoleColor, setNewRoleColor] = useState('#8b5cf6')

  const [showEmployeeDialog, setShowEmployeeDialog] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<User | null>(null)
  const [employeeForm, setEmployeeForm] = useState({
    email: '',
    fullName: '',
    password: '',
    role: 'user' as UserRole
  })

  useEffect(() => {
    const loadUserAndCheckAdmin = async () => {
      const session = await window.spark.kv.get<{ userId: string; email: string }>('user-session')
      if (session) {
        setUserEmail(session.email)
        
        const hasAccess = await hasAdminAccess(session.email)
        setIsAdmin(hasAccess)
        if (hasAccess) {
          loadUsers()
          loadSickLeaveEntries()
          loadShiftRoles()
        }
      }
    }
    loadUserAndCheckAdmin()
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
    setSickLeaveEntries(entries.sort((a, b) => 
      new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    ))
  }

  const loadShiftRoles = async () => {
    const roles = await window.spark.kv.get<ShiftRole[]>('shift-roles') || []
    setShiftRoles(roles)
  }

  const handleAddRole = async () => {
    if (!newRoleName.trim()) {
      toast.error('Indtast et rolle navn')
      return
    }

    const newRole: ShiftRole = {
      id: Date.now().toString(),
      name: newRoleName.trim(),
      color: newRoleColor
    }

    const updatedRoles = [...shiftRoles, newRole]
    await window.spark.kv.set('shift-roles', updatedRoles)
    setShiftRoles(updatedRoles)
    setNewRoleName('')
    setNewRoleColor('#8b5cf6')
    setShowRoleDialog(false)
    toast.success('Opgave tilføjet')
  }

  const handleDeleteRole = async (roleId: string) => {
    const updatedRoles = shiftRoles.filter(r => r.id !== roleId)
    await window.spark.kv.set('shift-roles', updatedRoles)
    setShiftRoles(updatedRoles)
    
    const assignments = await window.spark.kv.get<any[]>('shift-assignments') || []
    const updatedAssignments = assignments.filter(a => a.roleId !== roleId)
    await window.spark.kv.set('shift-assignments', updatedAssignments)
    
    toast.success('Opgave slettet')
  }

  const openEmployeeDialog = (employee?: User) => {
    if (employee) {
      setEditingEmployee(employee)
      setEmployeeForm({
        email: employee.email,
        fullName: employee.fullName,
        password: '',
        role: employee.role
      })
    } else {
      setEditingEmployee(null)
      setEmployeeForm({
        email: '',
        fullName: '',
        password: '',
        role: 'user'
      })
    }
    setShowEmployeeDialog(true)
  }

  const handleSaveEmployee = async () => {
    if (!employeeForm.email.trim() || !employeeForm.fullName.trim()) {
      toast.error('Email og navn er påkrævet')
      return
    }

    if (!editingEmployee && !employeeForm.password.trim()) {
      toast.error('Kodeord er påkrævet for nye medarbejdere')
      return
    }

    const usersData = await window.spark.kv.get<Record<string, { email: string; password: string; fullName: string; role: UserRole; isManager: boolean }>>('users') || {}

    if (!editingEmployee && usersData[employeeForm.email]) {
      toast.error('En bruger med denne email eksisterer allerede')
      return
    }

    if (editingEmployee && editingEmployee.email !== employeeForm.email && usersData[employeeForm.email]) {
      toast.error('En bruger med denne email eksisterer allerede')
      return
    }

    if (editingEmployee && editingEmployee.email !== employeeForm.email) {
      delete usersData[editingEmployee.email]
    }

    usersData[employeeForm.email] = {
      email: employeeForm.email,
      password: employeeForm.password.trim() || usersData[employeeForm.email]?.password || '',
      fullName: employeeForm.fullName,
      role: employeeForm.role,
      isManager: employeeForm.role === 'manager' || employeeForm.role === 'admin'
    }

    await window.spark.kv.set('users', usersData)
    await loadUsers()
    setShowEmployeeDialog(false)
    toast.success(editingEmployee ? 'Medarbejder opdateret' : 'Medarbejder oprettet')
  }

  const handleDeleteEmployee = async (email: string) => {
    if (email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      toast.error('Kan ikke slette admin brugeren')
      return
    }

    const usersData = await window.spark.kv.get<Record<string, { email: string; password: string; fullName: string; role: UserRole; isManager: boolean }>>('users')
    if (usersData && usersData[email]) {
      delete usersData[email]
      await window.spark.kv.set('users', usersData)
      await loadUsers()
      toast.success('Medarbejder slettet')
    }
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

  if (!isAdmin) {
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
            <p className="text-muted-foreground">Du har ikke administratorrettigheder til denne side.</p>
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
          <div className="flex items-center gap-3">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <UserProfile userEmail="" onLogout={onLogout} />
            </motion.div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-12 sm:pb-20 max-w-5xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <div className="flex items-center gap-6">
            <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-br from-primary via-secondary to-accent bg-clip-text text-transparent">
              Admin Panel
            </h1>
          </div>
        </motion.div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-2xl">
            <TabsTrigger value="users" className="gap-2">
              <UserGear size={18} />
              Brugere
            </TabsTrigger>
            <TabsTrigger value="shift-management" className="gap-2">
              <UserIcon size={18} />
              Medarbejdere & Opgaver
            </TabsTrigger>
            <TabsTrigger value="sick-leave" className="gap-2">
              <FirstAidKit size={18} />
              Sygemeldinger
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-6">
            <Card className="p-6 border-2">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <UserGear size={28} className="text-primary" weight="duotone" />
                  <h2 className="text-2xl font-bold">Brugeroversigt</h2>
                </div>
                <Badge variant="outline" className="text-sm">
                  {users.length} {users.length === 1 ? 'Bruger' : 'Brugere'}
                </Badge>
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
                  Sygemeldinger sendes automatisk til Jacob.remmer@nexigroup.com når de indsendes. Ingen godkendelse påkrævet.
                </p>
              </div>

              {sickLeaveEntries.length === 0 ? (
                <p className="text-muted-foreground text-center py-12">Ingen sygemeldinger</p>
              ) : (
                <div className="space-y-3">
                  {sickLeaveEntries.map((entry) => (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-between p-5 rounded-xl border-2 bg-card hover:shadow-md transition-all"
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
                              {format(new Date(entry.startDate), 'd. MMM', { locale: da })} - {format(new Date(entry.endDate), 'd. MMM yyyy', { locale: da })}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Indsendt: {format(new Date(entry.submittedAt), 'd. MMM yyyy HH:mm', { locale: da })}
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
                    </motion.div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="shift-management" className="space-y-6">
            <Card className="p-6 border-2">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <UserCircle size={28} className="text-primary" weight="duotone" />
                  <h2 className="text-2xl font-bold">Medarbejdere</h2>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-sm">
                    {users.length} {users.length === 1 ? 'Medarbejder' : 'Medarbejdere'}
                  </Badge>
                  <Button
                    onClick={() => openEmployeeDialog()}
                    size="sm"
                    className="gap-2 bg-gradient-to-r from-primary to-secondary"
                  >
                    <Plus size={16} />
                    Tilføj Medarbejder
                  </Button>
                </div>
              </div>

              {isLoading ? (
                <p className="text-muted-foreground text-center py-12">Indlæser medarbejdere...</p>
              ) : users.length === 0 ? (
                <div className="text-center py-12">
                  <UserCircle size={48} className="text-muted-foreground mx-auto mb-4" weight="duotone" />
                  <p className="text-muted-foreground mb-4">Ingen medarbejdere endnu</p>
                  <Button
                    onClick={() => openEmployeeDialog()}
                    className="gap-2"
                  >
                    <Plus size={20} />
                    Tilføj Din Første Medarbejder
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {users.map((user) => (
                    <motion.div
                      key={user.email}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-4 rounded-xl border-2 bg-card hover:shadow-md transition-all group relative"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold shadow-md ${
                          user.role === 'admin' 
                            ? 'bg-gradient-to-br from-accent via-primary to-secondary' 
                            : user.role === 'manager'
                            ? 'bg-gradient-to-br from-primary to-secondary'
                            : 'bg-gradient-to-br from-secondary to-accent'
                        }`}>
                          {user.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold truncate">{user.fullName}</div>
                          <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        {getRoleBadge(user.role)}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-primary/10"
                            onClick={() => openEmployeeDialog(user)}
                          >
                            <PencilSimple size={16} />
                          </Button>
                          {user.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase() && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                  <Trash size={16} />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Slet medarbejder?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Er du sikker på at du vil slette <strong>{user.fullName}</strong>? Denne handling kan ikke fortrydes.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annuller</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteEmployee(user.email)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Slet medarbejder
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-6 border-2">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Tag size={28} className="text-secondary" weight="duotone" />
                  <h2 className="text-2xl font-bold">Opgaver / Roller</h2>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-sm">
                    {shiftRoles.length} {shiftRoles.length === 1 ? 'Opgave' : 'Opgaver'}
                  </Badge>
                  <Button
                    onClick={() => setShowRoleDialog(true)}
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
                  Disse opgaver/roller kan tildeles medarbejdere i vagtplanen.
                </p>
              </div>

              {shiftRoles.length === 0 ? (
                <div className="text-center py-12">
                  <Tag size={48} className="text-muted-foreground mx-auto mb-4" weight="duotone" />
                  <p className="text-muted-foreground mb-4">Ingen opgaver endnu</p>
                  <Button
                    onClick={() => setShowRoleDialog(true)}
                    className="gap-2"
                  >
                    <Plus size={20} />
                    Tilføj Din Første Opgave
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {shiftRoles.map((role) => (
                    <motion.div
                      key={role.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center justify-between p-4 rounded-xl border-2 bg-card hover:shadow-md transition-all group"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md"
                          style={{ 
                            backgroundColor: `${role.color}30`,
                            border: `2px solid ${role.color}`
                          }}
                        >
                          <Tag size={24} style={{ color: role.color }} weight="duotone" />
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-lg">{role.name}</div>
                          <div className="text-sm text-muted-foreground">
                            Farve: <span className="font-mono">{role.color}</span>
                          </div>
                        </div>
                        <div
                          className="px-4 py-2 rounded-lg font-semibold"
                          style={{ 
                            backgroundColor: `${role.color}20`,
                            color: role.color,
                            border: `2px solid ${role.color}`
                          }}
                        >
                          Eksempel
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
                    </motion.div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tilføj Ny Opgave / Rolle</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label htmlFor="role-name">Opgave Navn</Label>
                <Input
                  id="role-name"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value)}
                  placeholder="F.eks. Supervisor, Tekniker, Support"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddRole()}
                />
              </div>
              <div>
                <Label htmlFor="role-color">Farve</Label>
                <div className="flex gap-2">
                  <Input
                    id="role-color"
                    type="color"
                    value={newRoleColor}
                    onChange={(e) => setNewRoleColor(e.target.value)}
                    className="w-20 h-10"
                  />
                  <Input
                    value={newRoleColor}
                    onChange={(e) => setNewRoleColor(e.target.value)}
                    className="flex-1 font-mono"
                  />
                </div>
              </div>
              <Button onClick={handleAddRole} className="w-full gap-2">
                <Plus size={20} />
                Opret Opgave
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showEmployeeDialog} onOpenChange={setShowEmployeeDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingEmployee ? 'Rediger Medarbejder' : 'Tilføj Ny Medarbejder'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label htmlFor="employee-name">Fulde Navn</Label>
                <Input
                  id="employee-name"
                  value={employeeForm.fullName}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, fullName: e.target.value })}
                  placeholder="F.eks. John Doe"
                />
              </div>
              <div>
                <Label htmlFor="employee-email">Email</Label>
                <Input
                  id="employee-email"
                  type="email"
                  value={employeeForm.email}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, email: e.target.value })}
                  placeholder="john.doe@nexigroup.com"
                  disabled={!!editingEmployee}
                />
                {editingEmployee && (
                  <p className="text-xs text-muted-foreground mt-1">Email kan ikke ændres efter oprettelse</p>
                )}
              </div>
              <div>
                <Label htmlFor="employee-password">Kodeord {editingEmployee && '(lad stå tom for at beholde nuværende)'}</Label>
                <Input
                  id="employee-password"
                  type="password"
                  value={employeeForm.password}
                  onChange={(e) => setEmployeeForm({ ...employeeForm, password: e.target.value })}
                  placeholder={editingEmployee ? 'Lad tom for at beholde' : 'Indtast kodeord'}
                />
              </div>
              <div>
                <Label htmlFor="employee-role">Rolle</Label>
                <Select
                  value={employeeForm.role}
                  onValueChange={(value) => setEmployeeForm({ ...employeeForm, role: value as UserRole })}
                >
                  <SelectTrigger id="employee-role">
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
              </div>
              <Button onClick={handleSaveEmployee} className="w-full gap-2">
                {editingEmployee ? (
                  <>
                    <PencilSimple size={20} />
                    Gem Ændringer
                  </>
                ) : (
                  <>
                    <Plus size={20} />
                    Opret Medarbejder
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
