import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, UserGear, Check } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { UserProfile } from '@/components/UserProfile'
import { toast } from 'sonner'

interface User {
  email: string
  fullName: string
  isManager: boolean
}

interface AdminPanelProps {
  onNavigateBack: () => void
  onLogout: () => void
  userEmail: string
}

export function AdminPanel({ onNavigateBack, onLogout, userEmail }: AdminPanelProps) {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    setIsLoading(true)
    const usersData = await spark.kv.get<Record<string, { email: string; password: string; fullName: string; isManager: boolean }>>('users')
    if (usersData) {
      const userList = Object.values(usersData).map(u => ({
        email: u.email,
        fullName: u.fullName,
        isManager: u.isManager || false
      }))
      setUsers(userList)
    }
    setIsLoading(false)
  }

  const toggleManagerStatus = async (email: string) => {
    const usersData = await spark.kv.get<Record<string, { email: string; password: string; fullName: string; isManager: boolean }>>('users')
    if (usersData && usersData[email]) {
      usersData[email].isManager = !usersData[email].isManager
      await spark.kv.set('users', usersData)
      await loadUsers()
      toast.success(usersData[email].isManager ? 'Bruger forfremmet til manager' : 'Manager rettigheder fjernet')
    }
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

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-4xl relative z-10">
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
        >
          <Card className="p-6 border-2">
            <div className="flex items-center gap-2 mb-6">
              <UserGear size={24} className="text-primary" />
              <h2 className="text-2xl font-bold">Manager Rettigheder</h2>
            </div>

            {isLoading ? (
              <p className="text-muted-foreground text-center py-8">Indlæser brugere...</p>
            ) : users.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">Ingen brugere fundet</p>
            ) : (
              <div className="space-y-3">
                {users.map((user) => (
                  <motion.div
                    key={user.email}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold">
                        {user.fullName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold">{user.fullName}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      </div>
                      {user.isManager && (
                        <Badge className="bg-gradient-to-r from-primary to-secondary text-white">
                          <Check size={14} className="mr-1" />
                          Manager
                        </Badge>
                      )}
                    </div>
                    <div className="ml-4">
                      <Switch
                        checked={user.isManager}
                        onCheckedChange={() => toggleManagerStatus(user.email)}
                        disabled={user.email === userEmail}
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            <div className="mt-6 p-4 rounded-lg bg-muted/50 border">
              <p className="text-sm text-muted-foreground">
                <strong>Info:</strong> Managers kan godkende og afvise ferieansøgninger fra andre brugere. 
                Du kan ikke ændre dine egne rettigheder.
              </p>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
