import { useEffect } from 'react'
import { ArrowLeft } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/contexts/LanguageContext'

interface CubeBasherGameProps {
  onNavigateBack: () => void
}

// Cube Basher (github.com/mreflow/cube-basher) er en selvstændig three.js-baseret
// spilfil, vendoret lokalt under public/games/cube-basher/ (se plans/modern-cube-basher.md).
// Den kører i sin egen iframe i stedet for at blive omskrevet til en React-komponent:
// spillet ejer selv sin render-loop, sine egne window-keydown-lyttere og sin egen
// Escape/pause-håndtering, uden nogen form for unmount/dispose-logik. En iframe er sit
// eget browsing-context, så at afmontere den rydder GARANTERET alt op (rAF-loop,
// event-listeners) uden at vi skal røre ved spillets interne kode.
export function CubeBasherGame({ onNavigateBack }: CubeBasherGameProps) {
  const { language } = useLanguage()

  useEffect(() => {
    document.body.setAttribute('data-game-active', 'true')
    return () => document.body.removeAttribute('data-game-active')
  }, [])

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Ingen sandbox-attribut: Chromium blokerer ALLE file://-ressourcer (inkl.
          selve iframe-dokumentet) inde i en sandboxed iframe, uanset allow-*-tokens —
          det var årsagen til at spillet virkede tomt (ingen JS kørte overhovedet).
          Electrons egen BrowserWindow-sandboxing (nodeIntegration:false,
          nodeIntegrationInSubFrames ikke sat) forhindrer stadig Node/Electron-adgang
          uafhængigt af denne attribut, så det er trygt at undlade den her. */}
      <iframe
        src="./games/cube-basher/index.html"
        title="Cube Basher"
        className="w-full h-full border-0"
      />
      <div className="absolute top-4 left-4 z-10">
        <Button
          onClick={onNavigateBack}
          variant="outline"
          size="sm"
          className="bg-background/80 backdrop-blur-sm hover:bg-background shadow-lg gap-2 font-semibold"
        >
          <ArrowLeft size={16} weight="bold" />
          {language === 'da' ? 'Tilbage' : 'Back'}
        </Button>
      </div>
    </div>
  )
}
