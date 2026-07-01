import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

interface Flag {
  id: number
  x: number
  delay: number
  duration: number
  rotation: number
  size: number
}

interface BirthdayCelebrationProps {
  userEmail: string
}

export function BirthdayCelebration({ userEmail }: BirthdayCelebrationProps) {
  const [showCelebration, setShowCelebration] = useState(false)
  const [flags, setFlags] = useState<Flag[]>([])

  useEffect(() => {
    const checkBirthday = async () => {
      const birthdays = await window.spark.kv.get<Array<{
        email: string
        birthday: string
      }>>('employee-birthdays') || []

      const today = new Date()
      const todayMonth = String(today.getMonth() + 1).padStart(2, '0')
      const todayDay = String(today.getDate()).padStart(2, '0')
      const todayStr = `${todayMonth}-${todayDay}`

      const userBirthday = birthdays.find(b => b.email === userEmail)
      
      if (userBirthday && userBirthday.birthday === todayStr) {
        setShowCelebration(true)
      } else {
        setShowCelebration(false)
      }
    }

    checkBirthday()
  }, [userEmail])

  useEffect(() => {
    if (!showCelebration) return

    const generateNewFlags = () => {
      const newFlags: Flag[] = []
      const baseTime = Date.now()
      for (let i = 0; i < 15; i++) {
        newFlags.push({
          id: baseTime + i + Math.random() * 1000,
          x: Math.random() * 100,
          delay: Math.random() * 1.5,
          duration: 5 + Math.random() * 3,
          rotation: Math.random() * 360,
          size: 30 + Math.random() * 20
        })
      }
      setFlags(prev => [...prev, ...newFlags])
    }

    generateNewFlags()

    const interval = setInterval(() => {
      generateNewFlags()
    }, 2000)

    const cleanupInterval = setInterval(() => {
      setFlags(prev => prev.slice(-60))
    }, 4000)

    return () => {
      clearInterval(interval)
      clearInterval(cleanupInterval)
    }
  }, [showCelebration])

  if (!showCelebration) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
      {flags.map((flag) => (
        <motion.div
          key={flag.id}
          className="absolute will-change-transform"
          style={{
            left: `${flag.x}%`,
          }}
          initial={{ 
            y: -100, 
            rotate: flag.rotation,
            opacity: 1 
          }}
          animate={{
            y: [0, window.innerHeight + 100],
            rotate: [flag.rotation, flag.rotation + 720],
            opacity: [1, 1, 0.8]
          }}
          transition={{
            duration: flag.duration,
            delay: flag.delay,
            ease: 'linear',
            times: [0, 0.95, 1]
          }}
          onAnimationComplete={() => {
            setFlags(prev => prev.filter(f => f.id !== flag.id))
          }}
        >
          <svg
            width={flag.size}
            height={flag.size * 0.75}
            viewBox="0 0 37 28"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
            }}
          >
            <rect width="37" height="28" fill="#C8102E"/>
            <rect x="12" width="3" height="28" fill="white"/>
            <rect y="12.5" width="37" height="3" fill="white"/>
          </svg>
        </motion.div>
      ))}
    </div>
  )
}
