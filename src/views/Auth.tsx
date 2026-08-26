import { useState } from 'react'
import { User, Lock, EnvelopeSimple, Eye, EyeSlash, Phone } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import nexiLogo from '@/assets/images/nexi-logo.svg'
import nexiLogoWhite from '@/assets/images/nexi-logo-white.svg'
import { ThemeToggle } from '@/components/ThemeToggle'
import { LanguageToggle } from '@/components/LanguageToggle'
import { ADMIN_EMAIL } from '@/lib/userRoles'
import { userSignupRequestEmail } from '@/lib/emailTemplates'
import { hashPassword, verifyPassword, isHashedPassword } from '@/lib/passwords'

const ADMIN_PASSWORD = 'Sylvester.Severin09'

type AccountStatus = 'pending' | 'approved' | 'rejected'

interface StoredUser {
  email: string
  password: string
  fullName: string
  phone?: string
  isManager: boolean
  role?: string
  status?: AccountStatus
}

interface AuthProps {
  onAuthenticated: (userId: string, email: string, rememberMe: boolean) => void
}

export function Auth({ onAuthenticated }: AuthProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    if (mode === 'signup') {
      if (!fullName.trim()) {
        toast.error('Indtast venligst dit fulde navn')
        setIsLoading(false)
        return
      }

      if (!phoneNumber.trim()) {
        toast.error('Indtast venligst dit telefonnummer')
        setIsLoading(false)
        return
      }

      if (password.length < 6) {
        toast.error('Adgangskoden skal være mindst 6 tegn')
        setIsLoading(false)
        return
      }

      if (password !== confirmPassword) {
        toast.error('Adgangskoderne matcher ikke')
        setIsLoading(false)
        return
      }

      const usersData = (await window.kv.get<Record<string, StoredUser>>('users')) || {}

      const normalizedSignupEmail = email.trim().toLowerCase()
      if (usersData[email] || usersData[normalizedSignupEmail]) {
        toast.error('En bruger med denne email eksisterer allerede')
        setIsLoading(false)
        return
      }

      const isHardcodedAdmin = normalizedSignupEmail === ADMIN_EMAIL.toLowerCase()
      usersData[normalizedSignupEmail] = {
        email: normalizedSignupEmail,
        password: await hashPassword(password),
        fullName,
        phone: phoneNumber.trim(),
        isManager: isHardcodedAdmin,
        role: isHardcodedAdmin ? 'admin' : 'user',
        status: isHardcodedAdmin ? 'approved' : 'pending',
      }
      await window.kv.set('users', usersData)

      if (isHardcodedAdmin) {
        toast.success('Konto oprettet!')
        setTimeout(() => {
          onAuthenticated(`user_${Date.now()}`, normalizedSignupEmail, rememberMe)
        }, 300)
        return
      }

      // Notify all managers about the pending signup request.
      try {
        const emailContent = userSignupRequestEmail(fullName, normalizedSignupEmail, phoneNumber.trim())
        const managers = Object.values(usersData).filter((u) => u.isManager)
        const emails = (await window.kv.get<Array<{ id: string; from: string; to: string; subject: string; message: string; timestamp: number; read: boolean }>>('emails')) || []
        const notifications = (await window.kv.get<unknown[]>('email-notifications')) || []
        for (const manager of managers) {
          emails.push({
            id: `${Date.now()}-signup-${manager.email}`,
            from: normalizedSignupEmail,
            to: manager.email,
            subject: emailContent.subject,
            message: emailContent.body,
            timestamp: Date.now(),
            read: false,
          })
          notifications.push({
            id: `${Date.now()}-signup-notif-${manager.email}`,
            to: manager.email,
            subject: emailContent.subject,
            body: emailContent.body,
            timestamp: new Date().toISOString(),
            type: 'user-signup',
            read: false,
          })
        }
        await window.kv.set('emails', emails)
        await window.kv.set('email-notifications', notifications)
      } catch (error) {
        console.error('Kunne ikke sende signup-notifikation til managere:', error)
      }

      toast.success('Anmodning sendt! Din konto skal godkendes af en manager, før du kan logge ind.', { duration: 8000 })
      setMode('login')
      setPassword('')
      setConfirmPassword('')
      setIsLoading(false)
    } else {
      const normalizedEmail = email.trim().toLowerCase()

      // Hardcoded admin login works even if the local KV store is unavailable.
      if (normalizedEmail === ADMIN_EMAIL.toLowerCase() && password === ADMIN_PASSWORD) {
        try {
          const usersData = (await window.kv.get<Record<string, StoredUser>>('users')) || {}
          usersData[ADMIN_EMAIL] = {
            email: ADMIN_EMAIL,
            password: await hashPassword(ADMIN_PASSWORD),
            fullName: usersData[ADMIN_EMAIL]?.fullName || 'Jacob Remmer',
            isManager: true,
            status: 'approved',
          }
          await window.kv.set('users', usersData)
        } catch (error) {
          console.error('Kunne ikke gemme admin-brugeren i KV:', error)
        }

        toast.success('Velkommen tilbage!')
        setTimeout(() => {
          onAuthenticated(`user_${ADMIN_EMAIL}`, ADMIN_EMAIL, rememberMe)
        }, 300)
        return
      }

      let usersData: Record<string, StoredUser> = {}
      try {
        usersData = (await window.kv.get<Record<string, StoredUser>>('users')) || {}
      } catch (error) {
        console.error('Kunne ikke hente brugere fra KV:', error)
        toast.error('Kunne ikke oprette forbindelse. Prøv igen.')
        setIsLoading(false)
        return
      }

      const user = usersData[email] || usersData[normalizedEmail]
      if (!user || !(await verifyPassword(password, user.password))) {
        toast.error('Forkert email eller adgangskode')
        setIsLoading(false)
        return
      }

      // Gamle klartekst-passwords opgraderes til hash ved første login.
      if (!isHashedPassword(user.password)) {
        try {
          user.password = await hashPassword(password)
          usersData[user.email] = user
          await window.kv.set('users', usersData)
        } catch (error) {
          console.error('Kunne ikke opgradere password til hash:', error)
        }
      }

      // Accounts created before the approval flow have no status and stay valid.
      if (user.status === 'pending') {
        toast.error('Din konto afventer godkendelse af en manager.')
        setIsLoading(false)
        return
      }
      if (user.status === 'rejected') {
        toast.error('Din anmodning om adgang er blevet afvist. Kontakt en manager.')
        setIsLoading(false)
        return
      }

      toast.success('Velkommen tilbage!')
      setTimeout(() => {
        const userId = `user_${user.email}`
        onAuthenticated(userId, user.email, rememberMe)
      }, 300)
    }
  }

  const toggleMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login')
    setEmail('')
    setPassword('')
    setConfirmPassword('')
    setFullName('')
    setPhoneNumber('')
    setRememberMe(false)
  }

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center">
      <div className="container mx-auto px-4 sm:px-6 max-w-md relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="relative flex justify-center mb-6"
            >
              <img src={nexiLogo} alt="Nexi" className="relative h-12 sm:h-14 md:h-16 w-auto dark:hidden" />
              <img src={nexiLogoWhite} alt="Nexi" className="relative h-12 sm:h-14 md:h-16 w-auto hidden dark:block" />
            </motion.div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight bg-gradient-to-br from-primary to-accent bg-clip-text text-transparent mb-2">Terminal Configuration & Dispatch Hub</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              {mode === 'login' ? 'Log ind for at fortsætte' : 'Opret en ny konto'}
            </p>
          </div>

          <Card className="p-8 border-2 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-accent to-primary" />
            <form onSubmit={handleSubmit} className="space-y-5">
              {mode === 'signup' && (
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="text-sm font-semibold flex items-center gap-2">
                    <User size={16} />
                    Fulde navn
                  </Label>
                  <Input
                    id="fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="F.eks. Anders Andersen"
                    className="h-12"
                    required
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold flex items-center gap-2">
                  <EnvelopeSimple size={16} />
                  {mode === 'signup' ? 'Email - Brug Arbejdsmail' : 'Email'}
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="din@email.dk"
                  className="h-12"
                  required
                />
              </div>

              {mode === 'signup' && (
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber" className="text-sm font-semibold flex items-center gap-2">
                    <Phone size={16} />
                    Telefonnummer
                  </Label>
                  <Input
                    id="phoneNumber"
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+45 12 34 56 78"
                    className="h-12"
                    required
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-semibold flex items-center gap-2">
                  <Lock size={16} />
                  Adgangskode
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-12 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeSlash size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {mode === 'signup' && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-semibold flex items-center gap-2">
                    <Lock size={16} />
                    Bekræft adgangskode
                  </Label>
                  <Input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-12"
                    required
                  />
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember-me"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked === true)}
                />
                <Label
                  htmlFor="remember-me"
                  className="text-sm font-normal cursor-pointer"
                >
                  Husk mig (sessionen udløber efter 24 timer)
                </Label>
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                disabled={isLoading}
              >
                {isLoading ? 'Behandler...' : mode === 'login' ? 'Log ind' : 'Opret konto'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={toggleMode}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {mode === 'login' ? (
                  <>
                    Har du ikke en konto? <span className="font-semibold text-primary">Opret en her</span>
                  </>
                ) : (
                  <>
                    Har du allerede en konto? <span className="font-semibold text-primary">Log ind</span>
                  </>
                )}
              </button>
            </div>
          </Card>

          <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-center">
            <ThemeToggle />
            <LanguageToggle />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
