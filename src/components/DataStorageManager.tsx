import { useState, useEffect, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { FolderOpen, DownloadSimple, UploadSimple, HardDrives, Info, CloudCheck, CloudSlash } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { createBackup, downloadBackup, parseBackup, restoreBackup, type BackupFile } from '@/lib/backup'
import { useStorageConnection } from '@/hooks/useStorageConnection'

interface StorageInfo {
  dataDir: string
  source: 'env' | 'config' | 'user' | 'default'
}

const sourceLabels: Record<StorageInfo['source'], string> = {
  env: 'Sat via miljøvariabel (TCD_HUB_DATA_DIR)',
  config: 'Sat via tcd-hub.config.json ved siden af programmet',
  user: 'Valgt her i appen',
  default: 'Appens egen mappe på denne computer',
}

export function DataStorageManager() {
  const isDesktopApp = !!window.electronKv
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null)
  const [isBusy, setIsBusy] = useState(false)
  const [pendingImport, setPendingImport] = useState<BackupFile | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const connectionStatus = useStorageConnection()

  useEffect(() => {
    if (isDesktopApp) {
      window.electronKv!.getStorageInfo().then(setStorageInfo).catch(() => {})
    }
  }, [isDesktopApp])

  const handleChooseFolder = async () => {
    setIsBusy(true)
    try {
      const result = await window.electronKv!.chooseDataDir()
      if (result) {
        setStorageInfo({ dataDir: result.dataDir, source: 'user' })
        toast.success(
          result.migratedFiles > 0
            ? `Datamappe skiftet. ${result.migratedFiles} datafiler blev kopieret med over.`
            : 'Datamappe skiftet.'
        )
      }
    } catch (error) {
      console.error('Kunne ikke skifte datamappe:', error)
      toast.error('Kunne ikke skifte datamappe. Tjek at du har adgang til mappen.')
    } finally {
      setIsBusy(false)
    }
  }

  const handleExport = async () => {
    setIsBusy(true)
    try {
      const backup = await createBackup()
      const filename = downloadBackup(backup)
      toast.success(`Backup gemt som ${filename} (${Object.keys(backup.data).length} datasæt)`)
    } catch (error) {
      console.error('Backup-eksport fejlede:', error)
      toast.error('Kunne ikke oprette backup')
    } finally {
      setIsBusy(false)
    }
  }

  const handleImportFile = async (file: File) => {
    try {
      const backup = parseBackup(await file.text())
      setPendingImport(backup)
    } catch (error) {
      console.error('Ugyldig backup-fil:', error)
      toast.error('Filen er ikke en gyldig TCD Hub-backup')
    }
  }

  const handleConfirmImport = async () => {
    if (!pendingImport) return
    setIsBusy(true)
    try {
      const count = await restoreBackup(pendingImport)
      toast.success(`${count} datasæt genskabt fra backup. Genindlæser…`)
      setTimeout(() => window.location.reload(), 1200)
    } catch (error) {
      console.error('Backup-import fejlede:', error)
      toast.error('Kunne ikke genskabe backup')
      setIsBusy(false)
    } finally {
      setPendingImport(null)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[oklch(0.42_0.19_270)] to-[oklch(0.52_0.15_262)] flex items-center justify-center">
            <HardDrives size={24} weight="duotone" className="text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold">Hvor ligger appens data?</h3>
            <p className="text-sm text-muted-foreground">
              Vagtplan, ferie, brugere og alt andet gemmes samlet ét sted.
            </p>
          </div>
        </div>

        {isDesktopApp ? (
          <>
            <div className="rounded-lg border bg-muted/40 p-4 space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nuværende datamappe</p>
              <p className="font-mono text-sm break-all">{storageInfo?.dataDir || 'Indlæser…'}</p>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                {storageInfo && (
                  <Badge variant="secondary">{sourceLabels[storageInfo.source]}</Badge>
                )}
                {connectionStatus && (
                  connectionStatus.connected ? (
                    <Badge className="gap-1 bg-green-600/15 text-green-700 dark:text-green-400 border-green-600/30">
                      <CloudCheck size={14} weight="fill" />
                      Forbundet
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="gap-1">
                      <CloudSlash size={14} weight="fill" />
                      {connectionStatus.startedDisconnected ? 'Ikke forbundet — lokal tilstand' : 'Forbindelse mistet'}
                    </Badge>
                  )
                )}
              </div>
              {connectionStatus && !connectionStatus.connected && (
                <p className="text-xs text-muted-foreground pt-1">
                  {connectionStatus.startedDisconnected
                    ? 'Den foretrukne delte mappe kunne ikke nås ved opstart. Genstart appen, når forbindelsen er tilbage.'
                    : 'Forbindelsen forsøges automatisk genoprettet i baggrunden.'}
                </p>
              )}
            </div>
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <Info size={18} className="shrink-0 mt-0.5" />
              <p>
                Vælg en fast mappe — fx på et netværksdrev — så peger enhver ny version af appen
                automatisk på de samme data. Du mister intet ved at opdatere appen. Alle datafiler
                er krypterede, så passwords m.m. ikke kan læses direkte fra mappen.
              </p>
            </div>
            <Button onClick={handleChooseFolder} disabled={isBusy} className="gap-2">
              <FolderOpen size={18} />
              Vælg datamappe…
            </Button>
          </>
        ) : (
          <div className="flex items-start gap-2 text-sm text-muted-foreground rounded-lg border bg-muted/40 p-4">
            <Info size={18} className="shrink-0 mt-0.5" />
            <p>
              Du kører i en browser, så data gemmes i browserens eget lager på denne computer.
              Brug desktop-appen for at gemme i en fælles mappe (fx netværksdrev). Du kan flytte
              alt data derover med backup-funktionen herunder: eksportér her, importér i desktop-appen.
            </p>
          </div>
        )}
      </Card>

      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[oklch(0.34_0.14_273)] to-[oklch(0.42_0.13_270)] flex items-center justify-center">
            <DownloadSimple size={24} weight="duotone" className="text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold">Backup</h3>
            <p className="text-sm text-muted-foreground">
              Én fil med alt: vagtplan, ferie, brugere, spil-resultater, indstillinger osv.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <Info size={18} className="shrink-0 mt-0.5" />
          <p>
            Skal du flytte til en ny version eller en ny computer? Eksportér en backup her,
            åbn den nye version, og importér filen — så er al historik med.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button onClick={handleExport} disabled={isBusy} className="gap-2">
            <DownloadSimple size={18} />
            Eksportér backup
          </Button>
          <Button
            variant="outline"
            disabled={isBusy}
            className="gap-2"
            onClick={() => fileInputRef.current?.click()}
          >
            <UploadSimple size={18} />
            Importér backup…
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleImportFile(file)
              e.target.value = ''
            }}
          />
        </div>
      </Card>

      <AlertDialog open={!!pendingImport} onOpenChange={(open) => !open && setPendingImport(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Genskab data fra backup?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingImport && (
                <>
                  Backuppen er fra {new Date(pendingImport.exportedAt).toLocaleString('da-DK')} og
                  indeholder {Object.keys(pendingImport.data).length} datasæt. Eksisterende data med
                  samme navne bliver overskrevet. Denne handling kan ikke fortrydes.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annullér</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmImport}>Genskab data</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
