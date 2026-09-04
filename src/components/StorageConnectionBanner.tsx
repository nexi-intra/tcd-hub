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
        'Mistet forbindelse til den delte datamappe. Du kan roligt fortsætte med at bruge appen.',
        { id: TOAST_ID, duration: Infinity }
      )
    } else if (previousConnected.current === false && status.connected) {
      toast.success('Forbindelse til den delte datamappe er genoprettet.', { id: TOAST_ID, duration: 5000 })
    }

    previousConnected.current = status.connected
  }, [status])

  if (!status || status.connected) return null

  return (
    <div className="fixed bottom-4 left-4 z-[100] flex items-center gap-2 rounded-full bg-destructive text-destructive-foreground px-3 py-1.5 text-xs font-semibold shadow-lg">
      <CloudSlash size={14} weight="fill" />
      {status.startedDisconnected ? 'Ikke forbundet — lokal tilstand' : 'Offline — arbejder lokalt'}
    </div>
  )
}
