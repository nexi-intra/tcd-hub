import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Plus, Trash, UserCircle, Tag, Calendar as CalendarIcon } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useKV } from '@github/spark/hooks'
import { UserProfile } from '@/components/UserProfile'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface ShiftRole {
  id: string
  name: string
  color: string
}

interface ShiftAssignment {
  id: string
  employeeEmail: string
  employeeName: string
  roleId: string
  date: string
}

interface ShiftScheduleProps {
  onNavigateBack: () => void
  onLogout: () => void
  userEmail: string
}

const danishHolidays2024 = [
  '2024-01-01', '2024-03-28', '2024-03-29', '2024-03-31', '2024-04-01',
  '2024-04-26', '2024-05-09', '2024-05-19', '2024-05-20', '2024-06-05',
  '2024-12-24', '2024-12-25', '2024-12-26', '2024-12-31'
]

const danishHolidays2025 = [
  '2025-01-01', '2025-04-17', '2025-04-18', '2025-04-20', '2025-04-21',
  '2025-05-15', '2025-05-29', '2025-06-08', '2025-06-09', '2025-12-24',
  '2025-12-25', '2025-12-26', '2025-12-31'
]

const danishHolidays2026 = [
  '2026-01-01', '2026-04-02', '2026-04-03', '2026-04-05', '2026-04-06',
  '2026-05-14', '2026-05-21', '2026-05-24', '2026-06-04', '2026-12-24',
  '2026-12-25', '2026-12-26', '2026-12-31'
]

const allDanishHolidays = [...danishHolidays2024, ...danishHolidays2025, ...danishHolidays2026]

export function ShiftSchedule({ onNavigateBack, onLogout, userEmail }: ShiftScheduleProps) {
  const [roles, setRoles] = useKV<ShiftRole[]>('shift-roles', [])
  const [assignments, setAssignments] = useKV<ShiftAssignment[]>('shift-assignments', [])
  const [employees, setEmployees] = useState<Array<{ email: string; name: string }>>([])
  const [isAdmin, setIsAdmin] = useState(false)
  
  const [showRoleDialog, setShowRoleDialog] = useState(false)
  const [showAssignmentDialog, setShowAssignmentDialog] = useState(false)
  
  const [newRoleName, setNewRoleName] = useState('')
  const [newRoleColor, setNewRoleColor] = useState('#8b5cf6')
  
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [selectedRole, setSelectedRole] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth())
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())

  const months = [
    'Januar', 'Februar', 'Marts', 'April', 'Maj', 'Juni',
    'Juli', 'August', 'September', 'Oktober', 'November', 'December'
  ]

  useEffect(() => {
    const loadEmployeesAndCheckAdmin = async () => {
      const usersData = await window.spark.kv.get<Record<string, { email: string; fullName: string; role?: string }>>('users')
      if (usersData) {
        const employeeList = Object.entries(usersData).map(([email, data]) => ({
          email,
          name: data.fullName
        }))
        setEmployees(employeeList)
        
        if (usersData[userEmail]?.role === 'admin') {
          setIsAdmin(true)
        }
      }
    }
    loadEmployeesAndCheckAdmin()
  }, [userEmail])

  const isWeekend = (date: Date) => {
    const day = date.getDay()
    return day === 0 || day === 6
  }

  const isDanishHoliday = (dateString: string) => {
    return allDanishHolidays.includes(dateString)
  }

  const isDateLocked = (dateString: string) => {
    const date = new Date(dateString)
    return isWeekend(date) || isDanishHoliday(dateString)
  }

  const handleAddRole = () => {
    if (!newRoleName.trim()) {
      toast.error('Indtast et rolle navn')
      return
    }

    const newRole: ShiftRole = {
      id: Date.now().toString(),
      name: newRoleName.trim(),
      color: newRoleColor
    }

    setRoles((current) => [...(current || []), newRole])
    setNewRoleName('')
    setNewRoleColor('#8b5cf6')
    setShowRoleDialog(false)
    toast.success('Rolle tilføjet')
  }

  const handleDeleteRole = (roleId: string) => {
    setRoles((current) => (current || []).filter(r => r.id !== roleId))
    setAssignments((current) => (current || []).filter(a => a.roleId !== roleId))
    toast.success('Rolle slettet')
  }

  const handleAddAssignment = () => {
    if (!selectedEmployee || !selectedRole || !selectedDate) {
      toast.error('Udfyld alle felter')
      return
    }

    if (isDateLocked(selectedDate)) {
      toast.error('Kan ikke tildele vagter på weekender eller helligdage')
      return
    }

    const employee = employees.find(e => e.email === selectedEmployee)
    if (!employee) return

    const existing = (assignments || []).find(
      a => a.employeeEmail === selectedEmployee && a.date === selectedDate
    )

    if (existing) {
      toast.error('Medarbejderen har allerede en vagt denne dag')
      return
    }

    const newAssignment: ShiftAssignment = {
      id: Date.now().toString(),
      employeeEmail: selectedEmployee,
      employeeName: employee.name,
      roleId: selectedRole,
      date: selectedDate
    }

    setAssignments((current) => [...(current || []), newAssignment])
    setSelectedEmployee('')
    setSelectedRole('')
    setSelectedDate('')
    setShowAssignmentDialog(false)
    toast.success('Vagt tildelt')
  }

  const handleDeleteAssignment = (assignmentId: string) => {
    setAssignments((current) => (current || []).filter(a => a.id !== assignmentId))
    toast.success('Vagt fjernet')
  }

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay()
  }

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(selectedMonth, selectedYear)
    const firstDay = getFirstDayOfMonth(selectedMonth, selectedYear)
    const days = []

    const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1

    for (let i = 0; i < adjustedFirstDay; i++) {
      days.push(<div key={`empty-${i}`} className="min-h-24" />)
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(selectedYear, selectedMonth, day)
      const dateString = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const isLocked = isDateLocked(dateString)
      const dayAssignments = (assignments || []).filter(a => a.date === dateString)

      days.push(
        <Card
          key={day}
          className={cn(
            "min-h-24 p-2 transition-all duration-200",
            isLocked ? "bg-muted/50 opacity-50" : "hover:shadow-md"
          )}
        >
          <div className="flex justify-between items-start mb-1">
            <span className={cn(
              "text-sm font-semibold",
              isWeekend(date) ? "text-destructive" : "text-foreground"
            )}>
              {day}
            </span>
            {isDanishHoliday(dateString) && (
              <Badge variant="destructive" className="text-[10px] px-1 py-0">
                Helligdag
              </Badge>
            )}
          </div>
          <div className="space-y-1">
            {dayAssignments.map(assignment => {
              const role = (roles || []).find(r => r.id === assignment.roleId)
              return (
                <div
                  key={assignment.id}
                  className="text-xs p-1.5 rounded-md flex items-center justify-between gap-1 group"
                  style={{ backgroundColor: `${role?.color}20`, borderLeft: `3px solid ${role?.color}` }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate text-[10px]">{assignment.employeeName}</div>
                    <div className="text-[9px] opacity-75 truncate">{role?.name}</div>
                  </div>
                  {isAdmin && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100"
                      onClick={() => handleDeleteAssignment(assignment.id)}
                    >
                      <Trash size={12} />
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        </Card>
      )
    }

    return days
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(0.55_0.22_265/0.15),transparent_50%),radial-gradient(ellipse_at_bottom_right,oklch(0.65_0.26_340/0.12),transparent_50%)] pointer-events-none" />
      
      <div className="absolute top-4 right-4 z-20">
        <UserProfile 
          userEmail={userEmail} 
          onLogout={onLogout}
          showAdmin={isAdmin}
          onAdminClick={() => {}}
        />
      </div>

      <div className="container mx-auto px-4 sm:px-6 py-8 max-w-7xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Button
            onClick={onNavigateBack}
            variant="outline"
            size="lg"
            className="mb-6 gap-2"
          >
            <ArrowLeft size={20} />
            Tilbage til Hub
          </Button>

          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl sm:text-5xl font-bold mb-2 bg-gradient-to-br from-primary via-secondary to-accent bg-clip-text text-transparent">
                Vagtplan
              </h1>
              <p className="text-muted-foreground">
                Administrer vagter og roller for teamet
              </p>
            </div>

            {isAdmin && (
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowRoleDialog(true)}
                  className="gap-2"
                  variant="outline"
                >
                  <Tag size={20} />
                  Tilføj Rolle
                </Button>
                <Button
                  onClick={() => setShowAssignmentDialog(true)}
                  className="gap-2 bg-gradient-to-r from-primary to-secondary"
                >
                  <Plus size={20} />
                  Tildel Vagt
                </Button>
              </div>
            )}
          </div>

          {isAdmin && roles && roles.length > 0 && (
            <Card className="p-4 mb-6">
              <h3 className="text-sm font-semibold mb-3 text-muted-foreground">ROLLER</h3>
              <div className="flex flex-wrap gap-2">
                {roles.map(role => (
                  <div
                    key={role.id}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full group"
                    style={{ backgroundColor: `${role.color}20`, borderLeft: `4px solid ${role.color}` }}
                  >
                    <span className="font-semibold text-sm">{role.name}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100"
                      onClick={() => handleDeleteRole(role.id)}
                    >
                      <Trash size={14} />
                    </Button>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </motion.div>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Select
                value={selectedMonth.toString()}
                onValueChange={(value) => setSelectedMonth(parseInt(value))}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month, index) => (
                    <SelectItem key={index} value={index.toString()}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={selectedYear.toString()}
                onValueChange={(value) => setSelectedYear(parseInt(value))}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2025">2025</SelectItem>
                  <SelectItem value="2026">2026</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="text-sm text-muted-foreground">
              Weekender og helligdage er låst
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 mb-2">
            {['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'].map(day => (
              <div key={day} className="text-center font-semibold text-sm text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {renderCalendar()}
          </div>
        </Card>
      </div>

      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tilføj Ny Rolle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label htmlFor="role-name">Rolle Navn</Label>
              <Input
                id="role-name"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                placeholder="F.eks. Supervisor, Tekniker, Support"
              />
            </div>
            <div>
              <Label htmlFor="role-color">Farve</Label>
              <div className="flex gap-2">
                <Input
                  id="role-color"
                  type="color"
                  value={newRoleColor}
                  onChange={(e) => setNewRoleColor(e.target.value)}
                  className="w-20 h-10"
                />
                <Input
                  value={newRoleColor}
                  onChange={(e) => setNewRoleColor(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>
            <Button onClick={handleAddRole} className="w-full">
              Opret Rolle
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showAssignmentDialog} onOpenChange={setShowAssignmentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tildel Vagt</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label htmlFor="employee">Medarbejder</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger>
                  <SelectValue placeholder="Vælg medarbejder" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(emp => (
                    <SelectItem key={emp.email} value={emp.email}>
                      {emp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="role">Rolle</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Vælg rolle" />
                </SelectTrigger>
                <SelectContent>
                  {(roles || []).map(role => (
                    <SelectItem key={role.id} value={role.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: role.color }}
                        />
                        {role.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="date">Dato</Label>
              <Input
                id="date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>
            <Button onClick={handleAddAssignment} className="w-full">
              Tildel Vagt
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
