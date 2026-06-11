import { useState } from 'react'
import { Books, User, Lock, EnvelopeSimple, Eye, EyeSlash } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { motion } from 'framer-motion'

interface AuthProps {
  onAuthenticated: (userId: string, email: string) => void
}

export function Auth({ onAuthenticated }: AuthProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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

      const usersData = (await spark.kv.get<Record<string, { email: string; password: string; fullName: string; isManager: boolean }>>('users')) || {}
      
      if (usersData[email]) {
        toast.error('En bruger med denne email eksisterer allerede')
        setIsLoading(false)
        return
      }

      const userId = `user_${Date.now()}`
      const role = email.toLowerCase() === 'jacob.remmer@nexigroup.com' ? 'admin' : 'user'
      usersData[email] = { email, password, fullName, isManager: role === 'admin', role }
      await spark.kv.set('users', usersData)
      
      toast.success('Konto oprettet!')
      setTimeout(() => {
        onAuthenticated(userId, email)
      }, 300)
    } else {
      const usersData = (await spark.kv.get<Record<string, { email: string; password: string; fullName: string; isManager: boolean }>>('users')) || {}
      
      const user = usersData[email]
      if (!user || user.password !== password) {
        toast.error('Forkert email eller adgangskode')
        setIsLoading(false)
        return
      }

      toast.success('Velkommen tilbage!')
      setTimeout(() => {
        const userId = `user_${email}`
        onAuthenticated(userId, email)
      }, 300)
    }
  }

  const toggleMode = () => {
    setMode(mode === 'login' ? 'signup' : 'login')
    setEmail('')
    setPassword('')
    setConfirmPassword('')
    setFullName('')
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(0.55_0.22_265/0.15),transparent_50%),radial-gradient(ellipse_at_bottom_right,oklch(0.65_0.26_340/0.12),transparent_50%),radial-gradient(ellipse_at_bottom_left,oklch(0.55_0.24_192/0.10),transparent_50%)] pointer-events-none" />
      <div className="absolute inset-0" style={{
        backgroundImage: `repeating-linear-gradient(90deg, oklch(0.55 0.22 265 / 0.02) 0px, transparent 1px, transparent 100px, oklch(0.55 0.22 265 / 0.02) 101px),
                         repeating-linear-gradient(0deg, oklch(0.55 0.22 265 / 0.02) 0px, transparent 1px, transparent 100px, oklch(0.55 0.22 265 / 0.02) 101px)`
      }} />
      <div className="container mx-auto px-4 sm:px-6 max-w-md relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="text-center mb-8">
            <motion.div
              className="inline-flex items-center justify-center mb-6"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5, type: "spring", stiffness: 200 }}
            >
              <div className="relative">
                <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-primary via-secondary to-accent shadow-2xl shadow-primary/30 flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/40 via-transparent to-accent/40 animate-pulse" />
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,white,transparent)] opacity-20" />
                  <Books size={40} weight="duotone" className="text-primary-foreground relative z-10" />
                </div>
                <motion.div
                  className="absolute -inset-2 rounded-3xl bg-gradient-to-br from-primary/20 via-secondary/20 to-accent/20 blur-xl -z-10"
                  animate={{
                    scale: [1, 1.1, 1],
                    opacity: [0.5, 0.7, 0.5],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
              </div>
            </motion.div>

            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight bg-gradient-to-br from-primary via-secondary to-accent bg-clip-text text-transparent mb-2">Terminal Configuration & Dispatch Hub</h1>
            <p className="text-muted-foreground">
              {mode === 'login' ? 'Log ind for at fortsætte' : 'Opret en ny konto'}
            </p>
          </div>

          <Card className="p-8 border-2 shadow-xl">
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
                    className="h-11"
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
                  className="h-11"
                  required
                />
              </div>

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
                    className="h-11 pr-10"
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
                    className="h-11"
                    required
                  />
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-11 bg-gradient-to-r from-primary via-secondary to-accent text-primary-foreground font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
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
        </motion.div>
      </div>
    </div>
  );
}
