import { useState, useEffect } from 'react'
import { Hub } from '@/views/Hub'
import { GuideLibrary } from '@/views/GuideLibrary'
import { Auth } from '@/views/Auth'
import { useKV } from '@github/spark/hooks'

type View = 'hub' | 'guides'

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
    }
  }

  const handleNavigateBack = () => {
    setCurrentView('hub')
  }

  if (isCheckingAuth) {
    return null
  }

  if (!userSession) {
    return <Auth onAuthenticated={handleAuthenticated} />
  }

  return (
    <>
      {currentView === 'hub' && <Hub onNavigate={handleNavigate} onLogout={handleLogout} userEmail={userSession.email} />}
      {currentView === 'guides' && <GuideLibrary onNavigateBack={handleNavigateBack} onLogout={handleLogout} userEmail={userSession.email} />}
    </>
  )
}

export default App
