import { useState } from 'react'
import { SignOut, User, UserGear, Gear } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useKV } from '@github/spark/hooks'
import { toast } from 'sonner'

interface UserProfileProps {
  userEmail: string
  onLogout: () => void
  onAdminClick?: () => void
  showAdmin?: boolean
}

interface UserSettings {
  phoneNumber?: string
  password?: string
}

export function UserProfile({ userEmail, onLogout, onAdminClick, showAdmin }: UserProfileProps) {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [userSettings, setUserSettings] = useKV<Record<string, UserSettings>>('user-settings', {})
  const [phoneNumber, setPhoneNumber] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const handleOpenSettings = () => {
    const settings = (userSettings || {})[userEmail] || {}
    setPhoneNumber(settings.phoneNumber || '')
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setSettingsOpen(true)
  }

  const handleSaveSettings = () => {
    const currentSettings = (userSettings || {})[userEmail] || {}

    if (newPassword) {
      if (currentSettings.password && currentSettings.password !== currentPassword) {
        toast.error('Nuværende adgangskode er forkert')
        return
      }

      if (newPassword.length < 6) {
        toast.error('Adgangskode skal være mindst 6 tegn')
        return
      }

      if (newPassword !== confirmPassword) {
        toast.error('Adgangskoderne stemmer ikke overens')
        return
      }
    }

    setUserSettings((current) => ({
      ...(current || {}),
      [userEmail]: {
        ...currentSettings,
        phoneNumber: phoneNumber || currentSettings.phoneNumber,
        password: newPassword || currentSettings.password,
      },
    }))

    toast.success('Indstillinger opdateret')
    setSettingsOpen(false)
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            className="flex items-center gap-2 h-10 px-3 hover:bg-primary/10 transition-colors"
          >
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center">
              <User size={18} weight="bold" className="text-primary-foreground" />
            </div>
            <span className="text-sm font-medium hidden sm:inline">{userEmail}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Min konto</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-muted-foreground text-sm">
            {userEmail}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={handleOpenSettings}
            className="cursor-pointer"
          >
            <Gear size={16} className="mr-2" />
            Indstillinger
          </DropdownMenuItem>
          {showAdmin && onAdminClick && (
            <DropdownMenuItem 
              onClick={onAdminClick}
              className="cursor-pointer"
            >
              <UserGear size={16} className="mr-2" />
              Admin Panel
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={onLogout}
            className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
          >
            <SignOut size={16} className="mr-2" />
            Log ud
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Indstillinger</DialogTitle>
            <DialogDescription>
              Opdater din adgangskode og telefonnummer
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Telefonnummer</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+45 12 34 56 78"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </div>

            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-4">Skift adgangskode</h4>
              <div className="space-y-4">
                {(userSettings || {})[userEmail]?.password && (
                  <div className="space-y-2">
                    <Label htmlFor="current-password">Nuværende adgangskode</Label>
                    <Input
                      id="current-password"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="new-password">Ny adgangskode</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Bekræft adgangskode</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setSettingsOpen(false)}>
              Annuller
            </Button>
            <Button onClick={handleSaveSettings}>
              Gem ændringer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
