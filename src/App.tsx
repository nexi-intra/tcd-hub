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
import { Auth } from '@/views/Auth'
import { useKV } from '@github/spark/hooks'
import { LanguageProvider } from '@/contexts/LanguageContext'
import { ThemeProvider } from '@/contexts/ThemeContext'

type View = 'hub' | 'guides' | 'calendar' | 'shifts' | 'admin' | 'manager' | 'team' | 'email' | 'meals'

interface UserSession {
  userId: string
  email: string
}

function App() {
  const [currentView, setCurrentView] = useState<View>('hub')
  const [userSession, setUserSession] = useKV<UserSession | null>('user-session', null)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

  useEffect(() => {
    setIsCheckingAuth(false)
  }, [])

  const handleAuthenticated = (userId: string, email: string) => {
    setUserSession({ userId, email })
  }

  const handleLogout = () => {
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
    }
  }

  const handleNavigateBack = () => {
    setCurrentView('hub')
  }

  if (isCheckingAuth) {
    return null
  }

  if (!userSession) {
    return (
      <ThemeProvider>
        <LanguageProvider>
          <Auth onAuthenticated={handleAuthenticated} />
        </LanguageProvider>
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider>
      <LanguageProvider>
        {currentView === 'hub' && <Hub onNavigate={handleNavigate} onLogout={handleLogout} userEmail={userSession.email} />}
        {currentView === 'guides' && <GuideLibrary onNavigateBack={handleNavigateBack} onLogout={handleLogout} />}
        {currentView === 'calendar' && <VacationCalendar onNavigateBack={handleNavigateBack} onLogout={handleLogout} />}
        {currentView === 'shifts' && <ShiftSchedule onNavigateBack={handleNavigateBack} onLogout={handleLogout} />}
        {currentView === 'admin' && <AdminPanel onNavigateBack={handleNavigateBack} onLogout={handleLogout} />}
        {currentView === 'manager' && <ManagerPanel onNavigateBack={handleNavigateBack} onLogout={handleLogout} />}
        {currentView === 'team' && <TeamOverview onNavigateBack={handleNavigateBack} onLogout={handleLogout} />}
        {currentView === 'email' && <EmailSystem onNavigateBack={handleNavigateBack} onLogout={handleLogout} />}
        {currentView === 'meals' && <MealPlan onNavigateBack={handleNavigateBack} />}
      </LanguageProvider>
    </ThemeProvider>
  )
}

export default App
