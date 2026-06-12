import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
  id: string
  email: string
}
interface TeamOverviewProps {
  onLogout: () => void
}

  const [showEmployeeDialog, se
  id: string
  const [newEm
  email: string
    const handl
}

interface TeamOverviewProps {
  }, [onNavigateBack])
  onLogout: () => void
      toast.error('
}

    }
      toast.error('Indtast et telefonnummer')
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  
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
    setNewEmployeePhone(employee.phone)
  }
  con

    setNewEmployeePhone('')
  }
  const handleCopyEmail = async (em
      await navigator.clipboard.write
        description: email,
     

  }
  return (
      <div className="absol
        <UserProfile 
          onLogout={onLogout}
      </div>
   

        >
            onClick={onNavigateB
            size="lg"
          >
            

            <div>
                Team Oversigt
            
     

          <div className="flex items-center j
            
     

              </Badge>
                onClick={openAddEmployeeDialog}
                className="gap-2 bg-gradient-to-r fr
            
     

          {!(employees || []).
              <UserCircle size=
              <Button
                className="gap-2"
             
       
     
              {(employees 
                  key={empl
                  animate={
                >
                    <div classNa
                    </div>
   

                  <div className="space-y-2 mb-4">
                      <EnvelopeIcon size={16} className="flex-shrink-0" />
                        href={`mailto:${
   

                      <button
                        classNam
                      >
                      </button>
    setNewEmployeePhone(employee.phone)
                      <a 
  }

                    </div>

                    <Butto
                      varia
    setNewEmployeePhone('')
                      <PencilSi
  }

  return (
                          className="text-destructive hover:text-destruct
                          <Trash size={16} />
                      </AlertDialogTrigger>
        <UserProfile 
                          <Alert
                          </A
          
            
                            className="bg-destructive text-destructive-foreground h
        <motion.div
                        </AlertDialogFoote
                    </AlertDialog>
                </motion.div>
        >
        </Card>
      <Dialog open={showEmployeeDial
        if (!open) {
            size="lg"
          setNewEmployeePhone('')
          >
          <DialogHeader>
          </DialogHeader>
            <div>

                value={newEmployeeName}
            <div>
            </div>
                Team Oversigt
                id=
                value={newEmployeeEmail}
                placeholder="F.eks. anders.hansen@nexigroup.com
              </p>
              <Lab
                
                value

            </div>
              onClick={editingEmployee ? handleUpdateEmployee : ha
            >
            </Button>
        </DialogContent>
    </div>
}


              </Badge>









          </div>

          {!(employees || []).length ? (









              </Button>

          ) : (



                  key={employee.id}







                    </div>



                  </div>











                    </div>

                      <Phone size={16} className="flex-shrink-0" />







                  </div>



                      size="sm"



                    >

                      Rediger







                        >















                          >

                          </AlertDialogAction>

                      </AlertDialogContent>



              ))}

          )}





        if (!open) {



          setNewEmployeePhone('')

      }}>

          <DialogHeader>



            <div>

              <Input





            </div>



                id="employee-email"







              <Label htmlFor="employee-phone">Telefon *</Label>



                value={newEmployeePhone}



            </div>



            >





    </div>

}
