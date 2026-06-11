import { useState } from 'react'
import { Hub } from '@/views/Hub'
import { GuideLibrary } from '@/views/GuideLibrary'

type View = 'hub' | 'guides'

function App() {
  const [currentView, setCurrentView] = useState<View>('hub')

  const handleNavigate = (moduleId: string) => {
    if (moduleId === 'guides') {
      setCurrentView('guides')
    }
  }

  const handleNavigateBack = () => {
    setCurrentView('hub')
  }

  return (
    <>
      {currentView === 'hub' && <Hub onNavigate={handleNavigate} />}
      {currentView === 'guides' && <GuideLibrary onNavigateBack={handleNavigateBack} />}
    </>
  )
}

export default App
