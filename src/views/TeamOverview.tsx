import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, UserCircle, EnvelopeSimple, Crown, ShieldCheck, Phone } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { UserProfile } from '@/components/UserProfile'
import { UserRole, getRoleDisplayName } from '@/lib/userRoles'
import { getEmployeeColorByEmail } from '@/lib/employeeColors'

export interface TeamEmployee {
  id: string
  name: string
  email: string
  phone: string
  role?: UserRole
}

interface TeamOverviewProps {
  onNavigateBack: () => void
  onLogout: () => void
}

export function TeamOverview({ onNavigateBack, onLogout }: TeamOverviewProps) {
  const [employees, setEmployees] = useState<TeamEmployee[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadRegisteredUsers()
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

  const loadRegisteredUsers = async () => {
    setIsLoading(true)
    const usersData = await window.spark.kv.get<Record<string, { email: string; password: string; fullName: string; role?: UserRole; isManager?: boolean; phone?: string }>>('users')
    
    if (usersData && typeof usersData === 'object' && !Array.isArray(usersData)) {
      const userList: TeamEmployee[] = Object.values(usersData).map(user => {
        return {
          id: user.email,
          name: user.fullName,
          email: user.email,
          phone: user.phone || '',
          role: user.role || 'user'
        }
      }).sort((a, b) => a.name.localeCompare(b.name))
      setEmployees(userList)
    } else {
      setEmployees([])
    }
    setIsLoading(false)
  }

  const getRoleBadge = (role?: UserRole) => {
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
            <UserCircle size={14} className="mr-1" />
            Bruger
          </Badge>
        )
    }
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
      
      <div className="container mx-auto px-4 sm:px-6 pt-56 sm:pt-60 pb-12 sm:pb-20 max-w-7xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-6 mb-8">
            <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-br from-primary via-secondary to-accent bg-clip-text text-transparent">
              Team Oversigt
            </h1>
          </div>
        </motion.div>

        <Card className="p-6 border-2">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <UserCircle size={28} className="text-primary" weight="duotone" />
              <h2 className="text-2xl font-bold">Registrerede Brugere</h2>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-sm">
                {employees.length} {employees.length === 1 ? 'Bruger' : 'Brugere'}
              </Badge>
            </div>
          </div>

          <div className="mb-4 p-4 bg-muted/50 rounded-lg border">
            <p className="text-sm text-muted-foreground">
              Dette er en oversigt over alle brugere der har oprettet en konto og logget ind på hjemmesiden. Brugere oprettes via login-systemet.
            </p>
          </div>

          {isLoading ? (
            <div className="text-center py-12">
              <UserCircle size={48} className="text-muted-foreground mx-auto mb-4 animate-pulse" weight="duotone" />
              <p className="text-muted-foreground">Indlæser brugere...</p>
            </div>
          ) : !employees.length ? (
            <div className="text-center py-12">
              <UserCircle size={48} className="text-muted-foreground mx-auto mb-4" weight="duotone" />
              <p className="text-muted-foreground">Ingen registrerede brugere endnu</p>
              <p className="text-sm text-muted-foreground mt-2">Brugere vil blive vist her når de opretter en konto</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {employees.map((employee) => {
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
                        {getRoleBadge(employee.role)}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <EnvelopeSimple size={16} className="flex-shrink-0" />
                        <a 
                          href={`mailto:${employee.email}`}
                          className="hover:text-primary transition-colors truncate"
                        >
                          {employee.email}
                        </a>
                      </div>
                      {employee.phone && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone size={16} className="flex-shrink-0" />
                          <a 
                            href={`tel:${employee.phone}`}
                            className="hover:text-primary transition-colors"
                          >
                            {employee.phone}
                          </a>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
