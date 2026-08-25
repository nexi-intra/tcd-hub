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
import { ThemeToggle } from '@/components/ThemeToggle'
import { LanguageToggle } from '@/components/LanguageToggle'
import { ADMIN_EMAIL } from '@/lib/userRoles'

const ADMIN_PASSWORD = 'Sylvester.Severin09'

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

      const usersData = (await window.kv.get<Record<string, { email: string; password: string; fullName: string; phone: string; isManager: boolean }>>('users')) || {}
      
      if (usersData[email]) {
        toast.error('En bruger med denne email eksisterer allerede')
        setIsLoading(false)
        return
      }

      const userId = `user_${Date.now()}`
      const role = email.toLowerCase() === 'jacob.remmer@nexigroup.com' ? 'admin' : 'user'
      usersData[email] = { email, password, fullName, phone: phoneNumber.trim(), isManager: role === 'admin' }
      await window.kv.set('users', usersData)
      
      toast.success('Konto oprettet!')
      setTimeout(() => {
        onAuthenticated(userId, email, rememberMe)
      }, 300)
    } else {
      const normalizedEmail = email.trim().toLowerCase()

      // Hardcoded admin login works even if the local KV store is unavailable.
      if (normalizedEmail === ADMIN_EMAIL.toLowerCase() && password === ADMIN_PASSWORD) {
        try {
          const usersData = (await window.kv.get<Record<string, { email: string; password: string; fullName: string; isManager: boolean }>>('users')) || {}
          usersData[ADMIN_EMAIL] = {
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD,
            fullName: usersData[ADMIN_EMAIL]?.fullName || 'Jacob Remmer',
            isManager: true,
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

      let usersData: Record<string, { email: string; password: string; fullName: string; isManager: boolean }> = {}
      try {
        usersData = (await window.kv.get<Record<string, { email: string; password: string; fullName: string; isManager: boolean }>>('users')) || {}
      } catch (error) {
        console.error('Kunne ikke hente brugere fra KV:', error)
        toast.error('Kunne ikke oprette forbindelse. Prøv igen.')
        setIsLoading(false)
        return
      }

      const user = usersData[email] || usersData[normalizedEmail]
      if (!user || user.password !== password) {
        toast.error('Forkert email eller adgangskode')
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
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 blur-2xl" />
              </div>
              <img src={nexiLogo} alt="Nexi Logo" className="relative w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 drop-shadow-lg" />
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
