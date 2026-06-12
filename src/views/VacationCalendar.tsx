import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Plus, Trash, User, Check, X, ClockCounterClockwise, CalendarDot } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useKV } from '@github/spark/hooks'
import { UserProfile } from '@/components/UserProfile'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

type VacationStatus = 'pending' | 'approved' | 'rejected'

interface VacationEntry {
  id: string
  userId: string
  userEmail: string
  startDate: string
  endDate: string
  notes?: string
  status: VacationStatus
  reviewedBy?: string
  reviewedAt?: string
}

interface VacationCalendarProps {
  onNavigateBack: () => void
  onLogout: () => void
  userEmail: string
}

export function VacationCalendar({ onNavigateBack, onLogout, userEmail }: VacationCalendarProps) {
  const [vacations, setVacations] = useKV<VacationEntry[]>('vacation-entries', [])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [notes, setNotes] = useState('')
  const [isManager, setIsManager] = useState(false)

  const months = [
    'Januar', 'Februar', 'Marts', 'April', 'Maj', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'December'
  ]

  useEffect(() => {
    const checkManagerStatus = async () => {
      const usersData = await window.spark.kv.get<Record<string, { email: string; password: string; fullName: string; isManager: boolean }>>('users')
      if (usersData && usersData[userEmail]) {
        setIsManager(usersData[userEmail].isManager || false)
      }
    }
    checkManagerStatus()
  }, [userEmail])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onNavigateBack()
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onNavigateBack])

  const isWeekend = (date: Date) => {
    const day = date.getDay()
    return day === 0 || day === 6
  }

  const handleAddVacation = async () => {
    try {
      if (!startDate || !endDate) {
        toast.error('Vælg både start- og slutdato')
        return
      }

      const start = new Date(startDate)
      const end = new Date(endDate)

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        toast.error('Ugyldig dato valgt')
        return
      }

      if (end < start) {
        toast.error('Slutdato skal være efter startdato')
        return
      }

      const current = new Date(start)
      while (current <= end) {
        if (isWeekend(current)) {
          toast.error('Ferier kan ikke registreres på weekender. Vi arbejder ikke lørdag eller søndag.')
          return
        }
        current.setDate(current.getDate() + 1)
      }

      const newVacation: VacationEntry = {
        id: Date.now().toString(),
        userId: userEmail,
        userEmail: userEmail,
        startDate,
        endDate,
        notes: notes.trim() || undefined,
        status: 'pending',
      }

      setVacations((current) => [...(current || []), newVacation])
      
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
      const notesText = notes.trim() ? `Noter: ${notes.trim()}` : 'Ingen noter'

      try {
        const promptText = window.spark.llmPrompt`Generate a professional email notification to send to Jacob Remmer (Jacob.remmer@nexigroup.com) about a vacation request.

Employee: ${userEmail}
Start Date: ${startDateFormatted}
End Date: ${endDateFormatted}
${notesText}

The email should be in Danish, professional, and include:
- A clear subject line
- Employee email
- The vacation period
- Any notes if provided
- A note that this request is pending approval
- A brief note that this is an automatic notification

Return ONLY a JSON object with this exact structure:
{
  "subject": "subject line here",
  "body": "email body here with proper line breaks"
}`

        const emailContentJson = await window.spark.llm(promptText, "gpt-4o-mini", true)
        const emailContent = JSON.parse(emailContentJson)
        
        const emails = await window.spark.kv.get<Array<{
          id: string
          from: string
          to: string
          subject: string
          message: string
          timestamp: number
          read: boolean
        }>>('emails') || []

        const newEmail = {
          id: Date.now().toString() + '-vacation-request',
          from: userEmail,
          to: 'Jacob.remmer@nexigroup.com',
          subject: emailContent.subject,
          message: emailContent.body,
          timestamp: Date.now(),
          read: false
        }

        await window.spark.kv.set('emails', [...emails, newEmail])
      } catch (emailError) {
        console.error('Error generating vacation request email:', emailError)
      }
      
      setStartDate('')
      setEndDate('')
      setNotes('')
      setIsDialogOpen(false)
      
      toast.success('Ferie anmodning sendt til godkendelse')
    } catch (error) {
      console.error('Error adding vacation:', error)
      toast.error('Der opstod en fejl. Prøv igen.')
    }
  }

  const handleDeleteVacation = (id: string) => {
    setVacations((current) => (current || []).filter((v) => v.id !== id))
    toast.success('Ferie slettet')
  }

  const handleApproveVacation = async (id: string) => {
    const vacation = (vacations || []).find(v => v.id === id)
    if (!vacation) return

    setVacations((current) =>
      (current || []).map((v) =>
        v.id === id
          ? { ...v, status: 'approved' as VacationStatus, reviewedBy: userEmail, reviewedAt: new Date().toISOString() }
          : v
      )
    )
    toast.success('Ferie godkendt')

    const startDateFormatted = new Date(vacation.startDate).toLocaleDateString('da-DK', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
    const endDateFormatted = new Date(vacation.endDate).toLocaleDateString('da-DK', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })

    const promptText = window.spark.llmPrompt`Generate a professional email notification to send to ${vacation.userEmail} about their vacation request being APPROVED.

Vacation Request Details:
Start Date: ${startDateFormatted}
End Date: ${endDateFormatted}
${vacation.notes ? `Notes: ${vacation.notes}` : 'No notes'}
Approved by: ${userEmail}

The email should be in Danish, friendly yet professional, and include:
- A clear subject line that indicates approval
- Confirmation that the vacation request has been approved
- The vacation period details
- The name/email of who approved it
- A congratulatory or positive tone
- A brief note that this is an automatic notification

Return ONLY a JSON object with this exact structure:
{
  "subject": "subject line here",
  "body": "email body here with proper line breaks"
}`

    try {
      const emailContentJson = await window.spark.llm(promptText, "gpt-4o-mini", true)
      const emailContent = JSON.parse(emailContentJson)
      
      const emails = await window.spark.kv.get<Array<{
        id: string
        from: string
        to: string
        subject: string
        message: string
        timestamp: number
        read: boolean
      }>>('emails') || []

      const newEmail = {
        id: Date.now().toString() + '-approval',
        from: userEmail,
        to: vacation.userEmail,
        subject: emailContent.subject,
        message: emailContent.body,
        timestamp: Date.now(),
        read: false
      }

      await window.spark.kv.set('emails', [...emails, newEmail])

      const notification = {
        id: Date.now().toString(),
        type: 'email' as const,
        message: `Din ferieansøgning blev godkendt!`,
        timestamp: Date.now(),
        read: false,
        from: userEmail,
        emailId: newEmail.id
      }

      const notifications = await window.spark.kv.get<any[]>('email-notifications') || []
      await window.spark.kv.set('email-notifications', [...notifications, notification])
    } catch (emailError) {
      console.error('Error sending vacation approval email:', emailError)
      toast.error('Kunne ikke sende email notifikation')
    }
  }

  const handleRejectVacation = async (id: string) => {
    const vacation = (vacations || []).find(v => v.id === id)
    if (!vacation) return

    setVacations((current) =>
      (current || []).map((v) =>
        v.id === id
          ? { ...v, status: 'rejected' as VacationStatus, reviewedBy: userEmail, reviewedAt: new Date().toISOString() }
          : v
      )
    )
    toast.error('Ferie afvist')

    const startDateFormatted = new Date(vacation.startDate).toLocaleDateString('da-DK', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
    const endDateFormatted = new Date(vacation.endDate).toLocaleDateString('da-DK', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })

    const promptText = window.spark.llmPrompt`Generate a professional email notification to send to ${vacation.userEmail} about their vacation request being REJECTED.

Vacation Request Details:
Start Date: ${startDateFormatted}
End Date: ${endDateFormatted}
${vacation.notes ? `Notes: ${vacation.notes}` : 'No notes'}
Rejected by: ${userEmail}

The email should be in Danish, professional and respectful, and include:
- A clear subject line that indicates rejection
- Polite notification that the vacation request has been rejected
- The vacation period details
- The name/email of who rejected it
- A professional and understanding tone
- Suggestion that they can contact the manager for more information or to discuss alternative dates
- A brief note that this is an automatic notification

Return ONLY a JSON object with this exact structure:
{
  "subject": "subject line here",
  "body": "email body here with proper line breaks"
}`

    try {
      const emailContentJson = await window.spark.llm(promptText, "gpt-4o-mini", true)
      const emailContent = JSON.parse(emailContentJson)
      
      const emails = await window.spark.kv.get<Array<{
        id: string
        from: string
        to: string
        subject: string
        message: string
        timestamp: number
        read: boolean
      }>>('emails') || []

      const newEmail = {
        id: Date.now().toString() + '-rejection',
        from: userEmail,
        to: vacation.userEmail,
        subject: emailContent.subject,
        message: emailContent.body,
        timestamp: Date.now(),
        read: false
      }

      await window.spark.kv.set('emails', [...emails, newEmail])

      const notification = {
        id: Date.now().toString(),
        type: 'email' as const,
        message: `Din ferieansøgning blev afvist`,
        timestamp: Date.now(),
        read: false,
        from: userEmail,
        emailId: newEmail.id
      }

      const notifications = await window.spark.kv.get<any[]>('email-notifications') || []
      await window.spark.kv.set('email-notifications', [...notifications, notification])
    } catch (emailError) {
      console.error('Error sending vacation rejection email:', emailError)
      toast.error('Kunne ikke sende email notifikation')
    }
  }

  const getVacationsForMonth = (month: number, year: number) => {
    return (vacations || []).filter((vacation) => {
      const start = new Date(vacation.startDate)
      const end = new Date(vacation.endDate)
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return false
      
      const monthStart = new Date(year, month, 1)
      const monthEnd = new Date(year, month + 1, 0)

      return (start <= monthEnd && end >= monthStart) && vacation.status === 'approved'
    })
  }

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (month: number, year: number) => {
    const day = new Date(year, month, 1).getDay()
    return day === 0 ? 6 : day - 1
  }

  const isDateInVacation = (day: number, vacation: VacationEntry) => {
    const checkDate = new Date(selectedYear, selectedMonth, day)
    const start = new Date(vacation.startDate)
    const end = new Date(vacation.endDate)
    
    start.setHours(0, 0, 0, 0)
    end.setHours(23, 59, 59, 999)
    checkDate.setHours(12, 0, 0, 0)

    return checkDate >= start && checkDate <= end
  }

  const getDayVacations = (day: number) => {
    return getVacationsForMonth(selectedMonth, selectedYear).filter((vacation) =>
      isDateInVacation(day, vacation)
    )
  }

  const daysInMonth = getDaysInMonth(selectedMonth, selectedYear)
  const firstDay = getFirstDayOfMonth(selectedMonth, selectedYear)

  const userColors = ['oklch(0.50 0.27 262)', 'oklch(0.55 0.24 192)', 'oklch(0.65 0.26 340)', 'oklch(0.60 0.22 220)', 'oklch(0.62 0.20 150)']
  
  const getUserColor = (email: string) => {
    const hash = email.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    return userColors[hash % userColors.length]
  }

  const uniqueUsers = Array.from(new Set((vacations || []).map(v => v.userEmail)))

  const myVacations = (vacations || []).filter(v => v.userEmail === userEmail)
  const pendingRequests = (vacations || []).filter(v => v.status === 'pending' && v.userEmail !== userEmail)
  const myPendingRequests = myVacations.filter(v => v.status === 'pending')
  const myApprovedVacations = myVacations.filter(v => v.status === 'approved')
  const myRejectedVacations = myVacations.filter(v => v.status === 'rejected')

  const handleJumpToToday = () => {
    const today = new Date()
    setSelectedMonth(today.getMonth())
    setSelectedYear(today.getFullYear())
    toast.success('Sprang til i dag')
  }

  const getStatusBadge = (status: VacationStatus) => {
    if (status === 'pending') {
      return (
        <Badge className="bg-amber-500/20 text-amber-700 border-amber-500/30">
          <ClockCounterClockwise size={14} className="mr-1" />
          Afventer
        </Badge>
      )
    }
    if (status === 'approved') {
      return (
        <Badge className="bg-green-500/20 text-green-700 border-green-500/30">
          <Check size={14} className="mr-1" />
          Godkendt
        </Badge>
      )
    }
    return (
      <Badge className="bg-red-500/20 text-red-700 border-red-500/30">
        <X size={14} className="mr-1" />
        Afvist
      </Badge>
    )
  }

  const renderVacationCard = (vacation: VacationEntry, showActions: boolean = false, showReviewActions: boolean = false) => (
    <motion.div
      key={vacation.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center justify-between p-4 rounded-lg border bg-card"
    >
      <div className="flex items-center gap-4 flex-1">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white flex-shrink-0"
          style={{ backgroundColor: getUserColor(vacation.userEmail) }}
        >
          <User size={20} weight="bold" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold">
            {new Date(vacation.startDate).toLocaleDateString('da-DK', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })}
            {' → '}
            {new Date(vacation.endDate).toLocaleDateString('da-DK', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })}
          </div>
          {vacation.notes && (
            <div className="text-sm text-muted-foreground">{vacation.notes}</div>
          )}
          {showReviewActions && (
            <div className="text-xs text-muted-foreground mt-1">
              Anmodet af: {vacation.userEmail}
            </div>
          )}
          <div className="mt-2">
            {getStatusBadge(vacation.status)}
          </div>
          {vacation.reviewedBy && (
            <div className="text-xs text-muted-foreground mt-1">
              Behandlet af: {vacation.reviewedBy}
            </div>
          )}
        </div>
      </div>
      <div className="flex gap-2 ml-4">
        {showReviewActions && (
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleApproveVacation(vacation.id)}
              className="text-green-600 hover:bg-green-500/10"
            >
              <Check size={20} weight="bold" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleRejectVacation(vacation.id)}
              className="text-red-600 hover:bg-red-500/10"
            >
              <X size={20} weight="bold" />
            </Button>
          </>
        )}
        {showActions && vacation.status === 'pending' && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleDeleteVacation(vacation.id)}
            className="text-destructive hover:bg-destructive/10"
          >
            <Trash size={20} />
          </Button>
        )}
      </div>
    </motion.div>
  )

  return (
    <div className="min-h-screen relative overflow-hidden">

      <div className="absolute top-4 right-4 z-20">
        <UserProfile userEmail={userEmail} onLogout={onLogout} />
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={onNavigateBack}
              className="hover:bg-primary/10"
            >
              <ArrowLeft size={24} />
            </Button>
            <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-br from-primary via-secondary to-accent bg-clip-text text-transparent">
              Feriekalender
            </h1>
            {isManager && (
              <Badge className="bg-gradient-to-r from-primary to-secondary text-white">
                Manager
              </Badge>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="space-y-6"
        >
          <Card className="p-6 border-2">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (selectedMonth === 0) {
                        setSelectedMonth(11)
                        setSelectedYear(selectedYear - 1)
                      } else {
                        setSelectedMonth(selectedMonth - 1)
                      }
                    }}
                  >
                    ←
                  </Button>
                  <h2 className="text-2xl font-bold">
                    {months[selectedMonth]} {selectedYear}
                  </h2>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (selectedMonth === 11) {
                        setSelectedMonth(0)
                        setSelectedYear(selectedYear + 1)
                      } else {
                        setSelectedMonth(selectedMonth + 1)
                      }
                    }}
                  >
                    →
                  </Button>
                </div>
                <Button
                  variant="outline"
                  onClick={handleJumpToToday}
                  className="gap-2"
                >
                  <CalendarDot size={18} weight="fill" />
                  I dag
                </Button>
              </div>

              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-primary via-secondary to-accent text-white">
                    <Plus size={20} className="mr-2" />
                    Anmod om Ferie
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Anmod om Ferie</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="start-date">Startdato</Label>
                      <Input
                        id="start-date"
                        type="date"
                        value={startDate}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={(e) => {
                          const selectedDate = new Date(e.target.value)
                          const dayOfWeek = selectedDate.getDay()
                          if (dayOfWeek === 0 || dayOfWeek === 6) {
                            toast.error('Du kan ikke vælge weekenddage (lørdag eller søndag)')
                            return
                          }
                          setStartDate(e.target.value)
                        }}
                      />
                    </div>
                    <div>
                      <Label htmlFor="end-date">Slutdato</Label>
                      <Input
                        id="end-date"
                        type="date"
                        value={endDate}
                        min={startDate || new Date().toISOString().split('T')[0]}
                        onChange={(e) => {
                          const selectedDate = new Date(e.target.value)
                          const dayOfWeek = selectedDate.getDay()
                          if (dayOfWeek === 0 || dayOfWeek === 6) {
                            toast.error('Du kan ikke vælge weekenddage (lørdag eller søndag)')
                            return
                          }
                          setEndDate(e.target.value)
                        }}
                      />
                    </div>
                    <div>
                      <Label htmlFor="notes">Noter (valgfrit)</Label>
                      <Input
                        id="notes"
                        type="text"
                        placeholder="F.eks. sommerferie, juleferie..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      />
                    </div>
                    <Button
                      onClick={handleAddVacation}
                      className="w-full bg-gradient-to-r from-primary via-secondary to-accent text-white"
                    >
                      Send Anmodning
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'].map((day, index) => (
                <div
                  key={day}
                  className={cn(
                    "text-center font-semibold text-sm py-2",
                    index >= 5 ? "text-muted-foreground/60" : "text-muted-foreground"
                  )}
                >
                  {day}
                </div>
              ))}

              {Array.from({ length: firstDay }).map((_, index) => (
                <div key={`empty-${index}`} className="aspect-square" />
              ))}

              {Array.from({ length: daysInMonth }).map((_, index) => {
                const day = index + 1
                const dayVacations = getDayVacations(day)
                const currentDate = new Date(selectedYear, selectedMonth, day)
                const dayOfWeek = currentDate.getDay()
                const isWeekendDay = dayOfWeek === 0 || dayOfWeek === 6
                const isToday =
                  day === new Date().getDate() &&
                  selectedMonth === new Date().getMonth() &&
                  selectedYear === new Date().getFullYear()

                return (
                  <div
                    key={day}
                    className={cn(
                      "aspect-square border rounded-lg p-1 relative",
                      isToday && "ring-2 ring-primary",
                      isWeekendDay && "bg-muted/50 opacity-60"
                    )}
                  >
                    <div className={cn(
                      "text-xs font-semibold mb-1",
                      isWeekendDay && "text-muted-foreground"
                    )}>
                      {day}
                    </div>
                    {isWeekendDay ? (
                      <div className="text-[7px] text-muted-foreground text-center mt-2">
                        Lukket
                      </div>
                    ) : (
                      <div className="space-y-0.5">
                        {dayVacations.slice(0, 3).map((vacation) => (
                          <div
                            key={vacation.id}
                            className="text-[8px] px-1 py-0.5 rounded text-white truncate"
                            style={{ backgroundColor: getUserColor(vacation.userEmail) }}
                            title={`${vacation.userEmail}${vacation.notes ? ': ' + vacation.notes : ''}`}
                          >
                            {vacation.userEmail.split('@')[0]}
                          </div>
                        ))}
                        {dayVacations.length > 3 && (
                          <div className="text-[8px] text-muted-foreground">
                            +{dayVacations.length - 3}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </Card>

          {isManager && pendingRequests.length > 0 && (
            <Card className="p-6 border-2">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-xl font-bold">Afventende Anmodninger</h3>
                <Badge className="bg-amber-500/20 text-amber-700 border-amber-500/30">
                  {pendingRequests.length}
                </Badge>
              </div>
              <div className="space-y-3">
                {pendingRequests
                  .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
                  .map((vacation) => renderVacationCard(vacation, false, true))}
              </div>
            </Card>
          )}

          <Card className="p-6 border-2">
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all">Alle ({myVacations.length})</TabsTrigger>
                <TabsTrigger value="pending">Afventer ({myPendingRequests.length})</TabsTrigger>
                <TabsTrigger value="approved">Godkendt ({myApprovedVacations.length})</TabsTrigger>
                <TabsTrigger value="rejected">Afvist ({myRejectedVacations.length})</TabsTrigger>
              </TabsList>
              <TabsContent value="all" className="mt-4">
                <h3 className="text-xl font-bold mb-4">Mine Ferier</h3>
                {myVacations.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Du har ikke registreret nogen ferier endnu
                  </p>
                ) : (
                  <div className="space-y-3">
                    {myVacations
                      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
                      .map((vacation) => renderVacationCard(vacation, true))}
                  </div>
                )}
              </TabsContent>
              <TabsContent value="pending" className="mt-4">
                <h3 className="text-xl font-bold mb-4">Afventende Anmodninger</h3>
                {myPendingRequests.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Du har ingen afventende anmodninger
                  </p>
                ) : (
                  <div className="space-y-3">
                    {myPendingRequests
                      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
                      .map((vacation) => renderVacationCard(vacation, true))}
                  </div>
                )}
              </TabsContent>
              <TabsContent value="approved" className="mt-4">
                <h3 className="text-xl font-bold mb-4">Godkendte Ferier</h3>
                {myApprovedVacations.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Du har ingen godkendte ferier
                  </p>
                ) : (
                  <div className="space-y-3">
                    {myApprovedVacations
                      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
                      .map((vacation) => renderVacationCard(vacation))}
                  </div>
                )}
              </TabsContent>
              <TabsContent value="rejected" className="mt-4">
                <h3 className="text-xl font-bold mb-4">Afviste Anmodninger</h3>
                {myRejectedVacations.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Du har ingen afviste anmodninger
                  </p>
                ) : (
                  <div className="space-y-3">
                    {myRejectedVacations
                      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
                      .map((vacation) => renderVacationCard(vacation))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </Card>

          {uniqueUsers.length > 1 && (
            <Card className="p-6 border-2">
              <h3 className="text-xl font-bold mb-4">Alle Team Medlemmer</h3>
              <div className="flex flex-wrap gap-3">
                {uniqueUsers.map((email) => (
                  <div
                    key={email}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-card"
                  >
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: getUserColor(email) }}
                    >
                      {email.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-medium">{email}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </motion.div>
      </div>
    </div>
  )
}
