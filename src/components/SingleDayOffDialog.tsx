import { useState, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { singleDayOffRequestEmail, singleDayOffConfirmationEmail } from '@/lib/emailTemplates'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { PaperPlaneTilt, CalendarX } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useKV } from '@/hooks/useKV'
import { useLanguage } from '@/contexts/LanguageContext'
import { useUnsavedChanges } from '@/hooks/useUnsavedChanges'
import { format } from 'date-fns'
import { da } from 'date-fns/locale'
import type { VacationEntry } from '@/lib/types'

interface SingleDayOffDialogProps {
  userEmail: string
}

export function SingleDayOffDialog({ userEmail }: SingleDayOffDialogProps) {
  const [open, setOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [vacations, setVacations] = useKV<VacationEntry[]>('vacation-entries', [])
  const { t } = useLanguage()

  const hasUnsavedChanges = useMemo(() => {
    return selectedDate !== '' || notes.trim() !== ''
  }, [selectedDate, notes])

  useUnsavedChanges({
    hasUnsavedChanges,
    onConfirmedExit: () => {
      setSelectedDate('')
      setNotes('')
      setOpen(false)
    },
    enabled: open
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedDate) {
      toast.error(t.singleDayOffDialog.selectDateError)
      return
    }

    const dateObj = new Date(selectedDate)
    const dayOfWeek = dateObj.getDay()
    
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      toast.error(t.singleDayOffDialog.weekendError)
      return
    }

    setIsSubmitting(true)

    try {
      const selectedDateStr = selectedDate

      const newVacation: VacationEntry = {
        id: Date.now().toString(),
        userId: userEmail,
        userEmail,
        startDate: selectedDateStr,
        endDate: selectedDateStr,
        notes: notes.trim() || undefined,
        status: 'pending',
        isSingleDay: true
      }

      setVacations((current) => [...(current || []), newVacation])

      const usersData = await window.kv.get<Record<string, { email: string; password: string; fullName: string; isManager: boolean }>>('users')
      const managers = Object.values(usersData || {}).filter(user => user.isManager)
      const requesterName = usersData?.[userEmail]?.fullName || userEmail

      for (const manager of managers) {
        try {
          const emailContent = singleDayOffRequestEmail(requesterName, selectedDate, notes.trim() || undefined)

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
            type: 'single-day-off-request'
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
          console.error('Error sending day off request email to manager:', emailError)
        }
      }

      try {
        const confirmEmail = singleDayOffConfirmationEmail(selectedDate, notes.trim() || undefined)

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
          type: 'day-off-confirmation'
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

      toast.success(t.singleDayOffDialog.requestSent)
      setSelectedDate('')
      setNotes('')
      setOpen(false)
    } catch (error) {
      console.error('Error creating day off request:', error)
      toast.error(t.singleDayOffDialog.requestError)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <CalendarX size={20} weight="bold" />
          {t.singleDayOffDialog.requestDayOff}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">{t.singleDayOffDialog.title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="space-y-2">
            <Label htmlFor="single-date">{t.singleDayOffDialog.date}</Label>
            <Input
              id="single-date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              {t.singleDayOffDialog.weekdayOnly}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">{t.singleDayOffDialog.comment}</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t.singleDayOffDialog.commentPlaceholder}
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
              {t.singleDayOffDialog.cancel}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !selectedDate}
              className="gap-2"
            >
              <PaperPlaneTilt size={18} weight="bold" />
              {isSubmitting ? t.singleDayOffDialog.submitting : t.singleDayOffDialog.submit}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
