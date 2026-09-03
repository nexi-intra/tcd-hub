import { useState, useEffect } from 'react'
import { UserPlus, UserMinus, ArrowRight, ArrowLeft, Check, Gift, ShieldCheck, User as UserIcon, Warning, CalendarBlank, Trash } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { hashPassword } from '@/lib/passwords'
import { ADMIN_EMAIL, type UserRole } from '@/lib/userRoles'
import { newId } from '@/lib/utils'
import { appendToKvArray, upsertInKvArray, removeFromKvArray, setKvObjectField, deleteKvObjectField } from '@/lib/kvArrays'
import type { ShiftAssignment, VacationEntry, BirthdayEntry } from '@/lib/types'

interface WizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Kaldes efter gennemført forløb, så ManagerPanel kan genindlæse lister. */
  onCompleted: () => void
}

/** Trin-indikator (1 ● 2 ● 3) øverst i begge wizards. */
function StepIndicator({ current, labels }: { current: number; labels: string[] }) {
  return (
    <div className="flex items-center justify-center gap-2 py-2">
      {labels.map((label, i) => {
        const step = i + 1
        const isActive = step === current
        const isDone = step < current
        return (
          <div key={label} className="flex items-center gap-2">
            {i > 0 && <div className="h-px w-8 bg-border" />}
            <div className="flex items-center gap-1.5">
              <div className={
                isDone
                  ? 'h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold'
                  : isActive
                    ? 'h-6 w-6 rounded-full border-2 border-primary text-primary flex items-center justify-center text-xs font-bold'
                    : 'h-6 w-6 rounded-full border-2 border-muted-foreground/30 text-muted-foreground flex items-center justify-center text-xs font-bold'
              }>
                {isDone ? <Check size={12} weight="bold" /> : step}
              </div>
              <span className={isActive ? 'text-xs font-semibold' : 'text-xs text-muted-foreground'}>{label}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Onboarding: opret konto → fødselsdag (valgfri) → bekræft
// ---------------------------------------------------------------------------

export function OnboardingWizard({ open, onOpenChange, onCompleted }: WizardProps) {
  const [step, setStep] = useState(1)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>('user')
  const [birthDate, setBirthDate] = useState('')
  const [isWorking, setIsWorking] = useState(false)

  useEffect(() => {
    if (open) {
      setStep(1)
      setFullName('')
      setEmail('')
      setPhone('')
      setPassword('')
      setRole('user')
      setBirthDate('')
      setIsWorking(false)
    }
  }, [open])

  const validateStep1 = async (): Promise<boolean> => {
    if (!fullName.trim()) { toast.error('Navn er påkrævet'); return false }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) { toast.error('Ugyldig email adresse'); return false }
    if (password.trim().length < 6) { toast.error('Adgangskode skal være mindst 6 tegn'); return false }
    if (!phone.trim()) { toast.error('Telefon nummer er påkrævet'); return false }
    const usersData = await window.kv.get<Record<string, unknown>>('users') || {}
    if (usersData[email.trim().toLowerCase()]) { toast.error('En bruger med denne email eksisterer allerede'); return false }
    return true
  }

  const handleNext = async () => {
    if (step === 1) {
      if (await validateStep1()) setStep(2)
    } else if (step === 2) {
      setStep(3)
    }
  }

  const handleConfirm = async () => {
    setIsWorking(true)
    try {
      const normalizedEmail = email.trim().toLowerCase()

      await setKvObjectField('users', normalizedEmail, {
        email: normalizedEmail,
        password: await hashPassword(password.trim()),
        fullName: fullName.trim(),
        role,
        isManager: role === 'manager' || role === 'admin',
        phone: phone.trim(),
        // Manager-oprettede konti springer godkendelses-flowet over.
        status: 'approved',
      })

      if (birthDate) {
        const [year, month, day] = birthDate.split('-')
        await upsertInKvArray('employee-birthdays', [{
          id: normalizedEmail,
          email: normalizedEmail,
          fullName: fullName.trim(),
          birthday: `${month}-${day}`,
          birthYear: parseInt(year),
        }])
      }

      await appendToKvArray('emails', [{
        id: newId('email'),
        from: 'system@nexigroup.com',
        to: normalizedEmail,
        subject: 'Velkommen til TCD Hub!',
        message: [
          `Hej ${fullName.trim()},`,
          '',
          'Din konto er blevet oprettet, og du kan nu logge ind på TCD Hub.',
          '',
          'Her finder du bl.a. guides, vagtplan, feriekalender, madplan og meget mere.',
          '',
          'God fornøjelse!',
        ].join('\n'),
        timestamp: Date.now(),
        read: false,
      }])

      toast.success(`${fullName.trim()} er oprettet og klar til at logge ind`)
      onOpenChange(false)
      onCompleted()
    } catch (error) {
      console.error('Onboarding fejlede:', error)
      toast.error(`Kunne ikke oprette bruger: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsWorking(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus size={24} className="text-primary" weight="duotone" />
            Onboarding af ny medarbejder
          </DialogTitle>
          <DialogDescription>
            Guidet oprettelse: konto, rolle og fødselsdag på ét sted.
          </DialogDescription>
        </DialogHeader>

        <StepIndicator current={step} labels={['Konto', 'Fødselsdag', 'Bekræft']} />

        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Fulde navn</Label>
              <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Fx Anna Andersen" />
            </div>
            <div className="space-y-2">
              <Label>Arbejds-email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="anna.andersen@nexigroup.com" />
            </div>
            <div className="space-y-2">
              <Label>Telefon</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+45 12 34 56 78" />
            </div>
            <div className="space-y-2">
              <Label>Midlertidig adgangskode (min. 6 tegn)</Label>
              <Input type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Gives til medarbejderen" />
            </div>
            <div className="space-y-2">
              <Label>Rolle</Label>
              <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">
                    <div className="flex items-center gap-2"><UserIcon size={16} />Bruger</div>
                  </SelectItem>
                  <SelectItem value="manager">
                    <div className="flex items-center gap-2"><ShieldCheck size={16} />Manager</div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-muted/50 border text-sm text-muted-foreground flex items-start gap-2">
              <Gift size={18} className="mt-0.5 shrink-0 text-accent" />
              Fødselsdagen vises i feriekalenderen og fejres automatisk i appen. Trinnet kan springes over.
            </div>
            <div className="space-y-2">
              <Label>Fødselsdato (valgfri)</Label>
              <Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <div className="rounded-lg border divide-y">
              <div className="flex justify-between p-3 text-sm"><span className="text-muted-foreground">Navn</span><span className="font-semibold">{fullName}</span></div>
              <div className="flex justify-between p-3 text-sm"><span className="text-muted-foreground">Email</span><span className="font-semibold">{email.trim().toLowerCase()}</span></div>
              <div className="flex justify-between p-3 text-sm"><span className="text-muted-foreground">Telefon</span><span className="font-semibold">{phone}</span></div>
              <div className="flex justify-between p-3 text-sm"><span className="text-muted-foreground">Rolle</span><Badge variant="secondary">{role === 'manager' ? 'Manager' : 'Bruger'}</Badge></div>
              <div className="flex justify-between p-3 text-sm">
                <span className="text-muted-foreground">Fødselsdag</span>
                <span className="font-semibold">{birthDate || 'Ikke angivet'}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Kontoen godkendes automatisk, og medarbejderen modtager en velkomst-mail i TCD Hub.
            </p>
          </div>
        )}

        <DialogFooter className="gap-2">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(step - 1)} disabled={isWorking} className="gap-2">
              <ArrowLeft size={16} />
              Tilbage
            </Button>
          )}
          {step < 3 ? (
            <Button onClick={handleNext} className="gap-2">
              {step === 2 && !birthDate ? 'Spring over' : 'Næste'}
              <ArrowRight size={16} />
            </Button>
          ) : (
            <Button onClick={handleConfirm} disabled={isWorking} className="gap-2 bg-gradient-to-r from-accent to-primary hover:from-accent/90 hover:to-primary/90">
              <Check size={16} weight="bold" />
              {isWorking ? 'Opretter…' : 'Opret medarbejder'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Offboarding: vælg medarbejder → forhåndsvis oprydning → bekræft
// ---------------------------------------------------------------------------

interface OffboardingWizardProps extends WizardProps {
  currentUserEmail: string
}

interface CleanupPreview {
  shiftAssignmentIds: string[]
  hasBirthday: boolean
  pendingVacations: number
  historicalEntries: number
}

export function OffboardingWizard({ open, onOpenChange, onCompleted, currentUserEmail }: OffboardingWizardProps) {
  const [step, setStep] = useState(1)
  const [employees, setEmployees] = useState<Array<{ email: string; fullName: string }>>([])
  const [selectedEmail, setSelectedEmail] = useState('')
  const [preview, setPreview] = useState<CleanupPreview | null>(null)
  const [isWorking, setIsWorking] = useState(false)

  useEffect(() => {
    if (!open) return
    setStep(1)
    setSelectedEmail('')
    setPreview(null)
    setIsWorking(false)
    const loadEmployees = async () => {
      const usersData = await window.kv.get<Record<string, { email: string; fullName: string }>>('users') || {}
      setEmployees(
        Object.values(usersData)
          .filter(u => u.email.toLowerCase() !== ADMIN_EMAIL.toLowerCase() && u.email.toLowerCase() !== currentUserEmail.toLowerCase())
          .sort((a, b) => a.fullName.localeCompare(b.fullName, 'da'))
      )
    }
    loadEmployees()
  }, [open, currentUserEmail])

  const selectedEmployee = employees.find(e => e.email === selectedEmail)

  const buildPreview = async () => {
    if (!selectedEmployee) return
    const assignments = await window.kv.get<ShiftAssignment[]>('shift-assignments') || []
    const vacations = await window.kv.get<VacationEntry[]>('vacation-entries') || []
    const birthdays = await window.kv.get<BirthdayEntry[]>('employee-birthdays') || []

    const emailLower = selectedEmployee.email.toLowerCase()
    setPreview({
      // Historisk gemmes employeeId nogle steder som email og matches andre steder på navn — fang begge.
      shiftAssignmentIds: assignments
        .filter(a => a.employeeId?.toLowerCase() === emailLower || a.employeeName === selectedEmployee.fullName)
        .map(a => a.id),
      hasBirthday: birthdays.some(b => b.email.toLowerCase() === emailLower),
      pendingVacations: vacations.filter(v => v.userEmail.toLowerCase() === emailLower && v.status === 'pending').length,
      historicalEntries: vacations.filter(v => v.userEmail.toLowerCase() === emailLower && v.status !== 'pending').length,
    })
    setStep(2)
  }

  const handleConfirm = async () => {
    if (!selectedEmployee || !preview) return
    setIsWorking(true)
    try {
      const emailLower = selectedEmployee.email.toLowerCase()

      await deleteKvObjectField('users', selectedEmployee.email)
      if (emailLower !== selectedEmployee.email) {
        await deleteKvObjectField('users', emailLower)
      }
      if (preview.shiftAssignmentIds.length > 0) {
        await removeFromKvArray('shift-assignments', preview.shiftAssignmentIds)
      }
      if (preview.hasBirthday) {
        await removeFromKvArray('employee-birthdays', [emailLower, selectedEmployee.email])
      }
      // Afventende ferieanmodninger fjernes (giver ikke mening uden bruger);
      // godkendt/afvist historik bevares som dokumentation.
      const vacations = await window.kv.get<VacationEntry[]>('vacation-entries') || []
      const pendingIds = vacations
        .filter(v => v.userEmail.toLowerCase() === emailLower && v.status === 'pending')
        .map(v => v.id)
      if (pendingIds.length > 0) {
        await removeFromKvArray('vacation-entries', pendingIds)
      }

      toast.success(`${selectedEmployee.fullName} er offboardet — konto, vagter og fødselsdag er ryddet op`)
      onOpenChange(false)
      onCompleted()
    } catch (error) {
      console.error('Offboarding fejlede:', error)
      toast.error(`Offboarding fejlede: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsWorking(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserMinus size={24} className="text-destructive" weight="duotone" />
            Offboarding af medarbejder
          </DialogTitle>
          <DialogDescription>
            Fjerner konto, vagter, fødselsdag og afventende anmodninger i ét guidet forløb.
          </DialogDescription>
        </DialogHeader>

        <StepIndicator current={step} labels={['Vælg medarbejder', 'Forhåndsvisning', 'Bekræft']} />

        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Medarbejder der skal offboardes</Label>
              <Select value={selectedEmail} onValueChange={setSelectedEmail}>
                <SelectTrigger><SelectValue placeholder="Vælg medarbejder…" /></SelectTrigger>
                <SelectContent>
                  {employees.map(e => (
                    <SelectItem key={e.email} value={e.email}>{e.fullName} ({e.email})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {step === 2 && preview && selectedEmployee && (
          <div className="space-y-3">
            <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/20 text-sm flex items-start gap-2">
              <Warning size={18} className="mt-0.5 shrink-0 text-destructive" weight="fill" />
              <span>Følgende ryddes op for <strong>{selectedEmployee.fullName}</strong> — handlingen kan ikke fortrydes.</span>
            </div>
            <div className="rounded-lg border divide-y text-sm">
              <div className="flex items-center justify-between p-3">
                <span className="flex items-center gap-2"><Trash size={16} className="text-destructive" />Brugerkonto slettes</span>
                <Badge variant="destructive">1 konto</Badge>
              </div>
              <div className="flex items-center justify-between p-3">
                <span className="flex items-center gap-2"><CalendarBlank size={16} className="text-destructive" />Vagt-tildelinger fjernes</span>
                <Badge variant={preview.shiftAssignmentIds.length > 0 ? 'destructive' : 'secondary'}>
                  {preview.shiftAssignmentIds.length} {preview.shiftAssignmentIds.length === 1 ? 'vagt' : 'vagter'}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3">
                <span className="flex items-center gap-2"><Gift size={16} className="text-destructive" />Fødselsdag fjernes</span>
                <Badge variant={preview.hasBirthday ? 'destructive' : 'secondary'}>{preview.hasBirthday ? 'Ja' : 'Ingen registreret'}</Badge>
              </div>
              <div className="flex items-center justify-between p-3">
                <span className="flex items-center gap-2"><Trash size={16} className="text-destructive" />Afventende ferieanmodninger fjernes</span>
                <Badge variant={preview.pendingVacations > 0 ? 'destructive' : 'secondary'}>{preview.pendingVacations}</Badge>
              </div>
              <div className="flex items-center justify-between p-3">
                <span className="flex items-center gap-2"><Check size={16} className="text-primary" />Ferie-/sygehistorik bevares</span>
                <Badge variant="secondary">{preview.historicalEntries} poster</Badge>
              </div>
            </div>
          </div>
        )}

        {step === 3 && selectedEmployee && (
          <div className="p-4 rounded-lg bg-destructive/10 border-2 border-destructive/30 text-center space-y-2">
            <Warning size={32} className="text-destructive mx-auto" weight="fill" />
            <p className="font-semibold">Er du helt sikker?</p>
            <p className="text-sm text-muted-foreground">
              <strong>{selectedEmployee.fullName}</strong> mister adgang til TCD Hub, og alle deres vagter fjernes fra vagtplanen.
            </p>
          </div>
        )}

        <DialogFooter className="gap-2">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(step - 1)} disabled={isWorking} className="gap-2">
              <ArrowLeft size={16} />
              Tilbage
            </Button>
          )}
          {step === 1 && (
            <Button onClick={buildPreview} disabled={!selectedEmail} className="gap-2">
              Næste
              <ArrowRight size={16} />
            </Button>
          )}
          {step === 2 && (
            <Button onClick={() => setStep(3)} variant="destructive" className="gap-2">
              Fortsæt
              <ArrowRight size={16} />
            </Button>
          )}
          {step === 3 && (
            <Button onClick={handleConfirm} disabled={isWorking} variant="destructive" className="gap-2">
              <UserMinus size={16} weight="bold" />
              {isWorking ? 'Offboarder…' : 'Offboard medarbejder'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
