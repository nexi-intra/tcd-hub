import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { CloudSlash } from '@phosphor-icons/react'
import { useStorageConnection } from '@/hooks/useStorageConnection'

const TOAST_ID = 'storage-connection'

/**
 * Global pop-op ved tab/genopretning af forbindelsen til den delte datamappe,
 * plus en vedvarende lille indikator mens appen er i offline-tilstand (så man
 * ikke kun ser en engangs-toast der forsvinder igen).
 */
export function StorageConnectionBanner() {
  const status = useStorageConnection()
  const previousConnected = useRef<boolean | null>(null)

  useEffect(() => {
    if (!status) return

    if (previousConnected.current === null) {
      // Første måling efter appstart — kun relevant hvis vi allerede dengang
      // måtte falde tilbage til en lokal reserve-mappe.
      if (status.startedDisconnected) {
        toast.error(
          'Kunne ikke forbinde til den delte datamappe ved opstart. Appen bruger midlertidigt lokal lagring — genstart appen, når forbindelsen er tilbage, for at synkronisere med resten af teamet.',
          { id: TOAST_ID, duration: Infinity }
        )
      }
    } else if (previousConnected.current === true && !status.connected) {
      toast.error(
        'Mistet forbindelse til den delte datamappe. Du kan roligt fortsætte med at bruge appen — dine ændringer gemmes lokalt og synkroniseres automatisk, når forbindelsen er tilbage.',
        { id: TOAST_ID, duration: Infinity }
      )
    } else if (previousConnected.current === false && status.connected) {
      const pending = status.pendingSyncCount
      toast.success(
        pending > 0
          ? `Forbindelse genoprettet — synkroniserer ${pending} ${pending === 1 ? 'ændring' : 'ændringer'}…`
          : 'Forbindelse til den delte datamappe er genoprettet.',
        { id: TOAST_ID, duration: pending > 0 ? Infinity : 5000 }
      )
    }

    previousConnected.current = status.connected
  }, [status])

  useEffect(() => {
    if (!window.electronKv) return
    return window.electronKv.onSyncResult((result) => {
      if (result.failed === 0) {
        toast.success(
          `✅ ${result.succeeded} ${result.succeeded === 1 ? 'ændring' : 'ændringer'} synkroniseret`,
          { id: TOAST_ID, duration: 4000 }
        )
      } else {
        toast.error(
          `${result.succeeded} ${result.succeeded === 1 ? 'ændring' : 'ændringer'} synkroniseret, men ${result.failed} kunne ikke — prøver igen senere`,
          { id: TOAST_ID, duration: 8000 }
        )
      }
    })
  }, [])

  if (!status || status.connected) return null

  return (
    <div className="fixed bottom-4 left-4 z-[100] flex items-center gap-2 rounded-full bg-destructive text-destructive-foreground px-3 py-1.5 text-xs font-semibold shadow-lg">
      <CloudSlash size={14} weight="fill" />
      {status.startedDisconnected ? 'Ikke forbundet — lokal tilstand' : 'Offline — arbejder lokalt'}
      {status.pendingSyncCount > 0 && (
        <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-[10px]">
          {status.pendingSyncCount} afventer
        </span>
      )}
    </div>
  )
}
