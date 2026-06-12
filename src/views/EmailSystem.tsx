import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ArrowLeft, 
  PaperPlaneTilt, 
  Envelope, 
  EnvelopeOpen, 
  MagnifyingGlass,
  Trash,
  X,
  User,
  Clock,
  Paperclip,
  Funnel,
  CalendarBlank,
  Check,
  Umbrella
} from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useKV } from '@github/spark/hooks'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Email {
  id: string
  from: string
  to: string
  subject: string
  message: string
  timestamp: number
  read: boolean
  starred?: boolean
}

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

interface EmailSystemProps {
  onNavigateBack: () => void
  onLogout: () => void
  userEmail: string
}

export function EmailSystem({ onNavigateBack, userEmail }: EmailSystemProps) {
  const [emails, setEmails] = useKV<Email[]>('emails', [])
  const [vacations, setVacations] = useKV<VacationEntry[]>('vacation-entries', [])
  const [users, setUsers] = useState<Array<{ email: string; name: string }>>([])
  const [isManager, setIsManager] = useState(false)
  const [view, setView] = useState<'inbox' | 'sent' | 'compose' | 'vacation-requests'>('inbox')
  const [selectedVacation, setSelectedVacation] = useState<VacationEntry | null>(null)
  const [showCalendarPreview, setShowCalendarPreview] = useState(false)
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFilter, setDateFilter] = useState<string>('all')
  const [senderFilter, setSenderFilter] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)
  const [composeData, setComposeData] = useState({
    to: '',
    subject: '',
    message: ''
  })

  useEffect(() => {
    const loadUsers = async () => {
      const usersData = await window.spark.kv.get<Record<string, { email: string; fullName: string; isManager: boolean }>>('users')
      
      if (usersData && typeof usersData === 'object' && !Array.isArray(usersData)) {
        const userList = Object.values(usersData).map(user => ({
          email: user.email,
          name: user.fullName
        }))
        setUsers(userList)
        
        if (usersData[userEmail]) {
          setIsManager(usersData[userEmail].isManager || false)
        }
      } else if (Array.isArray(usersData)) {
        setUsers(usersData as Array<{ email: string; name: string }>)
      }
    }
    
    loadUsers()
  }, [userEmail])

  const getInitials = (email: string) => {
    const name = email.split('@')[0]
    const parts = name.split('.')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Lige nu'
    if (diffMins < 60) return `${diffMins} min siden`
    if (diffHours < 24) return `${diffHours} time${diffHours > 1 ? 'r' : ''} siden`
    if (diffDays < 7) return `${diffDays} dag${diffDays > 1 ? 'e' : ''} siden`
    
    return date.toLocaleDateString('da-DK', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const filterByDate = (email: Email) => {
    if (dateFilter === 'all') return true
    
    const now = Date.now()
    const emailDate = email.timestamp
    const dayInMs = 86400000
    
    switch (dateFilter) {
      case 'today':
        return now - emailDate < dayInMs
      case 'week':
        return now - emailDate < dayInMs * 7
      case 'month':
        return now - emailDate < dayInMs * 30
      default:
        return true
    }
  }

  const filterBySender = (email: Email) => {
    if (senderFilter === 'all') return true
    return view === 'inbox' ? email.from === senderFilter : email.to === senderFilter
  }

  const uniqueSenders = Array.from(
    new Set(
      (emails || [])
        .filter(email => view === 'inbox' ? email.to === userEmail : email.from === userEmail)
        .map(email => view === 'inbox' ? email.from : email.to)
    )
  )

  const inboxEmails = (emails || [])
    .filter(email => email.to === userEmail)
    .filter(email => 
      searchQuery === '' || 
      email.from.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.message.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .filter(filterByDate)
    .filter(filterBySender)
    .sort((a, b) => b.timestamp - a.timestamp)

  const sentEmails = (emails || [])
    .filter(email => email.from === userEmail)
    .filter(email => 
      searchQuery === '' || 
      email.to.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.message.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .filter(filterByDate)
    .filter(filterBySender)
    .sort((a, b) => b.timestamp - a.timestamp)

  const unreadCount = inboxEmails.filter(email => !email.read).length

  const handleSendEmail = async () => {
    if (!composeData.to || !composeData.subject || !composeData.message) {
      toast.error('Udfyld venligst alle felter')
      return
    }

    const userExists = (users || []).some(u => u.email === composeData.to)
    if (!userExists) {
      toast.error('Brugeren findes ikke i systemet')
      return
    }

    const newEmail: Email = {
      id: Date.now().toString(),
      from: userEmail,
      to: composeData.to,
      subject: composeData.subject,
      message: composeData.message,
      timestamp: Date.now(),
      read: false
    }

    setEmails(currentEmails => [...(currentEmails || []), newEmail])

    const notification = {
      id: Date.now().toString(),
      type: 'email' as const,
      message: `Ny email fra ${userEmail}: ${composeData.subject}`,
      timestamp: Date.now(),
      read: false,
      from: userEmail,
      emailId: newEmail.id
    }

    const notifications = await window.spark.kv.get<any[]>('email-notifications') || []
    await window.spark.kv.set('email-notifications', [...notifications, notification])

    toast.success('Email sendt!')
    setComposeData({ to: '', subject: '', message: '' })
    setView('sent')
  }

  const handleMarkAsRead = (emailId: string) => {
    setEmails(currentEmails =>
      (currentEmails || []).map(email =>
        email.id === emailId ? { ...email, read: true } : email
      )
    )
  }

  const handleDeleteEmail = (emailId: string) => {
    setEmails(currentEmails => (currentEmails || []).filter(email => email.id !== emailId))
    setSelectedEmail(null)
    toast.success('Email slettet')
  }

  const handleEmailClick = (email: Email) => {
    setSelectedEmail(email)
    if (!email.read && email.to === userEmail) {
      handleMarkAsRead(email.id)
    }
  }

  const pendingVacationRequests = (vacations || []).filter(v => v.status === 'pending')

  const handleApproveVacation = async (vacation: VacationEntry) => {
    setVacations((current) =>
      (current || []).map((v) =>
        v.id === vacation.id
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

    try {
      const prompt = `Generate a professional email notification to send to ${vacation.userEmail} about their vacation request being APPROVED.

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

      const emailContentJson = await window.spark.llm(prompt, "gpt-4o-mini", true)
      const emailContent = JSON.parse(emailContentJson)

      const newEmail = {
        id: Date.now().toString() + '-approval',
        from: userEmail,
        to: vacation.userEmail,
        subject: emailContent.subject,
        message: emailContent.body,
        timestamp: Date.now(),
        read: false
      }

      setEmails(currentEmails => [...(currentEmails || []), newEmail])

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
    }

    setSelectedVacation(null)
    setShowCalendarPreview(false)
  }

  const handleRejectVacation = async (vacation: VacationEntry) => {
    setVacations((current) =>
      (current || []).map((v) =>
        v.id === vacation.id
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

    try {
      const prompt = `Generate a professional email notification to send to ${vacation.userEmail} about their vacation request being REJECTED.

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

      const emailContentJson = await window.spark.llm(prompt, "gpt-4o-mini", true)
      const emailContent = JSON.parse(emailContentJson)

      const newEmail = {
        id: Date.now().toString() + '-rejection',
        from: userEmail,
        to: vacation.userEmail,
        subject: emailContent.subject,
        message: emailContent.body,
        timestamp: Date.now(),
        read: false
      }

      setEmails(currentEmails => [...(currentEmails || []), newEmail])

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
    }

    setSelectedVacation(null)
    setShowCalendarPreview(false)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('da-DK', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay()
  }

  const isDateInRange = (day: number, month: number, year: number, startDate: string, endDate: string) => {
    const currentDate = new Date(year, month, day)
    const start = new Date(startDate)
    const end = new Date(endDate)
    return currentDate >= start && currentDate <= end
  }

  const renderCalendarPreview = () => {
    if (!selectedVacation) return null

    const today = new Date()
    const startDate = new Date(selectedVacation.startDate)
    const endDate = new Date(selectedVacation.endDate)
    
    const monthToShow = startDate.getMonth()
    const yearToShow = startDate.getFullYear()

    const daysInMonth = getDaysInMonth(monthToShow, yearToShow)
    const firstDay = getFirstDayOfMonth(monthToShow, yearToShow)
    const monthName = new Date(yearToShow, monthToShow).toLocaleDateString('da-DK', { month: 'long', year: 'numeric' })

    const weekdays = ['Søn', 'Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør']
    const days = []

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-10" />)
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(yearToShow, monthToShow, day)
      const isWeekend = currentDate.getDay() === 0 || currentDate.getDay() === 6
      const isInVacationRange = isDateInRange(day, monthToShow, yearToShow, selectedVacation.startDate, selectedVacation.endDate)
      const isApprovedVacation = (vacations || []).some(v => 
        v.status === 'approved' && 
        v.id !== selectedVacation.id &&
        isDateInRange(day, monthToShow, yearToShow, v.startDate, v.endDate)
      )
      const isToday = 
        day === today.getDate() && 
        monthToShow === today.getMonth() && 
        yearToShow === today.getFullYear()

      days.push(
        <div
          key={day}
          className={cn(
            "h-10 flex items-center justify-center rounded-md text-sm transition-colors relative",
            isWeekend && "text-muted-foreground bg-muted/30",
            isInVacationRange && !isWeekend && "bg-secondary text-secondary-foreground font-semibold ring-2 ring-secondary",
            isApprovedVacation && !isWeekend && "bg-accent/20 text-accent-foreground",
            isToday && "ring-2 ring-primary"
          )}
        >
          {day}
          {isInVacationRange && !isWeekend && (
            <div className="absolute -top-1 -right-1">
              <Umbrella size={12} weight="fill" className="text-secondary" />
            </div>
          )}
        </div>
      )
    }

    return (
      <div className="space-y-4">
        <h3 className="font-semibold text-center text-lg">{monthName}</h3>
        <div className="grid grid-cols-7 gap-2 mb-2">
          {weekdays.map((day) => (
            <div key={day} className="text-xs font-medium text-center text-muted-foreground">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">{days}</div>
        <div className="flex items-start gap-4 text-xs text-muted-foreground mt-4 pt-4 border-t">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded bg-secondary ring-2 ring-secondary"></div>
            <span>Anmodet ferie</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded bg-accent/20"></div>
            <span>Godkendt ferie</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 py-8 max-w-7xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center gap-4">
            <Button
              onClick={onNavigateBack}
              variant="outline"
              size="lg"
              className="gap-2 bg-background/80 backdrop-blur-sm hover:bg-background shadow-lg"
            >
              <ArrowLeft size={20} weight="bold" />
              Tilbage
            </Button>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-br from-primary via-secondary to-accent bg-clip-text text-transparent">
                Email System
              </h1>
              <p className="text-muted-foreground mt-1">Send og modtag beskeder</p>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-3"
          >
            <Card className="p-4 space-y-2">
              <Button
                onClick={() => setView('compose')}
                className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white gap-2"
                size="lg"
              >
                <PaperPlaneTilt size={20} weight="bold" />
                Ny Email
              </Button>

              <Separator className="my-4" />

              <Button
                variant={view === 'inbox' ? 'secondary' : 'ghost'}
                className="w-full justify-start gap-2"
                onClick={() => {
                  setView('inbox')
                  setSelectedEmail(null)
                }}
              >
                <Envelope size={20} weight={view === 'inbox' ? 'fill' : 'regular'} />
                Indbakke
                {unreadCount > 0 && (
                  <Badge className="ml-auto bg-primary text-primary-foreground">
                    {unreadCount}
                  </Badge>
                )}
              </Button>

              <Button
                variant={view === 'sent' ? 'secondary' : 'ghost'}
                className="w-full justify-start gap-2"
                onClick={() => {
                  setView('sent')
                  setSelectedEmail(null)
                }}
              >
                <PaperPlaneTilt size={20} weight={view === 'sent' ? 'fill' : 'regular'} />
                Sendt
              </Button>

              {isManager && (
                <>
                  <Separator className="my-2" />
                  <Button
                    variant={view === 'vacation-requests' ? 'secondary' : 'ghost'}
                    className="w-full justify-start gap-2"
                    onClick={() => {
                      setView('vacation-requests')
                      setSelectedEmail(null)
                      setSelectedVacation(null)
                    }}
                  >
                    <Umbrella size={20} weight={view === 'vacation-requests' ? 'fill' : 'regular'} />
                    Ferie Anmodninger
                    {pendingVacationRequests.length > 0 && (
                      <Badge className="ml-auto bg-accent text-accent-foreground">
                        {pendingVacationRequests.length}
                      </Badge>
                    )}
                  </Button>
                </>
              )}
            </Card>

            <Card className="p-4 mt-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <User size={18} />
                Brugere
              </h3>
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {(users || []).filter(u => u.email !== userEmail).map(user => (
                    <button
                      key={user.email}
                      onClick={() => {
                        setView('compose')
                        setComposeData(prev => ({ ...prev, to: user.email }))
                      }}
                      className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-muted transition-colors text-left"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {getInitials(user.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 overflow-hidden">
                        <div className="text-sm font-medium truncate">{user.name}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-9"
          >
            <Card className="p-6 min-h-[600px]">
              <AnimatePresence mode="wait">
                {view === 'compose' && (
                  <motion.div
                    key="compose"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-4"
                  >
                    <h2 className="text-2xl font-bold mb-6">Ny Email</h2>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Til</label>
                      <Input
                        placeholder="Modtagers email"
                        value={composeData.to}
                        onChange={(e) => setComposeData(prev => ({ ...prev, to: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Emne</label>
                      <Input
                        placeholder="Email emne"
                        value={composeData.subject}
                        onChange={(e) => setComposeData(prev => ({ ...prev, subject: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Besked</label>
                      <Textarea
                        placeholder="Skriv din besked her..."
                        value={composeData.message}
                        onChange={(e) => setComposeData(prev => ({ ...prev, message: e.target.value }))}
                        rows={12}
                        className="resize-none"
                      />
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button
                        onClick={handleSendEmail}
                        className="bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white gap-2"
                        size="lg"
                      >
                        <PaperPlaneTilt size={20} weight="bold" />
                        Send Email
                      </Button>
                      <Button
                        onClick={() => setView('inbox')}
                        variant="outline"
                        size="lg"
                      >
                        Annuller
                      </Button>
                    </div>
                  </motion.div>
                )}

                {(view === 'inbox' || view === 'sent') && !selectedEmail && (
                  <motion.div
                    key="list"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <div className="space-y-4 mb-6">
                      <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold">
                          {view === 'inbox' ? 'Indbakke' : 'Sendt'}
                        </h2>
                        <div className="flex items-center gap-2">
                          <Popover open={showFilters} onOpenChange={setShowFilters}>
                            <PopoverTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm"
                                className={cn(
                                  "gap-2",
                                  (dateFilter !== 'all' || senderFilter !== 'all') && "border-primary bg-primary/5"
                                )}
                              >
                                <Funnel size={18} weight={dateFilter !== 'all' || senderFilter !== 'all' ? 'fill' : 'regular'} />
                                Filtre
                                {(dateFilter !== 'all' || senderFilter !== 'all') && (
                                  <Badge className="ml-1 h-5 px-1.5 bg-primary text-primary-foreground">
                                    {(dateFilter !== 'all' ? 1 : 0) + (senderFilter !== 'all' ? 1 : 0)}
                                  </Badge>
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80" align="end">
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium flex items-center gap-2">
                                      <CalendarBlank size={16} />
                                      Dato
                                    </label>
                                    {dateFilter !== 'all' && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 px-2 text-xs"
                                        onClick={() => setDateFilter('all')}
                                      >
                                        Ryd
                                      </Button>
                                    )}
                                  </div>
                                  <Select value={dateFilter} onValueChange={setDateFilter}>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Vælg periode" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="all">Alle</SelectItem>
                                      <SelectItem value="today">I dag</SelectItem>
                                      <SelectItem value="week">Seneste uge</SelectItem>
                                      <SelectItem value="month">Seneste måned</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                
                                <Separator />
                                
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium flex items-center gap-2">
                                      <User size={16} />
                                      {view === 'inbox' ? 'Afsender' : 'Modtager'}
                                    </label>
                                    {senderFilter !== 'all' && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 px-2 text-xs"
                                        onClick={() => setSenderFilter('all')}
                                      >
                                        Ryd
                                      </Button>
                                    )}
                                  </div>
                                  <Select value={senderFilter} onValueChange={setSenderFilter}>
                                    <SelectTrigger>
                                      <SelectValue placeholder={view === 'inbox' ? 'Vælg afsender' : 'Vælg modtager'} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="all">Alle</SelectItem>
                                      {uniqueSenders.map(sender => {
                                        const user = users.find(u => u.email === sender)
                                        return (
                                          <SelectItem key={sender} value={sender}>
                                            {user ? user.name : sender}
                                          </SelectItem>
                                        )
                                      })}
                                    </SelectContent>
                                  </Select>
                                </div>

                                {(dateFilter !== 'all' || senderFilter !== 'all') && (
                                  <>
                                    <Separator />
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="w-full"
                                      onClick={() => {
                                        setDateFilter('all')
                                        setSenderFilter('all')
                                      }}
                                    >
                                      <X size={16} />
                                      Ryd alle filtre
                                    </Button>
                                  </>
                                )}
                              </div>
                            </PopoverContent>
                          </Popover>
                          
                          <div className="relative">
                            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                            <Input
                              placeholder="Søg emails..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="pl-10 w-[300px]"
                            />
                          </div>
                        </div>
                      </div>

                      {(dateFilter !== 'all' || senderFilter !== 'all') && (
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm text-muted-foreground">Aktive filtre:</span>
                          {dateFilter !== 'all' && (
                            <Badge variant="secondary" className="gap-2">
                              <CalendarBlank size={14} />
                              {dateFilter === 'today' && 'I dag'}
                              {dateFilter === 'week' && 'Seneste uge'}
                              {dateFilter === 'month' && 'Seneste måned'}
                              <button
                                onClick={() => setDateFilter('all')}
                                className="ml-1 hover:text-foreground transition-colors"
                              >
                                <X size={14} />
                              </button>
                            </Badge>
                          )}
                          {senderFilter !== 'all' && (
                            <Badge variant="secondary" className="gap-2">
                              <User size={14} />
                              {users.find(u => u.email === senderFilter)?.name || senderFilter}
                              <button
                                onClick={() => setSenderFilter('all')}
                                className="ml-1 hover:text-foreground transition-colors"
                              >
                                <X size={14} />
                              </button>
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>

                    <ScrollArea className={cn(
                      "transition-all duration-200",
                      dateFilter !== 'all' || senderFilter !== 'all' ? "h-[430px]" : "h-[480px]"
                    )}>
                      <div className="space-y-2">
                        {(view === 'inbox' ? inboxEmails : sentEmails).length === 0 ? (
                          <div className="text-center py-16 text-muted-foreground">
                            <Envelope size={64} className="mx-auto mb-4 opacity-50" />
                            <p className="text-lg">
                              {searchQuery || dateFilter !== 'all' || senderFilter !== 'all' 
                                ? 'Ingen emails matcher dine filtre' 
                                : 'Ingen emails at vise'}
                            </p>
                            {(searchQuery || dateFilter !== 'all' || senderFilter !== 'all') && (
                              <Button
                                variant="link"
                                className="mt-2"
                                onClick={() => {
                                  setSearchQuery('')
                                  setDateFilter('all')
                                  setSenderFilter('all')
                                }}
                              >
                                Ryd alle filtre
                              </Button>
                            )}
                          </div>
                        ) : (
                          (view === 'inbox' ? inboxEmails : sentEmails).map((email) => (
                            <motion.button
                              key={email.id}
                              onClick={() => handleEmailClick(email)}
                              className={cn(
                                "w-full text-left p-4 rounded-lg border transition-all duration-200",
                                "hover:bg-muted hover:border-primary/40",
                                !email.read && view === 'inbox' && "bg-primary/5 border-primary/20 font-semibold"
                              )}
                              whileHover={{ scale: 1.01 }}
                              whileTap={{ scale: 0.99 }}
                            >
                              <div className="flex items-start gap-3">
                                <Avatar className="h-10 w-10 mt-1">
                                  <AvatarFallback className={cn(
                                    "text-sm",
                                    !email.read && view === 'inbox' ? "bg-primary text-primary-foreground" : "bg-muted"
                                  )}>
                                    {getInitials(view === 'inbox' ? email.from : email.to)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className={cn(
                                      "text-sm",
                                      !email.read && view === 'inbox' && "font-bold"
                                    )}>
                                      {view === 'inbox' ? email.from : email.to}
                                    </span>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <Clock size={14} />
                                      {formatTimestamp(email.timestamp)}
                                    </div>
                                  </div>
                                  <div className={cn(
                                    "text-sm mb-1",
                                    !email.read && view === 'inbox' ? "font-semibold" : "font-medium"
                                  )}>
                                    {email.subject}
                                  </div>
                                  <p className="text-sm text-muted-foreground truncate">
                                    {email.message}
                                  </p>
                                </div>
                                {!email.read && view === 'inbox' && (
                                  <EnvelopeOpen size={20} className="text-primary flex-shrink-0" weight="fill" />
                                )}
                              </div>
                            </motion.button>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  </motion.div>
                )}

                {selectedEmail && (
                  <motion.div
                    key="detail"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <div className="flex items-center justify-between mb-6">
                      <Button
                        onClick={() => setSelectedEmail(null)}
                        variant="ghost"
                        size="sm"
                        className="gap-2"
                      >
                        <ArrowLeft size={18} />
                        Tilbage
                      </Button>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => {
                            setView('compose')
                            setComposeData({
                              to: selectedEmail.from,
                              subject: `Re: ${selectedEmail.subject}`,
                              message: ''
                            })
                            setSelectedEmail(null)
                          }}
                          variant="outline"
                          size="sm"
                          className="gap-2"
                        >
                          <PaperPlaneTilt size={18} />
                          Svar
                        </Button>
                        <Button
                          onClick={() => handleDeleteEmail(selectedEmail.id)}
                          variant="destructive"
                          size="sm"
                          className="gap-2"
                        >
                          <Trash size={18} />
                          Slet
                        </Button>
                      </div>
                    </div>

                    <div className="border rounded-lg p-6">
                      <h2 className="text-2xl font-bold mb-4">{selectedEmail.subject}</h2>
                      
                      <div className="flex items-start gap-3 mb-6">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {getInitials(view === 'inbox' ? selectedEmail.from : selectedEmail.to)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-semibold">
                                {view === 'inbox' ? selectedEmail.from : selectedEmail.to}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                til {view === 'inbox' ? selectedEmail.to : selectedEmail.from}
                              </div>
                            </div>
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                              <Clock size={14} />
                              {formatTimestamp(selectedEmail.timestamp)}
                            </div>
                          </div>
                        </div>
                      </div>

                      <Separator className="my-6" />

                      <div className="prose prose-sm max-w-none">
                        <p className="whitespace-pre-wrap text-foreground leading-relaxed">
                          {selectedEmail.message}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {view === 'vacation-requests' && (
                  <motion.div
                    key="vacation-requests"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <h2 className="text-2xl font-bold mb-6">Ferie Anmodninger</h2>

                    {pendingVacationRequests.length === 0 ? (
                      <div className="text-center py-16 text-muted-foreground">
                        <Umbrella size={64} className="mx-auto mb-4 opacity-50" />
                        <p className="text-lg">Ingen ventende ferie anmodninger</p>
                      </div>
                    ) : (
                      <ScrollArea className="h-[580px]">
                        <div className="space-y-4">
                          {pendingVacationRequests.map((vacation) => {
                            const user = users.find(u => u.email === vacation.userEmail)
                            return (
                              <Card key={vacation.id} className="p-6">
                                <div className="flex items-start justify-between mb-4">
                                  <div className="flex items-start gap-3">
                                    <Avatar className="h-12 w-12">
                                      <AvatarFallback className="bg-primary text-primary-foreground">
                                        {getInitials(vacation.userEmail)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div>
                                      <div className="font-semibold text-lg">{user?.name || vacation.userEmail}</div>
                                      <div className="text-sm text-muted-foreground">{vacation.userEmail}</div>
                                    </div>
                                  </div>
                                  <Badge variant="secondary" className="gap-1">
                                    <Clock size={14} />
                                    Afventer
                                  </Badge>
                                </div>

                                <Separator className="my-4" />

                                <div className="grid grid-cols-2 gap-4 mb-4">
                                  <div>
                                    <div className="text-sm text-muted-foreground mb-1">Start Dato</div>
                                    <div className="font-medium">{formatDate(vacation.startDate)}</div>
                                  </div>
                                  <div>
                                    <div className="text-sm text-muted-foreground mb-1">Slut Dato</div>
                                    <div className="font-medium">{formatDate(vacation.endDate)}</div>
                                  </div>
                                </div>

                                {vacation.notes && (
                                  <div className="mb-4">
                                    <div className="text-sm text-muted-foreground mb-1">Noter</div>
                                    <div className="text-sm bg-muted p-3 rounded-lg">{vacation.notes}</div>
                                  </div>
                                )}

                                <div className="flex gap-2 mt-4">
                                  <Button
                                    onClick={() => {
                                      setSelectedVacation(vacation)
                                      setShowCalendarPreview(true)
                                    }}
                                    variant="outline"
                                    className="flex-1 gap-2"
                                  >
                                    <CalendarBlank size={18} />
                                    Forhåndsvis Kalender
                                  </Button>
                                  <Button
                                    onClick={() => handleApproveVacation(vacation)}
                                    variant="default"
                                    className="flex-1 gap-2 bg-gradient-to-r from-accent to-secondary hover:from-accent/90 hover:to-secondary/90"
                                  >
                                    <Check size={18} weight="bold" />
                                    Godkend
                                  </Button>
                                  <Button
                                    onClick={() => handleRejectVacation(vacation)}
                                    variant="destructive"
                                    className="flex-1 gap-2"
                                  >
                                    <X size={18} weight="bold" />
                                    Afvis
                                  </Button>
                                </div>
                              </Card>
                            )
                          })}
                        </div>
                      </ScrollArea>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </motion.div>
        </div>

        <Dialog open={showCalendarPreview} onOpenChange={setShowCalendarPreview}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Feriekalender Forhåndsvisning</DialogTitle>
            </DialogHeader>
            {selectedVacation && (
              <div className="space-y-6">
                <div className="bg-muted p-4 rounded-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                        {getInitials(selectedVacation.userEmail)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-semibold">{users.find(u => u.email === selectedVacation.userEmail)?.name || selectedVacation.userEmail}</div>
                      <div className="text-sm text-muted-foreground">
                        {formatDate(selectedVacation.startDate)} - {formatDate(selectedVacation.endDate)}
                      </div>
                    </div>
                  </div>
                  {selectedVacation.notes && (
                    <div className="text-sm text-muted-foreground">
                      <strong>Noter:</strong> {selectedVacation.notes}
                    </div>
                  )}
                </div>

                <div className="border rounded-lg p-4">
                  {renderCalendarPreview()}
                </div>

                <div className="flex gap-2 justify-end">
                  <Button
                    onClick={() => {
                      setShowCalendarPreview(false)
                      setSelectedVacation(null)
                    }}
                    variant="outline"
                  >
                    Luk
                  </Button>
                  <Button
                    onClick={() => handleApproveVacation(selectedVacation)}
                    className="gap-2 bg-gradient-to-r from-accent to-secondary hover:from-accent/90 hover:to-secondary/90"
                  >
                    <Check size={18} weight="bold" />
                    Godkend Ferie
                  </Button>
                  <Button
                    onClick={() => handleRejectVacation(selectedVacation)}
                    variant="destructive"
                    className="gap-2"
                  >
                    <X size={18} weight="bold" />
                    Afvis Ferie
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
