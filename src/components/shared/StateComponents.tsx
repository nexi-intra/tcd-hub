import { ReactNode } from 'react'
import { CircleNotch } from '@phosphor-icons/react'
import { motion } from 'framer-motion'

interface LoadingStateProps {
  message?: string
  size?: 'sm' | 'md' | 'lg'
}

export function LoadingState({ message = 'Loading...', size = 'md' }: LoadingStateProps) {
  const iconSizes = {
    sm: 24,
    md: 40,
    lg: 56
  }

  const textSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-12 gap-4"
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      >
        <CircleNotch size={iconSizes[size]} weight="bold" className="text-primary" />
      </motion.div>
      <p className={`text-muted-foreground ${textSizes[size]}`}>{message}</p>
    </motion.div>
  )
}

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center py-12 sm:py-16 px-4 text-center"
    >
      {icon && (
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
          className="mb-6 text-muted-foreground/40 [&>svg]:w-16 [&>svg]:h-16 sm:[&>svg]:w-20 sm:[&>svg]:h-20"
        >
          {icon}
        </motion.div>
      )}
      
      <h3 className="text-lg sm:text-xl font-semibold text-foreground mb-2">
        {title}
      </h3>
      
      {description && (
        <p className="text-sm sm:text-base text-muted-foreground mb-6 max-w-md">
          {description}
        </p>
      )}
      
      {action && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {action}
        </motion.div>
      )}
    </motion.div>
  )
}
