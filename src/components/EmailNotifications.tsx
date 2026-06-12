import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Envelope, Copy, Check, Trash } from '@phosphor-icons/react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { da } from 'date-fns/locale'

interface EmailNotification {
  id: string
  to: string
  subject: string
  body: string
  timestamp: string
  type: 'sick-leave' | 'vacation-request' | 'vacation-approved' | 'vacation-rejected'
  read: boolean
}

interface EmailNotificationsProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EmailNotifications({ open, onOpenChange }: EmailNotificationsProps) {
  const [notifications, setNotifications] = useState<EmailNotification[]>([])
  const [selectedNotification, setSelectedNotification] = useState<EmailNotification | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      loadNotifications()
    }
  }, [open])

  const loadNotifications = async () => {
    const emailNotifications = await window.spark.kv.get<EmailNotification[]>('email-notifications') || []
    setNotifications(emailNotifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()))
  }

  const handleSelectNotification = async (notification: EmailNotification) => {
    setSelectedNotification(notification)
    
    if (!notification.read) {
      const updatedNotifications = notifications.map(n => 
        n.id === notification.id ? { ...n, read: true } : n
      )
      setNotifications(updatedNotifications)
      await window.spark.kv.set('email-notifications', updatedNotifications)
    }
  }

  const handleCopyEmail = async (notification: EmailNotification) => {
    const emailText = `To: ${notification.to}\nSubject: ${notification.subject}\n\n${notification.body}`
    
    try {
      await navigator.clipboard.writeText(emailText)
      setCopiedId(notification.id)
      toast.success('Email kopieret til udklipsholder')
      setTimeout(() => setCopiedId(null), 2000)
    } catch (error) {
      toast.error('Kunne ikke kopiere email')
    }
  }

  const handleDelete = async (id: string) => {
    const updatedNotifications = notifications.filter(n => n.id !== id)
    setNotifications(updatedNotifications)
    await window.spark.kv.set('email-notifications', updatedNotifications)
    if (selectedNotification?.id === id) {
      setSelectedNotification(null)
    }
    toast.success('Email notifikation slettet')
  }

  const getTypeLabel = (type: EmailNotification['type']) => {
    switch (type) {
      case 'sick-leave':
        return 'Sygemelding'
      case 'vacation-request':
        return 'Ferie anmodning'
      case 'vacation-approved':
        return 'Ferie godkendt'
      case 'vacation-rejected':
        return 'Ferie afvist'
    }
  }

  const getTypeBadgeColor = (type: EmailNotification['type']) => {
    switch (type) {
      case 'sick-leave':
        return 'bg-[oklch(0.58_0.25_25)] text-white'
      case 'vacation-request':
        return 'bg-[oklch(0.50_0.27_262)] text-white'
      case 'vacation-approved':
        return 'bg-[oklch(0.55_0.24_192)] text-white'
      case 'vacation-rejected':
        return 'bg-[oklch(0.65_0.26_340)] text-white'
    }
  }

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[80vh]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[oklch(0.50_0.27_262)] to-[oklch(0.55_0.24_192)] flex items-center justify-center">
              <Envelope size={24} weight="duotone" className="text-white" />
            </div>
            <div>
              <DialogTitle className="text-2xl">Email Notifikationer</DialogTitle>
              <p className="text-sm text-muted-foreground">
                {unreadCount > 0 ? `${unreadCount} ulæste notifikationer` : 'Ingen ulæste notifikationer'}
              </p>
            </div>
          </div>
        </DialogHeader>

        {notifications.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <Envelope size={64} weight="duotone" className="mx-auto mb-4 opacity-20" />
            <p>Ingen email notifikationer endnu</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-2">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                      selectedNotification?.id === notification.id
                        ? 'bg-primary/5 border-primary'
                        : notification.read
                        ? 'bg-muted/30 border-border'
                        : 'bg-card border-border'
                    }`}
                    onClick={() => handleSelectNotification(notification)}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <Badge className={getTypeBadgeColor(notification.type)}>
                        {getTypeLabel(notification.type)}
                      </Badge>
                      {!notification.read && (
                        <Badge variant="secondary" className="bg-[oklch(0.50_0.27_262)] text-white">
                          Ny
                        </Badge>
                      )}
                    </div>
                    <h4 className="font-semibold text-sm mb-1 line-clamp-1">{notification.subject}</h4>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(notification.timestamp), 'd. MMM yyyy HH:mm', { locale: da })}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="border rounded-lg p-6 bg-card">
              {selectedNotification ? (
                <div className="space-y-4">
                  <div>
                    <Badge className={getTypeBadgeColor(selectedNotification.type)}>
                      {getTypeLabel(selectedNotification.type)}
                    </Badge>
                  </div>
                  
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Til</p>
                    <p className="font-semibold">{selectedNotification.to}</p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Emne</p>
                    <p className="font-semibold">{selectedNotification.subject}</p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Besked</p>
                    <ScrollArea className="h-[250px] w-full rounded-md border p-4 bg-muted/30">
                      <pre className="whitespace-pre-wrap text-sm font-mono">{selectedNotification.body}</pre>
                    </ScrollArea>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleCopyEmail(selectedNotification)}
                      className="flex-1 gap-2"
                      variant={copiedId === selectedNotification.id ? "secondary" : "default"}
                    >
                      {copiedId === selectedNotification.id ? (
                        <>
                          <Check size={18} />
                          Kopieret
                        </>
                      ) : (
                        <>
                          <Copy size={18} />
                          Kopier email
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => handleDelete(selectedNotification.id)}
                      variant="destructive"
                      size="icon"
                    >
                      <Trash size={18} />
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center">
                    <Envelope size={64} weight="duotone" className="mx-auto mb-4 opacity-20" />
                    <p>Vælg en notifikation for at se detaljer</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
