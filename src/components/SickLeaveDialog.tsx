import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { FirstAidKit, X } from '@phosphor-icons/react'
import { format } from 'date-fns'
import { da } from 'date-fns/locale'
import { toast } from 'sonner'

interface SickLeaveDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userEmail: string
}

interface SickLeaveEntry {
  id: string
  userEmail: string
  userName: string
  startDate: string
  reason?: string
  status: 'pending' | 'approved' | 'rejected'
  submittedAt: string
}

export function SickLeaveDialog({ open, onOpenChange, userEmail }: SickLeaveDialogProps) {
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [userName, setUserName] = useState('')

  useEffect(() => {
    const fetchUserName = async () => {
      const usersData = await window.spark.kv.get<Record<string, { email: string; password: string; fullName: string }>>('users')
      if (usersData && usersData[userEmail]) {
        setUserName(usersData[userEmail].fullName || userEmail)
      }
    }
    if (open) {
      fetchUserName()
    }
  }, [open, userEmail])

  const handleSubmit = async () => {
    setIsSubmitting(true)
    const today = new Date()
    
    try {
      const sickLeaveEntries = await window.spark.kv.get<SickLeaveEntry[]>('sick-leave-entries') || []
      
      const newEntry: SickLeaveEntry = {
        id: `sick-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userEmail,
        userName,
        startDate: today.toISOString(),
        reason,
        status: 'approved',
        submittedAt: new Date().toISOString(),
      }

      await window.spark.kv.set('sick-leave-entries', [...sickLeaveEntries, newEntry])

      const dateFormatted = format(today, 'd. MMMM yyyy', { locale: da })
      
      const emailSubject = `Sygemelding - ${userName}`
      const emailBody = `Hej Jacob,

${userName} (${userEmail}) har meldt sig syg.

Dato: ${dateFormatted}

${reason ? `Bemærkninger:\n${reason}\n\n` : ''}Denne notifikation er automatisk genereret fra Terminal Configuration & Dispatch Hub.

Med venlig hilsen,
Terminal Configuration & Dispatch Hub`

      try {
        const emailNotifications = await window.spark.kv.get<Array<{
          id: string
          to: string
          subject: string
          body: string
          timestamp: string
          type: 'sick-leave' | 'vacation-request' | 'vacation-approved' | 'vacation-rejected'
          read: boolean
        }>>('email-notifications') || []
        
        await window.spark.kv.set('email-notifications', [...emailNotifications, {
          id: `email-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          to: 'Jacob.remmer@nexigroup.com',
          subject: emailSubject,
          body: emailBody,
          timestamp: new Date().toISOString(),
          type: 'sick-leave',
          read: false
        }])

        toast.success('✅ Sygemelding registreret', {
          description: `Din sygemelding fra ${format(today, 'd. MMMM yyyy', { locale: da })} er registreret.\n\n📧 Notifikation til Jacob Remmer (Jacob.remmer@nexigroup.com) er gemt og kan ses under "Email Notifikationer" i hubben.`,
          duration: 8000
        })
      } catch (emailError) {
        console.error('Error saving email notification:', emailError)
        toast.warning('Sygemelding registreret', {
          description: `Din sygemelding fra ${format(today, 'd. MMMM yyyy', { locale: da })} er registreret, men email notifikationen kunne ikke gemmes.`,
          duration: 5000
        })
      }

      setReason('')
      onOpenChange(false)
    } catch (error) {
      console.error('Error submitting sick leave:', error)
      toast.error('Kunne ikke indsende sygemelding', {
        description: 'Prøv venligst igen'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setReason('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[oklch(0.58_0.25_25)] to-[oklch(0.65_0.26_340)] flex items-center justify-center">
              <FirstAidKit size={24} weight="duotone" className="text-white" />
            </div>
            <div>
              <DialogTitle className="text-2xl">Sygemelding</DialogTitle>
              <DialogDescription>
                Indsend din sygemelding med periode og eventuel begrundelse
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="userName">Medarbejder</Label>
              <Input
                id="userName"
                value={userName}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="grid gap-2">
              <Label>Dato</Label>
              <Input
                value={format(new Date(), 'd. MMMM yyyy', { locale: da })}
                disabled
                className="bg-muted"
              />
              <p className="text-sm text-muted-foreground">
                Sygemeldingen registreres automatisk fra dags dato
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="reason">Bemærkninger (valgfrit)</Label>
              <Textarea
                id="reason"
                placeholder="Eventuelle bemærkninger til din sygemelding..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isSubmitting}
            className="gap-2"
          >
            <X size={18} />
            Annuller
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-gradient-to-r from-[oklch(0.58_0.25_25)] to-[oklch(0.65_0.26_340)] hover:from-[oklch(0.55_0.25_25)] hover:to-[oklch(0.62_0.26_340)] text-white gap-2"
          >
            <FirstAidKit size={18} weight="duotone" />
            {isSubmitting ? 'Indsender...' : 'Indsend sygemelding'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
