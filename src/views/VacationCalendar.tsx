import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Plus, Trash, User } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useKV } from '@github/spark/hooks'
import { UserProfile } from '@/components/UserProfile'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface VacationEntry {
  id: string
  userId: string
  userEmail: string
  startDate: string
  endDate: string
  notes?: string
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

  const months = [
    'Januar', 'Februar', 'Marts', 'April', 'Maj', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'December'
  ]

  const isWeekend = (date: Date) => {
    const day = date.getDay()
    return day === 0 || day === 6
  }

  const handleAddVacation = () => {
    if (!startDate || !endDate) {
      toast.error('Vælg både start- og slutdato')
      return
    }

    const start = new Date(startDate)
    const end = new Date(endDate)

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
    }

    setVacations((current) => [...(current || []), newVacation])
    toast.success('Ferie tilføjet')
    
    setStartDate('')
    setEndDate('')
    setNotes('')
    setIsDialogOpen(false)
  }

  const handleDeleteVacation = (id: string) => {
    setVacations((current) => (current || []).filter((v) => v.id !== id))
    toast.success('Ferie slettet')
  }

  const getVacationsForMonth = (month: number, year: number) => {
    return (vacations || []).filter((vacation) => {
      const start = new Date(vacation.startDate)
      const end = new Date(vacation.endDate)
      const monthStart = new Date(year, month, 1)
      const monthEnd = new Date(year, month + 1, 0)

      return (start <= monthEnd && end >= monthStart)
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

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(0.55_0.22_265/0.15),transparent_50%),radial-gradient(ellipse_at_bottom_right,oklch(0.65_0.26_340/0.12),transparent_50%),radial-gradient(ellipse_at_bottom_left,oklch(0.55_0.24_192/0.10),transparent_50%)] pointer-events-none" />
      <div className="absolute inset-0" style={{
        backgroundImage: `repeating-linear-gradient(90deg, oklch(0.55 0.22 265 / 0.02) 0px, transparent 1px, transparent 100px, oklch(0.55 0.22 265 / 0.02) 101px),
                         repeating-linear-gradient(0deg, oklch(0.55 0.22 265 / 0.02) 0px, transparent 1px, transparent 100px, oklch(0.55 0.22 265 / 0.02) 101px)`
      }} />

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
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          <Card className="p-6 mb-6 border-2">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-4">
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

              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-primary via-secondary to-accent text-white">
                    <Plus size={20} className="mr-2" />
                    Tilføj Ferie
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Tilføj Ferie</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="start-date">Startdato</Label>
                      <Input
                        id="start-date"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="end-date">Slutdato</Label>
                      <Input
                        id="end-date"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="notes">Noter (valgfrit)</Label>
                      <Input
                        id="notes"
                        type="text"
                        placeholder="F.eks. sommerfeire, juleferie..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      />
                    </div>
                    <Button
                      onClick={handleAddVacation}
                      className="w-full bg-gradient-to-r from-primary via-secondary to-accent text-white"
                    >
                      Gem Ferie
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

          <Card className="p-6 border-2">
            <h3 className="text-xl font-bold mb-4">Mine Ferier</h3>
            {(vacations || []).filter(v => v.userEmail === userEmail).length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Du har ikke registreret nogen ferier endnu
              </p>
            ) : (
              <div className="space-y-3">
                {(vacations || [])
                  .filter(v => v.userEmail === userEmail)
                  .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
                  .map((vacation) => (
                    <motion.div
                      key={vacation.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-between p-4 rounded-lg border bg-card"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white"
                          style={{ backgroundColor: getUserColor(vacation.userEmail) }}
                        >
                          <User size={20} weight="bold" />
                        </div>
                        <div>
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
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteVacation(vacation.id)}
                        className="text-destructive hover:bg-destructive/10"
                      >
                        <Trash size={20} />
                      </Button>
                    </motion.div>
                  ))}
              </div>
            )}
          </Card>

          {uniqueUsers.length > 1 && (
            <Card className="p-6 border-2 mt-6">
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
