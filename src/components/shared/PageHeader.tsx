import { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { UserProfile } from '@/components/UserProfile'
import { hasManagerAccess } from '@/lib/userRoles'
import { useState, useEffect } from 'react'

interface PageHeaderProps {
  title: string
  icon?: ReactNode
  gradient?: string
  onNavigateBack?: () => void
  onLogout?: () => void
  userEmail?: string
  actions?: ReactNode
}

export function PageHeader({ 
  title, 
  icon, 
  gradient, 
  onNavigateBack, 
  onLogout,
  userEmail,
  actions 
}: PageHeaderProps) {
  const [isAdminOrManager, setIsAdminOrManager] = useState(false)

  useEffect(() => {
    const checkUserRole = async () => {
      if (userEmail) {
        const access = await hasManagerAccess(userEmail)
        setIsAdminOrManager(access)
      }
    }
    checkUserRole()
  }, [userEmail])

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50 shadow-sm relative"
    >
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-primary via-accent to-primary opacity-70" />
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
            {onNavigateBack && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onNavigateBack}
                className="shrink-0 hover:bg-primary/10 hover:text-primary transition-all duration-300"
              >
                <ArrowLeft size={24} weight="bold" />
              </Button>
            )}
            
            {icon && (
              <div 
                className={`shrink-0 p-2 sm:p-3 rounded-xl shadow-lg ring-1 ring-black/5 ${gradient ? `bg-gradient-to-br ${gradient}` : 'bg-primary'}`}
              >
                <div className="text-white [&>svg]:w-6 [&>svg]:h-6 sm:[&>svg]:w-8 sm:[&>svg]:h-8">
                  {icon}
                </div>
              </div>
            )}
            
            <h1 className="text-lg sm:text-2xl md:text-3xl font-bold text-foreground truncate">
              {title}
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {actions}
            
            {onLogout && userEmail && (
              <UserProfile 
                userEmail={userEmail} 
                onLogout={onLogout}
                showAdmin={isAdminOrManager}
                onAdminClick={() => {}}
              />
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
