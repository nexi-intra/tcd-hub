import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Plus, Trash, UserCircle, PencilSimple, Phone, Envelope as EnvelopeIcon, User, Copy } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useKV } from '@github/spark/hooks'
import { UserProfile } from '@/components/UserProfile'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'

export interface TeamEmployee {
  id: string
  name: string
  email: string
  phone: string
}

interface TeamOverviewProps {
  onNavigateBack: () => void
  onLogout: () => void
  userEmail: string
}

export function TeamOverview({ onNavigateBack, onLogout, userEmail }: TeamOverviewProps) {
  const [employees, setEmployees] = useKV<TeamEmployee[]>('team-employees', [])
  const [showEmployeeDialog, setShowEmployeeDialog] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<TeamEmployee | null>(null)
  
  const [newEmployeeName, setNewEmployeeName] = useState('')
  const [newEmployeeEmail, setNewEmployeeEmail] = useState('')
  const [newEmployeePhone, setNewEmployeePhone] = useState('')

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onNavigateBack()
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onNavigateBack])

  const handleAddEmployee = () => {
    if (!newEmployeeName.trim()) {
      toast.error('Indtast et navn')
      return
    }
    if (!newEmployeeEmail.trim()) {
      toast.error('Indtast en email')
      return
    }
    if (!newEmployeePhone.trim()) {
      toast.error('Indtast et telefonnummer')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(newEmployeeEmail.trim())) {
      toast.error('Indtast en gyldig email adresse')
      return
    }

    const newEmployee: TeamEmployee = {
      id: Date.now().toString(),
      name: newEmployeeName.trim(),
      email: newEmployeeEmail.trim(),
      phone: newEmployeePhone.trim()
    }

    setEmployees((current) => [...(current || []), newEmployee])
    setNewEmployeeName('')
    setNewEmployeeEmail('')
    setNewEmployeePhone('')
    setShowEmployeeDialog(false)
    toast.success('Medarbejder tilføjet')
  }

  const handleUpdateEmployee = () => {
    if (!editingEmployee) return
    if (!newEmployeeName.trim()) {
      toast.error('Indtast et navn')
      return
    }
    if (!newEmployeeEmail.trim()) {
      toast.error('Indtast en email')
      return
    }
    if (!newEmployeePhone.trim()) {
      toast.error('Indtast et telefonnummer')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(newEmployeeEmail.trim())) {
      toast.error('Indtast en gyldig email adresse')
      return
    }

    setEmployees((current) => 
      (current || []).map(e => 
        e.id === editingEmployee.id 
          ? { ...e, name: newEmployeeName.trim(), email: newEmployeeEmail.trim(), phone: newEmployeePhone.trim() }
          : e
      )
    )
    setNewEmployeeName('')
    setNewEmployeeEmail('')
    setNewEmployeePhone('')
    setEditingEmployee(null)
    setShowEmployeeDialog(false)
    toast.success('Medarbejder opdateret')
  }

  const handleDeleteEmployee = (employeeId: string) => {
    setEmployees((current) => (current || []).filter(e => e.id !== employeeId))
    toast.success('Medarbejder slettet')
  }

  const openEditEmployeeDialog = (employee: TeamEmployee) => {
    setEditingEmployee(employee)
    setNewEmployeeName(employee.name)
    setNewEmployeeEmail(employee.email)
    setNewEmployeePhone(employee.phone)
    setShowEmployeeDialog(true)
  }

  const openAddEmployeeDialog = () => {
    setEditingEmployee(null)
    setNewEmployeeName('')
    setNewEmployeeEmail('')
    setNewEmployeePhone('')
    setShowEmployeeDialog(true)
  }

  const handleCopyEmail = async (email: string) => {
    try {
      await navigator.clipboard.writeText(email)
      toast.success('Email kopieret!', {
        description: email,
        duration: 3000,
      })
    } catch (err) {
      toast.error('Kunne ikke kopiere email')
    }
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(0.55_0.22_265/0.15),transparent_50%),radial-gradient(ellipse_at_bottom_right,oklch(0.65_0.26_340/0.12),transparent_50%)] pointer-events-none" />
      <div className="absolute top-4 right-4 z-20">
        <UserProfile 
          userEmail={userEmail} 
          onLogout={onLogout}
        />
      </div>
      <div className="container mx-auto px-4 sm:px-6 py-8 max-w-7xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 mt-12"
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
                Team Oversigt
              </h1>
              <p className="text-muted-foreground text-lg">
                Administrer teammedlemmer og kontaktoplysninger
              </p>
            </div>
          </div>
        </motion.div>

        <Card className="p-6 border-2">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <UserCircle size={28} className="text-primary" weight="duotone" />
              <h2 className="text-2xl font-bold">Medarbejdere</h2>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-sm">
                {(employees || []).length} {(employees || []).length === 1 ? 'Medarbejder' : 'Medarbejdere'}
              </Badge>
              <Button
                onClick={openAddEmployeeDialog}
                size="sm"
                className="gap-2 bg-gradient-to-r from-primary to-secondary"
              >
                <Plus size={16} />
                Tilføj Medarbejder
              </Button>
            </div>
          </div>

          {!(employees || []).length ? (
            <div className="text-center py-12">
              <UserCircle size={48} className="text-muted-foreground mx-auto mb-4" weight="duotone" />
              <p className="text-muted-foreground mb-4">Ingen medarbejdere endnu</p>
              <Button
                onClick={openAddEmployeeDialog}
                className="gap-2"
              >
                <Plus size={20} />
                Tilføj Din Første Medarbejder
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(employees || []).map((employee) => (
                <motion.div
                  key={employee.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-5 rounded-xl border-2 bg-card hover:shadow-md transition-all group"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-md bg-gradient-to-br from-primary to-secondary">
                      {employee.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-lg truncate mb-1">{employee.name}</div>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <EnvelopeIcon size={16} className="flex-shrink-0" />
                      <a 
                        href={`mailto:${employee.email}`}
                        className="truncate hover:text-primary transition-colors flex-1 min-w-0"
                        title={employee.email}
                      >
                        {employee.email}
                      </a>
                      <button
                        onClick={() => handleCopyEmail(employee.email)}
                        className="flex-shrink-0 p-1 hover:bg-muted rounded transition-colors"
                        title="Kopier email"
                      >
                        <Copy size={16} className="text-muted-foreground hover:text-primary transition-colors" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone size={16} className="flex-shrink-0" />
                      <a 
                        href={`tel:${employee.phone}`}
                        className="hover:text-primary transition-colors"
                      >
                        {employee.phone}
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditEmployeeDialog(employee)}
                      className="flex-1 gap-2"
                    >
                      <PencilSimple size={16} />
                      Rediger
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          size="sm"
                          variant="outline" 
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash size={16} />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Slet medarbejder?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Er du sikker på at du vil slette <strong>{employee.name}</strong>? Denne handling kan ikke fortrydes.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuller</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDeleteEmployee(employee.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Slet medarbejder
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Dialog open={showEmployeeDialog} onOpenChange={(open) => {
        setShowEmployeeDialog(open)
        if (!open) {
          setEditingEmployee(null)
          setNewEmployeeName('')
          setNewEmployeeEmail('')
          setNewEmployeePhone('')
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEmployee ? 'Rediger Medarbejder' : 'Tilføj Medarbejder'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <Label htmlFor="employee-name">Navn *</Label>
              <Input
                id="employee-name"
                value={newEmployeeName}
                onChange={(e) => setNewEmployeeName(e.target.value)}
                placeholder="F.eks. Anders Hansen"
              />
            </div>
            <div>
              <Label htmlFor="employee-email">Email *</Label>
              <Input
                id="employee-email"
                type="email"
                value={newEmployeeEmail}
                onChange={(e) => setNewEmployeeEmail(e.target.value)}
                placeholder="F.eks. anders.hansen@nexigroup.com"
              />
            </div>
            <div>
              <Label htmlFor="employee-phone">Telefon *</Label>
              <Input
                id="employee-phone"
                type="tel"
                value={newEmployeePhone}
                onChange={(e) => setNewEmployeePhone(e.target.value)}
                placeholder="F.eks. +45 12 34 56 78"
              />
            </div>
            <Button 
              onClick={editingEmployee ? handleUpdateEmployee : handleAddEmployee} 
              className="w-full"
            >
              {editingEmployee ? 'Gem Ændringer' : 'Tilføj Medarbejder'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
