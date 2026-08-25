import { useState, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { vacationRequestEmail, vacationRequestConfirmationEmail } from '@/lib/emailTemplates'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { PaperPlaneTilt, Plus } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useKV } from '@/hooks/useKV'
import { useLanguage } from '@/contexts/LanguageContext'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import { format } from 'date-fns'
import { da } from 'date-fns/locale'

interface VacationEntry {
  id: string
  userId: string
  userEmail: string
  startDate: string
  endDate: string
  notes?: string
  status: 'pending' | 'approved' | 'rejected'
  reviewedBy?: string
  reviewedAt?: string
}

interface VacationRequestDialogProps {
  userEmail: string
}

export function VacationRequestDialog({ userEmail }: VacationRequestDialogProps) {
  const [open, setOpen] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [vacations, setVacations] = useKV<VacationEntry[]>('vacation-entries', [])
  const { t } = useLanguage()

  const hasUnsavedChanges = useMemo(() => {
    return startDate !== '' || endDate !== '' || notes.trim() !== ''
  }, [startDate, endDate, notes])

  useUnsavedChanges({
    hasUnsavedChanges,
    onConfirmedExit: () => {
      setStartDate('')
      setEndDate('')
      setNotes('')
      setOpen(false)
    },
    enabled: open
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!startDate || !endDate) {
      toast.error(t.vacationRequestDialog.selectStartEndDate)
      return
    }

    if (endDate < startDate) {
      toast.error(t.vacationRequestDialog.endDateAfterStart)
      return
    }

    setIsSubmitting(true)

    try {
      const startDateStr = startDate
      const endDateStr = endDate

      const newVacation: VacationEntry = {
        id: Date.now().toString(),
        userId: userEmail,
        userEmail,
        startDate: startDateStr,
        endDate: endDateStr,
        notes: notes.trim() || undefined,
        status: 'pending'
      }

      setVacations((current) => [...(current || []), newVacation])

      const usersData = await window.kv.get<Record<string, { email: string; password: string; fullName: string; isManager: boolean }>>('users')
      const managers = Object.values(usersData || {}).filter(user => user.isManager)
      const requesterName = usersData?.[userEmail]?.fullName || userEmail

      for (const manager of managers) {
        try {
          const emailContent = vacationRequestEmail(requesterName, startDate, endDate, notes.trim() || undefined)

          const emails = await window.kv.get<Array<{
            id: string
            from: string
            to: string
            subject: string
            message: string
            timestamp: number
            read: boolean
            type?: string
          }>>('emails') || []

          const newEmail = {
            id: Date.now().toString() + '-' + manager.email,
            from: userEmail,
            to: manager.email,
            subject: emailContent.subject,
            message: emailContent.body,
            timestamp: Date.now(),
            read: false,
            type: 'vacation-request'
          }

          await window.kv.set('emails', [...emails, newEmail])

          const notification = {
            id: Date.now().toString() + '-' + manager.email + '-notif',
            to: manager.email,
            subject: emailContent.subject,
            body: emailContent.body,
            timestamp: new Date().toISOString(),
            type: 'vacation-request' as const,
            read: false
          }

          const notifications = await window.kv.get<any[]>('email-notifications') || []
          await window.kv.set('email-notifications', [...notifications, notification])
        } catch (emailError) {
          console.error('Error sending vacation request email to manager:', emailError)
        }
      }

      try {
        const confirmEmail = vacationRequestConfirmationEmail(startDate, endDate, notes.trim() || undefined)

        const emails = await window.kv.get<Array<{
          id: string
          from: string
          to: string
          subject: string
          message: string
          timestamp: number
          read: boolean
          type?: string
        }>>('emails') || []

        const confirmationEmail = {
          id: Date.now().toString() + '-confirmation',
          from: 'system@nexigroup.com',
          to: userEmail,
          subject: confirmEmail.subject,
          message: confirmEmail.body,
          timestamp: Date.now(),
          read: false,
          type: 'vacation-confirmation'
        }

        await window.kv.set('emails', [...emails, confirmationEmail])

        const confirmNotification = {
          id: Date.now().toString() + '-confirm-notif',
          to: userEmail,
          subject: confirmEmail.subject,
          body: confirmEmail.body,
          timestamp: new Date().toISOString(),
          type: 'vacation-request' as const,
          read: false
        }

        const notifications = await window.kv.get<any[]>('email-notifications') || []
        await window.kv.set('email-notifications', [...notifications, confirmNotification])
      } catch (error) {
        console.error('Error sending confirmation email:', error)
      }

      toast.success(t.vacationRequestDialog.requestSent)
      setStartDate('')
      setEndDate('')
      setNotes('')
      setOpen(false)
    } catch (error) {
      console.error('Error creating vacation request:', error)
      toast.error('Kunne ikke oprette ferieansøgning')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90">
          <Plus size={20} weight="bold" />
          {t.vacationRequestDialog.requestVacation}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">{t.vacationRequestDialog.title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="space-y-2">
            <Label htmlFor="start-date">{t.vacationRequestDialog.startDate || 'Startdato'}</Label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="end-date">{t.vacationRequestDialog.endDate || 'Slutdato'}</Label>
            <Input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">{t.vacationRequestDialog.comment}</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t.vacationRequestDialog.commentPlaceholder}
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              {t.vacationRequestDialog.cancel}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !startDate || !endDate}
              className="gap-2"
            >
              <PaperPlaneTilt size={18} weight="bold" />
              {isSubmitting ? t.vacationRequestDialog.submitting : t.vacationRequestDialog.submit}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
