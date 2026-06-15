import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { FirstAidKit, Trash, PencilSimple, CalendarDot } from '@phosphor-icons/react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { SickLeaveDialog } from '@/components/SickLeaveDialog'
import { useKV } from '@github/spark/hooks'
import { format } from 'date-fns'
import { da } from 'date-fns/locale'
import { toast } from 'sonner'

interface SickLeaveEntry {
  id: string
  userEmail: string
  userName: string
  startDate: string
  reason?: string
  status: 'pending' | 'approved' | 'rejected'
  submittedAt: string
  reportedBy?: string
}

interface SickLeaveManagerProps {
  userEmail: string
}

export function SickLeaveManager({ userEmail }: SickLeaveManagerProps) {
  const [sickLeaveEntries, setSickLeaveEntries] = useKV<SickLeaveEntry[]>('sick-leave-entries', [])
  const [editingEntry, setEditingEntry] = useState<SickLeaveEntry | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [reporterNames, setReporterNames] = useState<Record<string, string>>({})

  useEffect(() => {
    const fetchReporterNames = async () => {
      const usersData = await window.spark.kv.get<Record<string, { email: string; password: string; fullName: string }>>('users')
      if (usersData) {
        const names: Record<string, string> = {}
        Object.keys(usersData).forEach(email => {
          names[email] = usersData[email].fullName || email
        })
        setReporterNames(names)
      }
    }
    fetchReporterNames()
  }, [])

  const userEntries = (sickLeaveEntries || []).filter(entry => entry.userEmail === userEmail)
  const sortedEntries = [...userEntries].sort((a, b) => {
    const dateA = new Date(a.startDate)
    const dateB = new Date(b.startDate)
    if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) return 0
    return dateB.getTime() - dateA.getTime()
  })

  const handleDelete = (entryId: string) => {
    setSickLeaveEntries((current) => (current || []).filter(entry => entry.id !== entryId))
    toast.success('Sygemelding slettet')
  }

  const handleEdit = (entry: SickLeaveEntry) => {
    setEditingEntry(entry)
    setShowEditDialog(true)
  }

  const handleCloseEditDialog = () => {
    setShowEditDialog(false)
    setEditingEntry(null)
  }

  if (sortedEntries.length === 0) {
    return (
      <Card className="p-8 text-center">
        <FirstAidKit size={48} className="text-muted-foreground mx-auto mb-4" weight="duotone" />
        <p className="text-muted-foreground text-lg mb-2">Ingen sygemeldinger registreret</p>
        <p className="text-sm text-muted-foreground">
          Dine sygemeldinger vil vises her
        </p>
      </Card>
    )
  }

  return (
    <>
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[oklch(0.58_0.25_25)] to-[oklch(0.65_0.26_340)] flex items-center justify-center">
              <FirstAidKit size={24} weight="duotone" className="text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Mine Sygemeldinger</h2>
              <p className="text-sm text-muted-foreground">
                {sortedEntries.length} {sortedEntries.length === 1 ? 'registrering' : 'registreringer'}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {sortedEntries.map((entry) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex items-center justify-between p-5 rounded-xl border-2 bg-card hover:shadow-md transition-all group"
            >
              <div className="flex items-center gap-4 flex-1">
                <div className="h-12 w-12 rounded-xl bg-red-100 flex items-center justify-center">
                  <CalendarDot size={24} className="text-red-600" weight="duotone" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="font-bold text-lg">
                      {(() => {
                        try {
                          const date = new Date(entry.startDate)
                          if (isNaN(date.getTime())) return 'Ugyldig dato'
                          return format(date, 'd. MMMM yyyy', { locale: da })
                        } catch {
                          return 'Ugyldig dato'
                        }
                      })()}
                    </div>
                    <Badge className="bg-red-100 text-red-800 border-red-300">
                      Sygemeldt
                    </Badge>
                  </div>
                  {entry.reason && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {entry.reason}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Indsendt: {(() => {
                      try {
                        const date = new Date(entry.submittedAt)
                        if (isNaN(date.getTime())) return 'Ugyldig dato'
                        return format(date, 'd. MMM yyyy HH:mm', { locale: da })
                      } catch {
                        return 'Ugyldig dato'
                      }
                    })()}
                    {entry.reportedBy && reporterNames[entry.reportedBy] && (
                      <span className="ml-2 text-amber-600 dark:text-amber-400">
                        • Anmeldt af {reporterNames[entry.reportedBy]}
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEdit(entry)}
                  className="gap-2 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <PencilSimple size={16} />
                  Rediger
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash size={20} />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Slet sygemelding?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Er du sikker på at du vil slette sygemeldingen fra <strong>{(() => {
                          try {
                            const date = new Date(entry.startDate)
                            if (isNaN(date.getTime())) return 'ugyldig dato'
                            return format(date, 'd. MMMM yyyy', { locale: da })
                          } catch {
                            return 'ugyldig dato'
                          }
                        })()}</strong>? Denne handling kan ikke fortrydes.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuller</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(entry.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Slet sygemelding
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </motion.div>
          ))}
        </div>
      </Card>

      <SickLeaveDialog
        open={showEditDialog}
        onOpenChange={handleCloseEditDialog}
        userEmail={userEmail}
        editEntry={editingEntry}
      />
    </>
  )
}
