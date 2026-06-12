import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import { Books, Users, Calendar, Gear, ChatCircle, FileText, Folder, FirstAidKit, Envelope, ClipboardText } from '@phosphor-icons/react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { UserProfile } from '@/components/UserProfile'
import { SickLeaveDialog } from '@/components/SickLeaveDialog'
import { SickLeaveManager } from '@/components/SickLeaveManager'
import { EmailNotifications } from '@/components/EmailNotifications'
import { cn } from '@/lib/utils'

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

export function Hub({ onNavigate, onLogout, userEmail }: HubProps) {
  const [isAdminOrManager, setIsAdminOrManager] = useState(false)
  const [showSickLeaveDialog, setShowSickLeaveDialog] = useState(false)
  const [showEmailNotifications, setShowEmailNotifications] = useState(false)
  const [unreadEmailCount, setUnreadEmailCount] = useState(0)
  
  useEffect(() => {
    const checkUserRole = async () => {
      const usersData = await window.spark.kv.get<Record<string, { email: string; password: string; fullName: string; role?: string; isManager?: boolean }>>('users')
      if (usersData && usersData[userEmail]) {
        const user = usersData[userEmail]
        const hasAdminRights = user.role === 'admin' || user.role === 'manager' || user.isManager
        setIsAdminOrManager(hasAdminRights || false)
      }
    }
    checkUserRole()
  }, [userEmail])

  useEffect(() => {
    const loadUnreadCount = async () => {
      const emailNotifications = await window.spark.kv.get<Array<{ read: boolean }>>('email-notifications') || []
      const unread = emailNotifications.filter(n => !n.read).length
      setUnreadEmailCount(unread)
    }
    loadUnreadCount()
    
    const interval = setInterval(loadUnreadCount, 5000)
    return () => clearInterval(interval)
  }, [])
  const modules: HubModule[] = [
    {
      id: 'shifts',
      title: 'Vagtplan',
      description: 'Administrer vagter og roller for teamet',
      icon: <ClipboardText size={48} weight="duotone" />,
      color: 'oklch(0.60 0.22 220)',
      gradient: 'from-[oklch(0.60_0.22_220)] via-[oklch(0.65_0.26_340)] to-[oklch(0.60_0.22_220)]',
      available: true,
    },
    {
      id: 'calendar',
      title: 'Feriekalender',
      description: 'Planlæg og koordiner teamets ferieperioder',
      icon: <Calendar size={48} weight="duotone" />,
      color: 'oklch(0.65 0.26 340)',
      gradient: 'from-[oklch(0.65_0.26_340)] via-[oklch(0.70_0.20_20)] to-[oklch(0.65_0.26_340)]',
      available: true,
    },
    ...(isAdminOrManager ? [{
      id: 'admin',
      title: 'Admin Panel',
      description: 'Administrer brugere, medarbejdere og opgaver',
      icon: <Gear size={48} weight="duotone" />,
      color: 'oklch(0.58 0.25 25)',
      gradient: 'from-[oklch(0.58_0.25_25)] via-[oklch(0.65_0.26_340)] to-[oklch(0.58_0.25_25)]',
      available: true,
    }] : []),
    {
      id: 'team',
      title: 'Team Oversigt',
      description: 'Kontaktoplysninger og teammedlemmer',
      icon: <Users size={48} weight="duotone" />,
      color: 'oklch(0.55 0.24 192)',
      gradient: 'from-[oklch(0.55_0.24_192)] via-[oklch(0.60_0.22_220)] to-[oklch(0.55_0.24_192)]',
      available: true,
    },
    {
      id: 'guides',
      title: 'Guide Bibliotek',
      description: 'Søg og administrer afdelingens guides og procedurer',
      icon: <Books size={48} weight="duotone" />,
      color: 'oklch(0.50 0.27 262)',
      gradient: 'from-[oklch(0.50_0.27_262)] via-[oklch(0.55_0.24_192)] to-[oklch(0.50_0.27_262)]',
      available: true,
    },
    {
      id: 'documents',
      title: 'Dokumenter',
      description: 'Fælles dokumenter og filer',
      icon: <FileText size={48} weight="duotone" />,
      color: 'oklch(0.62 0.20 150)',
      gradient: 'from-[oklch(0.62_0.20_150)] via-[oklch(0.55_0.24_192)] to-[oklch(0.62_0.20_150)]',
      available: false,
    },
    {
      id: 'projects',
      title: 'Projekter',
      description: 'Projektadministration og opgaver',
      icon: <Folder size={48} weight="duotone" />,
      color: 'oklch(0.75 0.15 60)',
      gradient: 'from-[oklch(0.75_0.15_60)] via-[oklch(0.70_0.18_90)] to-[oklch(0.75_0.15_60)]',
      available: false,
    },
    {
      id: 'chat',
      title: 'Team Chat',
      description: 'Intern kommunikation og beskeder',
      icon: <ChatCircle size={48} weight="duotone" />,
      color: 'oklch(0.58 0.25 25)',
      gradient: 'from-[oklch(0.58_0.25_25)] via-[oklch(0.65_0.26_340)] to-[oklch(0.58_0.25_25)]',
      available: false,
    },
  ]

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(0.55_0.22_265/0.15),transparent_50%),radial-gradient(ellipse_at_bottom_right,oklch(0.65_0.26_340/0.12),transparent_50%),radial-gradient(ellipse_at_bottom_left,oklch(0.55_0.24_192/0.10),transparent_50%)] pointer-events-none" />
      <div className="absolute inset-0" style={{
        backgroundImage: `repeating-linear-gradient(90deg, oklch(0.55 0.22 265 / 0.02) 0px, transparent 1px, transparent 100px, oklch(0.55 0.22 265 / 0.02) 101px),
                         repeating-linear-gradient(0deg, oklch(0.55 0.22 265 / 0.02) 0px, transparent 1px, transparent 100px, oklch(0.55 0.22 265 / 0.02) 101px)`
      }} />
      <div className="absolute top-6 right-6 z-20 flex items-center gap-4">
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
              className="bg-background/80 backdrop-blur-sm hover:bg-background shadow-lg hover:shadow-xl transition-all duration-300 gap-2 font-semibold relative"
            >
              <Envelope size={24} weight="duotone" />
              Email Notifikationer
              {unreadEmailCount > 0 && (
                <Badge className="absolute -top-2 -right-2 bg-[oklch(0.58_0.25_25)] text-white px-2 py-0.5 text-xs">
                  {unreadEmailCount}
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
            className="bg-gradient-to-r from-[oklch(0.58_0.25_25)] to-[oklch(0.65_0.26_340)] hover:from-[oklch(0.55_0.25_25)] hover:to-[oklch(0.62_0.26_340)] text-white shadow-lg hover:shadow-xl transition-all duration-300 gap-2 font-semibold"
          >
            <FirstAidKit size={24} weight="duotone" />
            Sygemelding
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
              const emailNotifications = await window.spark.kv.get<Array<{ read: boolean }>>('email-notifications') || []
              const unread = emailNotifications.filter(n => !n.read).length
              setUnreadEmailCount(unread)
            }
            loadUnreadCount()
          }
        }}
      />
      <div className="container mx-auto px-4 sm:px-6 py-12 sm:py-20 max-w-7xl relative z-10">
        <motion.header 
          className="text-center mb-16"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.div 
            className="inline-flex items-center justify-center mb-6"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5, type: "spring", stiffness: 200 }}
          >
            <div className="relative">
              <div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-primary via-secondary to-accent shadow-2xl shadow-primary/30 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/40 via-transparent to-accent/40 animate-pulse" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,white,transparent)] opacity-20" />
                <Books size={48} weight="duotone" className="text-primary-foreground relative z-10" />
              </div>
              <motion.div
                className="absolute -inset-2 rounded-3xl bg-gradient-to-br from-primary/20 via-secondary/20 to-accent/20 blur-xl -z-10"
                animate={{
                  scale: [1, 1.1, 1],
                  opacity: [0.5, 0.7, 0.5],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            </div>
          </motion.div>

          <motion.h1 
            className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight bg-gradient-to-br from-primary via-secondary to-accent bg-clip-text text-transparent mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >Terminal Configuration & Dispatch Hub</motion.h1>
          
          <motion.p 
            className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >Samlet platform for guides, ressourcer og teamværktøjer</motion.p>
        </motion.header>

        <motion.div 
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          {modules.map((module, index) => (
            <motion.div
              key={module.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + index * 0.05, duration: 0.4 }}
            >
              <Card
                className={cn(
                  "relative overflow-hidden border-2 transition-all duration-300 group",
                  module.available 
                    ? "cursor-pointer hover:shadow-2xl hover:scale-[1.02] hover:border-primary/40 active:scale-[0.98]" 
                    : "opacity-60 cursor-not-allowed"
                )}
                onClick={() => module.available && onNavigate(module.id)}
              >
                <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{
                    background: `radial-gradient(circle at top right, ${module.color}15, transparent)`
                  }}
                />
                
                <div className="relative p-8">
                  <motion.div 
                    className={cn(
                      "mb-6 inline-flex items-center justify-center rounded-2xl p-4 shadow-lg transition-all duration-300",
                      module.available 
                        ? `bg-gradient-to-br ${module.gradient} group-hover:scale-110 group-hover:shadow-xl`
                        : "bg-muted"
                    )}
                    style={module.available ? { color: 'white' } : {}}
                  >
                    {module.icon}
                  </motion.div>

                  <h3 className="text-2xl font-bold mb-3 text-foreground">
                    {module.title}
                  </h3>
                  
                  <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                    {module.description}
                  </p>

                  {!module.available && (
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted text-muted-foreground text-xs font-semibold">
                      Kommer snart
                    </div>
                  )}

                  {module.available && (
                    <div className={cn(
                      "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold text-white transition-all duration-300 opacity-0 group-hover:opacity-100",
                      `bg-gradient-to-r ${module.gradient}`
                    )}>
                      Åbn modul →
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          className="mt-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.6 }}
        >
          <SickLeaveManager userEmail={userEmail} />
        </motion.div>
      </div>
    </div>
  );
}
