import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import { ArrowsClockwise, CloudArrowUp, Info, Package, RocketLaunch } from '@phosphor-icons/react'
import { toast } from 'sonner'
import type { SelectedZip, UpdateStatus, PublishProgress } from '@/lib/electronUpdatesBridge'

interface UpdateManagerProps {
  userEmail: string
}

const PUBLISH_PHASE_LABELS: Record<PublishProgress['phase'], string> = {
  'hashing-source': 'Beregner tjeksum af pakken…',
  uploading: 'Overfører til den fælles mappe…',
  verifying: 'Verificerer kopien…',
  extracting: 'Pakker ud…',
  indexing: 'Indekserer filer…',
}

// Publicerings-UI (Manager Panel → Datalagring): lægger en ny app-zip i den
// fælles updates-mappe, hvorefter alle klienter automatisk får popup'en.
export function UpdateManager({ userEmail }: UpdateManagerProps) {
  const isDesktopApp = !!window.electronUpdates
  const [status, setStatus] = useState<UpdateStatus | null>(null)
  const [isBusy, setIsBusy] = useState(false)
  const [selectedZip, setSelectedZip] = useState<SelectedZip | null>(null)
  const [version, setVersion] = useState('')
  const [notes, setNotes] = useState('')
  const [publishProgress, setPublishProgress] = useState<PublishProgress | null>(null)
  const [skipDelta, setSkipDelta] = useState(false)

  const refreshStatus = useCallback(async () => {
    if (!window.electronUpdates) return
    try {
      setStatus(await window.electronUpdates.getStatus())
    } catch (error) {
      console.error('Kunne ikke hente opdaterings-status:', error)
    }
  }, [])

  useEffect(() => {
    refreshStatus()
  }, [refreshStatus])

  useEffect(() => {
    if (!window.electronUpdates) return
    return window.electronUpdates.onPublishProgress(setPublishProgress)
  }, [])

  const handleCheckNow = async () => {
    setIsBusy(true)
    try {
      const manifest = await window.electronUpdates!.check()
      await refreshStatus()
      if (manifest) {
        toast.success(`Ny version ${manifest.version} er tilgængelig — opdaterings-vinduet vises nu`)
      } else {
        toast.info('Du kører allerede den nyeste version')
      }
    } catch (error) {
      console.error('Opdaterings-tjek fejlede:', error)
      toast.error('Kunne ikke tjekke for opdateringer')
    } finally {
      setIsBusy(false)
    }
  }

  const handleSelectZip = async () => {
    setIsBusy(true)
    try {
      const zip = await window.electronUpdates!.selectZip()
      if (zip) {
        setSelectedZip(zip)
        setVersion(zip.version || '')
      }
    } catch (error) {
      console.error('Kunne ikke vælge zip:', error)
      toast.error('Kunne ikke vælge fil')
    } finally {
      setIsBusy(false)
    }
  }

  const handlePublish = async () => {
    if (!selectedZip) return
    if (!/^\d+\.\d+\.\d+$/.test(version.trim())) {
      toast.error('Versionsnummeret skal have formatet X.Y.Z, fx 1.2.1')
      return
    }
    setIsBusy(true)
    setPublishProgress({ phase: 'hashing-source', percent: 0 })
    try {
      const manifest = await window.electronUpdates!.publish({
        zipPath: selectedZip.path,
        version: version.trim(),
        notes: notes.trim(),
        publishedBy: userEmail,
        skipDelta,
      })
      toast.success(`Version ${manifest.version} er publiceret. Alle klienter får besked inden for 15 minutter.`, { duration: 8000 })
      setSelectedZip(null)
      setVersion('')
      setNotes('')
      await refreshStatus()
    } catch (error) {
      console.error('Publicering fejlede:', error)
      toast.error(error instanceof Error && error.message ? error.message : 'Publicering fejlede')
    } finally {
      setIsBusy(false)
      setPublishProgress(null)
    }
  }

  if (!isDesktopApp) {
    return (
      <Card className="p-6">
        <div className="flex items-start gap-2 text-sm text-muted-foreground rounded-lg border bg-muted/40 p-4">
          <Info size={18} className="shrink-0 mt-0.5" />
          <p>App-opdateringer styres fra desktop-appen. Du kører i en browser, så denne sektion er ikke tilgængelig her.</p>
        </div>
      </Card>
    )
  }

  const publishedIsNewer = !!status?.updateAvailable
  const formatMB = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[oklch(0.50_0.14_275)] to-[oklch(0.56_0.12_262)] flex items-center justify-center">
          <RocketLaunch size={24} weight="duotone" className="text-white" />
        </div>
        <div>
          <h3 className="text-lg font-bold">App-opdateringer</h3>
          <p className="text-sm text-muted-foreground">
            Publicér en ny version til alle uden installation — klienterne opdaterer sig selv.
          </p>
        </div>
      </div>

      <div className="rounded-lg border bg-muted/40 p-4 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Denne app: v{status?.currentVersion || '…'}</Badge>
          {status?.manifest ? (
            <Badge variant={publishedIsNewer ? 'default' : 'secondary'}>
              Seneste publicerede: v{status.manifest.version}
            </Badge>
          ) : (
            <Badge variant="outline">Ingen version publiceret endnu</Badge>
          )}
        </div>
        {status?.manifest && (
          <p className="text-xs text-muted-foreground">
            Publiceret {new Date(status.manifest.publishedAt).toLocaleString('da-DK')}
            {status.manifest.publishedBy && <> af {status.manifest.publishedBy}</>} · {status.manifest.file} ({formatMB(status.manifest.size)})
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <Button variant="outline" onClick={handleCheckNow} disabled={isBusy} className="gap-2">
          <ArrowsClockwise size={18} />
          Søg efter opdateringer
        </Button>
      </div>

      <div className="border-t pt-4 space-y-4">
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <Info size={18} className="shrink-0 mt-0.5" />
          <p>
            Sådan publicerer du: Byg den nye version (<code className="font-mono text-xs">npm run electron:build</code>),
            vælg zip-filen fra release-mappen herunder, og tryk Publicér. Zip'en kopieres til den fælles
            datamappes <span className="font-mono text-xs">updates/</span>-mappe, og alle klienter får
            automatisk et opdaterings-vindue op.
          </p>
        </div>

        {selectedZip ? (
          <div className="space-y-4">
            <div className="rounded-lg border p-4 flex items-center gap-3">
              <Package size={24} className="text-primary shrink-0" />
              <div className="min-w-0">
                <p className="font-medium text-sm break-all">{selectedZip.fileName}</p>
                <p className="text-xs text-muted-foreground">{formatMB(selectedZip.size)}</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
              <div className="space-y-2">
                <Label htmlFor="update-version">Version</Label>
                <Input
                  id="update-version"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  placeholder="fx 1.2.1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="update-notes">Release-noter (vises i opdaterings-vinduet)</Label>
                <Textarea
                  id="update-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Kort beskrivelse af hvad der er nyt…"
                  rows={3}
                />
              </div>
            </div>
            {status && /^\d+\.\d+\.\d+$/.test(version.trim()) &&
              status.currentVersion === version.trim() && (
              <p className="text-sm text-amber-600 dark:text-amber-400">
                Bemærk: versionen er den samme som den du selv kører — det er fint hvis andre klienter stadig er bagud, de opdaterer stadig. Klienter der allerede har denne version, opdaterer ikke igen.
              </p>
            )}
            <label className="flex items-start gap-2.5 rounded-lg border bg-muted/40 p-3 cursor-pointer">
              <Checkbox checked={skipDelta} onCheckedChange={(checked) => setSkipDelta(checked === true)} className="mt-0.5" />
              <span className="text-sm">
                <span className="font-medium">Tving fuld installation for alle klienter</span>
                <br />
                <span className="text-muted-foreground text-xs">
                  Slår hurtig delta-opdatering fra for denne udgivelse. Anbefales hvis ældre klienter fejler ved opdatering (fx "ENOENT ... app.asar") — fuld installation virker altid, uanset hvilken version klienten kører nu.
                </span>
              </span>
            </label>
            {publishProgress && (
              <div className="space-y-2 rounded-lg border bg-muted/40 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{PUBLISH_PHASE_LABELS[publishProgress.phase]}</span>
                  <span className="text-muted-foreground tabular-nums">{publishProgress.percent}%</span>
                </div>
                <Progress value={publishProgress.percent} />
              </div>
            )}
            <div className="flex flex-wrap gap-3">
              <Button onClick={handlePublish} disabled={isBusy} className="gap-2">
                <CloudArrowUp size={18} />
                Publicér opdatering
              </Button>
              <Button variant="ghost" onClick={() => setSelectedZip(null)} disabled={isBusy}>
                Annullér
              </Button>
            </div>
          </div>
        ) : (
          <Button onClick={handleSelectZip} disabled={isBusy} className="gap-2">
            <Package size={18} />
            Vælg ny app-pakke (.zip)…
          </Button>
        )}
      </div>
    </Card>
  )
}
