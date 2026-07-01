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
      for (let i = 0; i < 25; i++) {
        newFlags.push({
          id: baseTime + i,
          x: Math.random() * 100,
          delay: Math.random() * 2,
          duration: 6 + Math.random() * 3,
          rotation: Math.random() * 360,
          size: 25 + Math.random() * 15
        })
      }
      setFlags(prev => [...prev, ...newFlags])
    }

    generateNewFlags()

    const interval = setInterval(() => {
      generateNewFlags()
    }, 3000)

    const cleanupInterval = setInterval(() => {
      setFlags(prev => prev.slice(-50))
    }, 5000)

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
          className="absolute"
          style={{
            left: `${flag.x}%`,
            top: '-10%',
          }}
          initial={{ y: -100, rotate: flag.rotation }}
          animate={{
            y: window.innerHeight + 100,
            rotate: flag.rotation + 360 * 2,
          }}
          transition={{
            duration: flag.duration,
            delay: flag.delay,
            repeat: Infinity,
            ease: 'linear',
          }}
        >
          <svg
            width={flag.size}
            height={flag.size * 0.75}
            viewBox="0 0 37 28"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{
              filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
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
