import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { manualVacationGrantEmail } from '@/lib/emailTemplates'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Gift, CalendarCheck } from '@phosphor-icons/react'
import { toast } from 'sonner'
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
  manuallyGranted?: boolean
}

interface User {
  email: string
  fullName: string
}

interface ManualVacationGrantProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  managerEmail: string
  onSuccess: () => void
}

export function ManualVacationGrant({ open, onOpenChange, managerEmail, onSuccess }: ManualVacationGrantProps) {
  const [users, setUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState('')
  const [grantType, setGrantType] = useState<'single' | 'vacation'>('single')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [notes, setNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const loadUsers = async () => {
      const usersData = await window.kv.get<Record<string, { email: string; password: string; fullName: string }>>('users')
      if (usersData) {
        const userList = Object.values(usersData).map(u => ({
          email: u.email,
          fullName: u.fullName
        })).sort((a, b) => a.fullName.localeCompare(b.fullName))
        setUsers(userList)
      }
    }
    
    if (open) {
      loadUsers()
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedUser) {
      toast.error('Vælg en bruger')
      return
    }

    if (!startDate) {
      toast.error('Vælg en startdato')
      return
    }

    if (grantType === 'vacation' && !endDate) {
      toast.error('Vælg en slutdato for ferie')
      return
    }

    const start = new Date(startDate)
    const end = grantType === 'single' ? new Date(startDate) : new Date(endDate)

    if (grantType === 'vacation' && end < start) {
      toast.error('Slutdato skal være efter startdato')
      return
    }

    setIsSubmitting(true)

    try {
      const newVacation: VacationEntry = {
        id: Date.now().toString(),
        userId: selectedUser,
        userEmail: selectedUser,
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        notes: notes.trim() || undefined,
        status: 'approved',
        reviewedBy: managerEmail,
        reviewedAt: new Date().toISOString(),
        isSingleDay: grantType === 'single',
        manuallyGranted: true
      }

      const vacations = await window.kv.get<VacationEntry[]>('vacation-entries') || []
      await window.kv.set('vacation-entries', [...vacations, newVacation])

      try {
        const emailContent = manualVacationGrantEmail(managerEmail, start, end, grantType === 'single', notes.trim() || undefined)

        const emails = await window.kv.get<Array<{
          id: string
          from: string
          to: string
          subject: string
          message: string
          timestamp: number
          read: boolean
        }>>('emails') || []

        const newEmail = {
          id: Date.now().toString() + '-manual-grant',
          from: managerEmail,
          to: selectedUser,
          subject: emailContent.subject,
          message: emailContent.body,
          timestamp: Date.now(),
          read: false
        }

        await window.kv.set('emails', [...emails, newEmail])

        const notification = {
          id: Date.now().toString(),
          type: 'email' as const,
          message: grantType === 'single' ? `Du har fået en fridag!` : `Du har fået ferie!`,
          timestamp: Date.now(),
          read: false,
          from: managerEmail,
          emailId: newEmail.id
        }

        const notifications = await window.kv.get<any[]>('email-notifications') || []
        await window.kv.set('email-notifications', [...notifications, notification])
      } catch (emailError) {
        console.error('Error sending vacation grant email:', emailError)
      }

      toast.success(grantType === 'single' ? 'Fridag givet!' : 'Ferie givet!')
      setSelectedUser('')
      setGrantType('single')
      setStartDate('')
      setEndDate('')
      setNotes('')
      onOpenChange(false)
      onSuccess()
    } catch (error) {
      console.error('Error granting vacation:', error)
      toast.error('Kunne ikke give ferie')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Gift size={28} className="text-accent" weight="duotone" />
            Giv Ferie eller Fridag
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="space-y-2">
            <Label htmlFor="user-select">Vælg bruger *</Label>
            <Select value={selectedUser} onValueChange={setSelectedUser}>
              <SelectTrigger id="user-select">
                <SelectValue placeholder="Vælg en bruger" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.email} value={user.email}>
                    {user.fullName} ({user.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="grant-type">Type *</Label>
            <Select value={grantType} onValueChange={(value: 'single' | 'vacation') => setGrantType(value)}>
              <SelectTrigger id="grant-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">
                  <div className="flex items-center gap-2">
                    <CalendarCheck size={16} />
                    Enkelt fridag
                  </div>
                </SelectItem>
                <SelectItem value="vacation">
                  <div className="flex items-center gap-2">
                    <Gift size={16} />
                    Ferie (flere dage)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="start-date">{grantType === 'single' ? 'Dato *' : 'Startdato *'}</Label>
            <Input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full"
            />
          </div>

          {grantType === 'vacation' && (
            <div className="space-y-2">
              <Label htmlFor="end-date">Slutdato *</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                className="w-full"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Bemærkninger (valgfri)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Tilføj evt. bemærkninger..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Annuller
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !selectedUser || !startDate || (grantType === 'vacation' && !endDate)}
              className="gap-2 bg-gradient-to-r from-accent to-primary hover:from-accent/90 hover:to-primary/90"
            >
              <Gift size={18} weight="bold" />
              {isSubmitting ? 'Giver...' : (grantType === 'single' ? 'Giv Fridag' : 'Giv Ferie')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
