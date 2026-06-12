import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Plus, Trash, UserCircle, PencilSimple, Phone } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useKV } from '@github/spark/hooks'
import { UserProfile } from '@/components/UserProfile'
import { toast } from 'sonner'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'

export interface TeamEmployee {
  id: string
  name: string
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
    if (!newEmployeePhone.trim()) {
      toast.error('Indtast et telefonnummer')
      return
    }

    const newEmployee: TeamEmployee = {
      id: Date.now().toString(),
      name: newEmployeeName.trim(),
      phone: newEmployeePhone.trim()
    }

    setEmployees((current) => [...(current || []), newEmployee])
    setNewEmployeeName('')
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
    if (!newEmployeePhone.trim()) {
      toast.error('Indtast et telefonnummer')
      return
    }

    setEmployees((current) => 
      (current || []).map(emp => 
        emp.id === editingEmployee.id 
          ? { ...emp, name: newEmployeeName.trim(), phone: newEmployeePhone.trim() }
          : emp
      )
    )
    setNewEmployeeName('')
    setNewEmployeePhone('')
    setEditingEmployee(null)
    setShowEmployeeDialog(false)
    toast.success('Medarbejder opdateret')
  }

  const handleDeleteEmployee = (employeeId: string) => {
    setEmployees((current) => (current || []).filter(emp => emp.id !== employeeId))
    toast.success('Medarbejder slettet')
  }

  const openEditEmployeeDialog = (employee: TeamEmployee) => {
    setEditingEmployee(employee)
    setNewEmployeeName(employee.name)
    setNewEmployeePhone(employee.phone)
    setShowEmployeeDialog(true)
  }

  const openAddEmployeeDialog = () => {
    setEditingEmployee(null)
    setNewEmployeeName('')
    setNewEmployeePhone('')
    setShowEmployeeDialog(true)
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(0.55_0.22_265/0.15),transparent_50%),radial-gradient(ellipse_at_bottom_right,oklch(0.65_0.26_340/0.12),transparent_50%)] pointer-events-none" />
      <div className="absolute top-4 right-4 z-20">
        <UserProfile 
          userEmail={userEmail} 
          onLogout={onLogout}
          showAdmin={false}
          onAdminClick={() => {}}
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
                      <Phone size={16} className="flex-shrink-0" />
                      <a 
                        href={`tel:${employee.phone}`}
                        className="hover:text-primary transition-colors"
                      >
                        {employee.phone}
                      </a>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEditEmployeeDialog(employee)}
                      className="gap-2 flex-1"
                    >
                      <PencilSimple size={16} />
                      Rediger
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash size={20} />
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
          setNewEmployeePhone('')
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEmployee ? 'Rediger Medarbejder' : 'Tilføj Ny Medarbejder'}</DialogTitle>
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
              <Label htmlFor="employee-phone">Telefon *</Label>
              <Input
                id="employee-phone"
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
