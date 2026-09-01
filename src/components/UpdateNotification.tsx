import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DownloadSimple, Sparkle } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useLanguage } from '@/contexts/LanguageContext'
import type { UpdateManifest } from '@/lib/electronUpdatesBridge'

// Global opdaterings-popup: lytter på broadcasts fra main-processen og viser
// en dialog, når der ligger en nyere version i den fælles updates-mappe.
export function UpdateNotification() {
  const { language } = useLanguage()
  const [manifest, setManifest] = useState<UpdateManifest | null>(null)
  const [currentVersion, setCurrentVersion] = useState('')
  const [dismissedVersion, setDismissedVersion] = useState<string | null>(null)
  const [isInstalling, setIsInstalling] = useState(false)

  const da = language === 'da'

  useEffect(() => {
    const api = window.electronUpdates
    if (!api) return

    api.getStatus().then((status) => {
      setCurrentVersion(status.currentVersion)
      if (status.updateAvailable && status.manifest) {
        setManifest(status.manifest)
      }
    }).catch(() => {})

    return api.onUpdateAvailable((newManifest) => {
      setManifest(newManifest)
    })
  }, [])

  if (!window.electronUpdates || !manifest) return null

  const open = manifest.version !== dismissedVersion

  const handleInstall = async () => {
    setIsInstalling(true)
    try {
      await window.electronUpdates!.install()
      // Appen lukker selv — herefter sker der ikke mere i denne proces.
    } catch (error) {
      console.error('Opdatering fejlede:', error)
      toast.error(
        error instanceof Error && error.message
          ? error.message
          : da ? 'Opdateringen kunne ikke startes' : 'The update could not be started'
      )
      setIsInstalling(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !isInstalling) setDismissedVersion(manifest.version) }}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkle size={22} weight="duotone" className="text-primary" />
            {da ? 'Ny version tilgængelig' : 'New version available'}
          </DialogTitle>
          <DialogDescription>
            {da
              ? 'En ny version af TCD Hub er klar. Opdateringen tager under et minut — appen genstarter selv, og alle data bevares.'
              : 'A new version of TCD Hub is ready. The update takes less than a minute — the app restarts itself and all data is kept.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{da ? 'Nuværende' : 'Current'}: {currentVersion || '…'}</Badge>
            <span className="text-muted-foreground">→</span>
            <Badge>{da ? 'Ny' : 'New'}: {manifest.version}</Badge>
          </div>
          {manifest.notes && (
            <div className="rounded-lg border bg-muted/40 p-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                {da ? 'Nyt i denne version' : "What's new"}
              </p>
              <p className="text-sm whitespace-pre-wrap">{manifest.notes}</p>
            </div>
          )}
          {isInstalling && (
            <p className="text-sm text-muted-foreground animate-pulse">
              {da
                ? 'Opdaterer… Appen lukker og genstarter selv om et øjeblik.'
                : 'Updating… The app will close and restart by itself shortly.'}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setDismissedVersion(manifest.version)} disabled={isInstalling}>
            {da ? 'Senere' : 'Later'}
          </Button>
          <Button onClick={handleInstall} disabled={isInstalling} className="gap-2">
            <DownloadSimple size={18} />
            {isInstalling ? (da ? 'Opdaterer…' : 'Updating…') : (da ? 'Opdater nu' : 'Update now')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
