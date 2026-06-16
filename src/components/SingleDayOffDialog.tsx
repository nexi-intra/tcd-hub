import { useState, useMemo } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { PaperPlaneTilt, CalendarX } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useKV } from '@github/spark/hooks'
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
  isSingleDay?: boolean
}

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

      const usersData = await window.spark.kv.get<Record<string, { email: string; password: string; fullName: string; isManager: boolean }>>('users')
      const managers = Object.values(usersData || {}).filter(user => user.isManager)

      const dateFormatted = format(new Date(selectedDate), 'EEEE d. MMMM yyyy', { locale: da })

      for (const manager of managers) {
        try {
          const prompt = window.spark.llmPrompt`Generate a professional email notification to send to a manager about a new single day off request.

Single Day Off Request Details:
Requested by: ${userEmail}
Date: ${dateFormatted}
${notes ? `Notes from employee: ${notes}` : 'No notes provided'}

The email should be in Danish, professional and clear, and include:
- A clear subject line that indicates a new single day off request (fridag)
- Information about who is requesting the day off
- The specific date they want off
- Any notes provided by the employee
- A reminder that they can review and approve/reject in the Manager Panel or Email System
- A brief note that this is an automatic notification

Return ONLY a JSON object with this exact structure:
{
  "subject": "subject line here",
  "body": "email body here with proper line breaks"
}`

          const emailContentJson = await window.spark.llm(prompt, "gpt-4o-mini", true)
          const emailContent = JSON.parse(emailContentJson)
          
          const emails = await window.spark.kv.get<Array<{
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

          await window.spark.kv.set('emails', [...emails, newEmail])

          const notification = {
            id: Date.now().toString() + '-' + manager.email + '-notif',
            to: manager.email,
            subject: emailContent.subject,
            body: emailContent.body,
            timestamp: new Date().toISOString(),
            type: 'vacation-request' as const,
            read: false
          }

          const notifications = await window.spark.kv.get<any[]>('email-notifications') || []
          await window.spark.kv.set('email-notifications', [...notifications, notification])
        } catch (emailError) {
          console.error('Error sending day off request email to manager:', emailError)
        }
      }

      try {
        const confirmationPrompt = window.spark.llmPrompt`Generate a confirmation email to send to ${userEmail} confirming that their single day off request has been submitted and is awaiting manager approval.

Single Day Off Request Details:
Date: ${dateFormatted}
${notes ? `Your notes: ${notes}` : 'No notes provided'}

The email should be in Danish, friendly and reassuring, and include:
- A clear subject line confirming the day off request submission
- Confirmation that the request has been received
- The specific date they requested off
- Information that the request is now awaiting manager approval
- A note that they will receive a notification once the request is reviewed
- A brief note that this is an automatic confirmation

Return ONLY a JSON object with this exact structure:
{
  "subject": "subject line here",
  "body": "email body here with proper line breaks"
}`

        const confirmEmailJson = await window.spark.llm(confirmationPrompt, "gpt-4o-mini", true)
        const confirmEmail = JSON.parse(confirmEmailJson)
        
        const emails = await window.spark.kv.get<Array<{
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

        await window.spark.kv.set('emails', [...emails, confirmationEmail])

        const confirmNotification = {
          id: Date.now().toString() + '-confirm-notif',
          to: userEmail,
          subject: confirmEmail.subject,
          body: confirmEmail.body,
          timestamp: new Date().toISOString(),
          type: 'vacation-request' as const,
          read: false
        }

        const notifications = await window.spark.kv.get<any[]>('email-notifications') || []
        await window.spark.kv.set('email-notifications', [...notifications, confirmNotification])
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
