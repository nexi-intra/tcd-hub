import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { PaperPlaneTilt, Plus } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { useKV } from '@github/spark/hooks'

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!startDate || !endDate) {
      toast.error('Vælg venligst start- og slutdato')
      return
    }

    const start = new Date(startDate)
    const end = new Date(endDate)

    if (end < start) {
      toast.error('Slutdato skal være efter startdato')
      return
    }

    setIsSubmitting(true)

    try {
      const newVacation: VacationEntry = {
        id: Date.now().toString(),
        userId: userEmail,
        userEmail,
        startDate,
        endDate,
        notes: notes.trim() || undefined,
        status: 'pending'
      }

      setVacations((current) => [...(current || []), newVacation])

      const usersData = await window.spark.kv.get<Record<string, { email: string; password: string; fullName: string; isManager: boolean }>>('users')
      const managers = Object.values(usersData || {}).filter(user => user.isManager)

      const startDateFormatted = new Date(startDate).toLocaleDateString('da-DK', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
      const endDateFormatted = new Date(endDate).toLocaleDateString('da-DK', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })

      for (const manager of managers) {
        try {
          const prompt = window.spark.llmPrompt`Generate a professional email notification to send to a manager about a new vacation request.

Vacation Request Details:
Requested by: ${userEmail}
Start Date: ${startDateFormatted}
End Date: ${endDateFormatted}
${notes ? `Notes from employee: ${notes}` : 'No notes provided'}

The email should be in Danish, professional and clear, and include:
- A clear subject line that indicates a new vacation request
- Information about who is requesting vacation
- The vacation period details
- Any notes provided by the employee
- A reminder that they can review and approve/reject in the Manager Panel
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
            type: 'vacation-request'
          }

          await window.spark.kv.set('emails', [...emails, newEmail])

          const notification = {
            id: Date.now().toString() + '-' + manager.email,
            type: 'email' as const,
            message: `Ny ferieansøgning fra ${userEmail}`,
            timestamp: Date.now(),
            read: false,
            from: userEmail,
            emailId: newEmail.id
          }

          const notifications = await window.spark.kv.get<any[]>('email-notifications') || []
          await window.spark.kv.set('email-notifications', [...notifications, notification])
        } catch (emailError) {
          console.error('Error sending vacation request email to manager:', emailError)
        }
      }

      toast.success('Ferieansøgning sendt til managers')
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
        <Button className="gap-2 bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90">
          <Plus size={20} weight="bold" />
          Anmod om Ferie
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Anmod om Ferie</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="space-y-2">
            <Label htmlFor="start-date">Startdato</Label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="end-date">Slutdato</Label>
            <Input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Kommentar (valgfri)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Tilføj en kommentar til din ferieansøgning..."
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
              Annuller
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="gap-2"
            >
              <PaperPlaneTilt size={18} weight="bold" />
              {isSubmitting ? 'Sender...' : 'Send Ansøgning'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
