import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import { Books, Users, Calendar, Gear, ChatCircle, FileText, Folder, FirstAidKit, Envelope, ClipboardText, ShieldCheck, ForkKnife } from '@phosphor-icons/react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { UserProfile } from '@/components/UserProfile'
import { SickLeaveDialog } from '@/components/SickLeaveDialog'
import { EmailNotifications } from '@/components/EmailNotifications'
import { LanguageToggle } from '@/components/LanguageToggle'
import { ThemeToggle } from '@/components/ThemeToggle'
import { cn } from '@/lib/utils'
import { hasManagerAccess } from '@/lib/userRoles'
import { useLanguage } from '@/contexts/LanguageContext'

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
  const { t } = useLanguage()
  const [isAdminOrManager, setIsAdminOrManager] = useState(false)
  const [showSickLeaveDialog, setShowSickLeaveDialog] = useState(false)
  const [showEmailNotifications, setShowEmailNotifications] = useState(false)
  const [unreadInboxCount, setUnreadInboxCount] = useState(0)
  
  useEffect(() => {
    const checkUserRole = async () => {
      const access = await hasManagerAccess(userEmail)
      setIsAdminOrManager(access)
    }
    checkUserRole()
  }, [userEmail])

  useEffect(() => {
    const loadUnreadCount = async () => {
      const emails = (await window.spark.kv.get<Array<{ to: string; read: boolean }>>('emails')) || []
      const unreadInbox = emails.filter(e => e.to === userEmail && !e.read).length
      setUnreadInboxCount(unreadInbox)
    }
    loadUnreadCount()
    
    const interval = setInterval(loadUnreadCount, 5000)
    return () => clearInterval(interval)
  }, [userEmail])

  const handleModuleClick = (moduleId: string) => {
    if (moduleId === 'manager' && !isAdminOrManager) {
      return
    }
    onNavigate(moduleId)
  }

  const modules: HubModule[] = [
    {
      id: 'shifts',
      title: t.hub.modules.shifts,
      description: t.hub.descriptions.shifts,
      icon: <ClipboardText size={48} weight="duotone" />,
      color: 'oklch(0.60 0.22 220)',
      gradient: 'from-[oklch(0.60_0.22_220)] via-[oklch(0.65_0.26_340)] to-[oklch(0.60_0.22_220)]',
      available: true,
    },
    {
      id: 'calendar',
      title: t.hub.modules.calendar,
      description: t.hub.descriptions.calendar,
      icon: <Calendar size={48} weight="duotone" />,
      color: 'oklch(0.65 0.26 340)',
      gradient: 'from-[oklch(0.65_0.26_340)] via-[oklch(0.70_0.20_20)] to-[oklch(0.65_0.26_340)]',
      available: true,
    },
    {
      id: 'meals',
      title: t.hub.modules.meals,
      description: t.hub.descriptions.meals,
      icon: <ForkKnife size={48} weight="duotone" />,
      color: 'oklch(0.70 0.18 90)',
      gradient: 'from-[oklch(0.70_0.18_90)] via-[oklch(0.75_0.15_60)] to-[oklch(0.70_0.18_90)]',
      available: true,
    },
    {
      id: 'team',
      title: t.hub.modules.team,
      description: t.hub.descriptions.team,
      icon: <Users size={48} weight="duotone" />,
      color: 'oklch(0.55 0.24 192)',
      gradient: 'from-[oklch(0.55_0.24_192)] via-[oklch(0.60_0.22_220)] to-[oklch(0.55_0.24_192)]',
      available: true,
    },
    {
      id: 'email',
      title: t.hub.modules.email,
      description: t.hub.descriptions.email,
      icon: <Envelope size={48} weight="duotone" />,
      color: 'oklch(0.68 0.14 340)',
      gradient: 'from-[oklch(0.68_0.14_340)] via-[oklch(0.75_0.12_180)] to-[oklch(0.68_0.14_340)]',
      available: true,
    },
    {
      id: 'guides',
      title: t.hub.modules.guides,
      description: t.hub.descriptions.guides,
      icon: <Books size={48} weight="duotone" />,
      color: 'oklch(0.50 0.27 262)',
      gradient: 'from-[oklch(0.50_0.27_262)] via-[oklch(0.55_0.24_192)] to-[oklch(0.50_0.27_262)]',
      available: true,
    },
    {
      id: 'documents',
      title: t.hub.modules.documents,
      description: t.hub.descriptions.documents,
      icon: <FileText size={48} weight="duotone" />,
      color: 'oklch(0.62 0.20 150)',
      gradient: 'from-[oklch(0.62_0.20_150)] via-[oklch(0.55_0.24_192)] to-[oklch(0.62_0.20_150)]',
      available: false,
    },
    {
      id: 'projects',
      title: t.hub.modules.projects,
      description: t.hub.descriptions.projects,
      icon: <Folder size={48} weight="duotone" />,
      color: 'oklch(0.75 0.15 60)',
      gradient: 'from-[oklch(0.75_0.15_60)] via-[oklch(0.70_0.18_90)] to-[oklch(0.75_0.15_60)]',
      available: false,
    },
    {
      id: 'chat',
      title: t.hub.modules.chat,
      description: t.hub.descriptions.chat,
      icon: <ChatCircle size={48} weight="duotone" />,
      color: 'oklch(0.58 0.25 25)',
      gradient: 'from-[oklch(0.58_0.25_25)] via-[oklch(0.65_0.26_340)] to-[oklch(0.58_0.25_25)]',
      available: false,
    },
    {
      id: 'manager',
      title: t.hub.modules.manager,
      description: isAdminOrManager ? t.hub.descriptions.manager : t.hub.descriptions.managerLocked,
      icon: <ShieldCheck size={48} weight="duotone" />,
      color: 'oklch(0.58 0.25 25)',
      gradient: 'from-[oklch(0.58_0.25_25)] via-[oklch(0.65_0.26_340)] to-[oklch(0.58_0.25_25)]',
      available: isAdminOrManager,
    },
  ]

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute top-8 right-6 left-6 z-20 flex flex-wrap items-center justify-end gap-4 pb-6">
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
              className="bg-background/80 backdrop-blur-sm hover:bg-background shadow-lg hover:shadow-xl transition-all duration-300 gap-2 font-semibold relative px-4"
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
            className="bg-gradient-to-r from-[oklch(0.58_0.25_25)] to-[oklch(0.65_0.26_340)] hover:from-[oklch(0.55_0.25_25)] hover:to-[oklch(0.62_0.26_340)] text-white shadow-lg hover:shadow-xl transition-all duration-300 gap-2 font-semibold"
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
              const emails = (await window.spark.kv.get<Array<{ to: string; read: boolean }>>('emails')) || []
              const unreadInbox = emails.filter(e => e.to === userEmail && !e.read).length
              setUnreadInboxCount(unreadInbox)
            }
            loadUnreadCount()
          }
        }}
        userEmail={userEmail}
      />
      <div className="container mx-auto px-4 sm:px-6 pt-96 sm:pt-[26rem] pb-12 sm:pb-20 max-w-7xl relative z-10">
        <motion.header 
          className="text-center mb-16 sm:mb-20"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.h1 
            className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight bg-gradient-to-br from-primary via-secondary to-accent bg-clip-text text-transparent mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >Terminal Configuration & Dispatch Hub</motion.h1>
        </motion.header>

        <motion.div 
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          {modules.filter(module => module.available).map((module, index) => (
            <motion.div
              key={module.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + index * 0.05, duration: 0.4 }}
            >
              <Card
                className="relative overflow-hidden border-2 transition-all duration-300 group h-full min-h-[220px] flex flex-col cursor-pointer hover:shadow-2xl hover:scale-[1.02] hover:border-primary/40 active:scale-[0.98]"
                onClick={() => handleModuleClick(module.id)}
              >
                {module.id === 'email' && unreadInboxCount > 0 && (
                  <Badge className="absolute top-4 right-4 z-10 bg-[oklch(0.58_0.25_25)] text-white px-3 py-1">
                    {unreadInboxCount} {unreadInboxCount > 1 ? t.hub.newMessagesPlural : t.hub.newMessages}
                  </Badge>
                )}
                <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{
                    background: `radial-gradient(circle at top right, ${module.color}15, transparent)`
                  }}
                />
                
                <div className="relative p-6 flex flex-col flex-1">
                  <motion.div 
                    className={cn(
                      "mb-4 inline-flex items-center justify-center rounded-2xl p-3 shadow-lg transition-all duration-300",
                      `bg-gradient-to-br ${module.gradient} group-hover:scale-110 group-hover:shadow-xl`
                    )}
                    style={{ color: 'white' }}
                  >
                    {module.icon}
                  </motion.div>

                  <h3 className="text-xl font-bold mb-2 text-foreground">
                    {module.title}
                  </h3>
                  
                  <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                    {module.description}
                  </p>

                  <div className={cn(
                    "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold text-white transition-all duration-300 opacity-0 group-hover:opacity-100",
                    `bg-gradient-to-r ${module.gradient}`
                  )}>
                    {t.hub.openModule} →
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
