import { useState, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Warning, Books } from '@phosphor-icons/react'
import { getReviewStatus } from '@/lib/guideTypes'
import type { Guide } from '@/lib/guideTypes'

interface GuideReviewAlertProps {
  onOpenGuideLibrary: () => void
  // Sendes ned fra Hub (som allerede læser 'guides') i stedet for egen KV-læsning her —
  // undgår en ekstra uafhængig lytter for samme nøgle på den mest besøgte skærm.
  guides: Guide[] | undefined
}

// Vises i main Hub når en eller flere guides har overskredet deres
// gennemgangsfrist. Kan lukkes for denne session, men dukker op igen ved
// næste besøg i Hub (og på alle klienter), indtil guiden(erne) er opdateret.
export function GuideReviewAlert({ onOpenGuideLibrary, guides }: GuideReviewAlertProps) {
  const [dismissed, setDismissed] = useState(false)

  const overdueGuides = useMemo(
    () => (guides || []).filter((g) => getReviewStatus(g) === 'overdue'),
    [guides]
  )

  if (overdueGuides.length === 0 || dismissed) return null

  return (
    <Dialog open onOpenChange={(open) => { if (!open) setDismissed(true) }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Warning size={22} weight="fill" />
            {overdueGuides.length === 1 ? 'En guide skal opdateres' : `${overdueGuides.length} guides skal opdateres`}
          </DialogTitle>
          <DialogDescription>
            Følgende guide{overdueGuides.length > 1 ? 's' : ''} i Guide Biblioteket har overskredet gennemgangsfristen og bør opdateres snarest:
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {overdueGuides.map((g) => (
            <div key={g.id} className="flex items-center justify-between gap-2 rounded-lg border p-3 bg-destructive/5">
              <div className="min-w-0">
                <div className="font-semibold text-sm truncate">{g.title}</div>
                <div className="text-xs text-muted-foreground truncate">{g.category}</div>
              </div>
            </div>
          ))}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setDismissed(true)}>
            Luk for nu
          </Button>
          <Button onClick={() => { setDismissed(true); onOpenGuideLibrary() }} className="gap-2">
            <Books size={18} />
            Gå til Guide Bibliotek
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
