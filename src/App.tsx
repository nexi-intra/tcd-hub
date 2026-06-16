import { useState, useEffect } from 'react'
import { Hub } from '@/views/Hub'
import { GuideLibrary } from '@/views/GuideLibrary'
import { VacationCalendar } from '@/views/VacationCalendar'
import { ShiftSchedule } from '@/views/ShiftSchedule'
import { AdminPanel } from '@/views/AdminPanel'
import { ManagerPanel } from '@/views/ManagerPanel'
import { TeamOverview } from '@/views/TeamOverview'
import { EmailSystem } from '@/views/EmailSystem'
import { MealPlan } from '@/views/MealPlan'
import { GameCorner } from '@/views/GameCorner'
import { ProjectBoard } from '@/views/ProjectBoard'
import { Auth } from '@/views/Auth'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { AnimatedBackground } from '@/components/AnimatedBackground'

type View = 'hub' | 'guides' | 'calendar' | 'shifts' | 'admin' | 'manager' | 'team' | 'email' | 'meals' | 'games' | 'projects'

interface UserSession {
  userId: string
  email: string
  token: string
  expiresAt: number
}

interface StoredSession {
  token: string
  email: string
  userId: string
  expiresAt: number
  createdAt: number
}

const SESSION_DURATION = 24 * 60 * 60 * 1000

function generateSessionToken(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
}

async function validateSession(token: string): Promise<{ valid: boolean; session?: StoredSession }> {
  const sessions = await window.spark.kv.get<Record<string, StoredSession>>('active-sessions') || {}
  const session = sessions[token]
  
  if (!session) {
    return { valid: false }
  }
  
  if (Date.now() > session.expiresAt) {
    delete sessions[token]
    await window.spark.kv.set('active-sessions', sessions)
    return { valid: false }
  }
  
  return { valid: true, session }
}

async function createSession(userId: string, email: string): Promise<string> {
  const token = generateSessionToken()
  const expiresAt = Date.now() + SESSION_DURATION
  const createdAt = Date.now()
  
  const sessions = await window.spark.kv.get<Record<string, StoredSession>>('active-sessions') || {}
  sessions[token] = { token, email, userId, expiresAt, createdAt }
  await window.spark.kv.set('active-sessions', sessions)
  
  return token
}

async function deleteSession(token: string): Promise<void> {
  const sessions = await window.spark.kv.get<Record<string, StoredSession>>('active-sessions') || {}
  delete sessions[token]
  await window.spark.kv.set('active-sessions', sessions)
}

function App() {
  const [currentView, setCurrentView] = useState<View>('hub')
  const [userSession, setUserSession] = useState<UserSession | null>(null)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

  useEffect(() => {
    const clearSessionOnLoad = async () => {
      await window.spark.kv.delete('last-session-token')
      setIsCheckingAuth(false)
    }
    
    clearSessionOnLoad()
  }, [])

  const handleAuthenticated = async (userId: string, email: string, rememberMe: boolean) => {
    const token = await createSession(userId, email)
    const expiresAt = Date.now() + SESSION_DURATION
    
    if (rememberMe) {
      await window.spark.kv.set('last-session-token', token)
    }
    
    setUserSession({ userId, email, token, expiresAt })
  }

  const handleLogout = async () => {
    if (userSession?.token) {
      await deleteSession(userSession.token)
      await window.spark.kv.delete('last-session-token')
    }
    
    setUserSession(null)
    setCurrentView('hub')
  }

  const handleNavigate = (moduleId: string) => {
    if (moduleId === 'guides') {
      setCurrentView('guides')
    } else if (moduleId === 'calendar') {
      setCurrentView('calendar')
    } else if (moduleId === 'shifts') {
      setCurrentView('shifts')
    } else if (moduleId === 'admin') {
      setCurrentView('admin')
    } else if (moduleId === 'manager') {
      setCurrentView('manager')
    } else if (moduleId === 'team') {
      setCurrentView('team')
    } else if (moduleId === 'email') {
      setCurrentView('email')
    } else if (moduleId === 'meals') {
      setCurrentView('meals')
    } else if (moduleId === 'games') {
      setCurrentView('games')
    } else if (moduleId === 'projects') {
      setCurrentView('projects')
    }
  }

  const handleNavigateBack = () => {
    setCurrentView('hub')
  }

  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (currentView !== 'hub') {
          setCurrentView('hub')
        }
      }
    }

    window.addEventListener('keydown', handleEscapeKey)
    return () => window.removeEventListener('keydown', handleEscapeKey)
  }, [currentView])

  if (isCheckingAuth) {
    return null
  }

  if (!userSession) {
    return (
      <ThemeProvider>
        <LanguageProvider>
          <AnimatedBackground />
          <Auth onAuthenticated={handleAuthenticated} />
        </LanguageProvider>
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider>
      <LanguageProvider>
        <AnimatedBackground />
        {currentView === 'hub' && <Hub onNavigate={handleNavigate} onLogout={handleLogout} userEmail={userSession.email} />}
        {currentView === 'guides' && <GuideLibrary onNavigateBack={handleNavigateBack} onLogout={handleLogout} />}
        {currentView === 'calendar' && <VacationCalendar onNavigateBack={handleNavigateBack} onLogout={handleLogout} userEmail={userSession.email} />}
        {currentView === 'shifts' && <ShiftSchedule onNavigateBack={handleNavigateBack} onLogout={handleLogout} userEmail={userSession.email} />}
        {currentView === 'admin' && <AdminPanel onNavigateBack={handleNavigateBack} onLogout={handleLogout} />}
        {currentView === 'manager' && <ManagerPanel onNavigateBack={handleNavigateBack} onLogout={handleLogout} userEmail={userSession.email} />}
        {currentView === 'team' && <TeamOverview onNavigateBack={handleNavigateBack} onLogout={handleLogout} />}
        {currentView === 'email' && <EmailSystem onNavigateBack={handleNavigateBack} onLogout={handleLogout} userEmail={userSession.email} />}
        {currentView === 'meals' && <MealPlan onNavigateBack={handleNavigateBack} />}
        {currentView === 'games' && <GameCorner onNavigateBack={handleNavigateBack} userEmail={userSession.email} />}
        {currentView === 'projects' && <ProjectBoard onNavigateBack={handleNavigateBack} onLogout={handleLogout} userEmail={userSession.email} />}
      </LanguageProvider>
    </ThemeProvider>
  )
}

export default App
