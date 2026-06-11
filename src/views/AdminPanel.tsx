import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, UserGear, Check, Crown, ShieldCheck, User as UserIcon, Trash } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { UserProfile } from '@/components/UserProfile'
import { toast } from 'sonner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'

type UserRole = 'admin' | 'manager' | 'user'

interface User {
  email: string
  fullName: string
  role: UserRole
}

interface AdminPanelProps {
  onNavigateBack: () => void
  onLogout: () => void
  userEmail: string
}

const ADMIN_EMAIL = 'jacob.remmer@nexigroup.com'

export function AdminPanel({ onNavigateBack, onLogout, userEmail }: AdminPanelProps) {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const isAdmin = userEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase()

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    setIsLoading(true)
    const usersData = await spark.kv.get<Record<string, { email: string; password: string; fullName: string; role?: UserRole; isManager?: boolean }>>('users')
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

  const changeUserRole = async (email: string, newRole: UserRole) => {
    if (email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      toast.error('Kan ikke ændre admin brugerens rettigheder')
      return
    }

    const usersData = await spark.kv.get<Record<string, { email: string; password: string; fullName: string; role: UserRole; isManager: boolean }>>('users')
    if (usersData && usersData[email]) {
      usersData[email].role = newRole
      usersData[email].isManager = newRole === 'manager' || newRole === 'admin'
      await spark.kv.set('users', usersData)
      await loadUsers()
      
      const roleNames = { admin: 'Administrator', manager: 'Manager', user: 'Bruger' }
      toast.success(`Bruger ændret til ${roleNames[newRole]}`)
    }
  }

  const deleteUser = async (email: string) => {
    if (email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      toast.error('Kan ikke slette admin brugeren')
      return
    }

    const usersData = await spark.kv.get<Record<string, { email: string; password: string; fullName: string; role: UserRole; isManager: boolean }>>('users')
    if (usersData && usersData[email]) {
      delete usersData[email]
      await spark.kv.set('users', usersData)
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

  const getRoleDescription = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'Fuld adgang til alle funktioner, kan administrere brugere og rettigheder'
      case 'manager':
        return 'Kan godkende/afvise ferieansøgninger og redigere guides'
      case 'user':
        return 'Standard brugeradgang, kan se guides og anmode om ferie'
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
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(0.55_0.22_265/0.15),transparent_50%),radial-gradient(ellipse_at_bottom_right,oklch(0.65_0.26_340/0.12),transparent_50%),radial-gradient(ellipse_at_bottom_left,oklch(0.55_0.24_192/0.10),transparent_50%)] pointer-events-none" />
      <div className="absolute inset-0" style={{
        backgroundImage: `repeating-linear-gradient(90deg, oklch(0.55 0.22 265 / 0.02) 0px, transparent 1px, transparent 100px, oklch(0.55 0.22 265 / 0.02) 101px),
                         repeating-linear-gradient(0deg, oklch(0.55 0.22 265 / 0.02) 0px, transparent 1px, transparent 100px, oklch(0.55 0.22 265 / 0.02) 101px)`
      }} />

      <div className="absolute top-4 right-4 z-20">
        <UserProfile userEmail={userEmail} onLogout={onLogout} />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-5xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={onNavigateBack}
              className="hover:bg-primary/10"
            >
              <ArrowLeft size={24} />
            </Button>
            <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-br from-primary via-secondary to-accent bg-clip-text text-transparent">
              Bruger Administration
            </h1>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="space-y-6"
        >
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
        </motion.div>
      </div>
    </div>
  )
}
