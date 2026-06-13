import { Button } from '@/components/ui/button'
import { useLanguage } from '@/contexts/LanguageContext'
import { Globe } from '@phosphor-icons/react'

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage()

  const toggleLanguage = () => {
    setLanguage(language === 'da' ? 'en' : 'da')
  }

  return (
    <Button
      onClick={toggleLanguage}
      variant="outline"
      size="sm"
      className="gap-2"
    >
      <Globe />
      {language === 'da' ? 'English' : 'Dansk'}
    </Button>
  )
}
