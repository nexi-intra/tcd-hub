import { motion } from 'framer-motion'
import { Books, Users, Calendar, ChartBar, Gear, ChatCircle, FileText, Folder } from '@phosphor-icons/react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface HubModule {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  color: string
  gradient: string
  available: boolean
}

interface HubProps {
  onNavigate: (moduleId: string) => void
}

export function Hub({ onNavigate }: HubProps) {
  const modules: HubModule[] = [
    {
      id: 'guides',
      title: 'Guide Bibliotek',
      description: 'Søg og administrer afdelingens guides og procedurer',
      icon: <Books size={48} weight="duotone" />,
      color: 'oklch(0.50 0.27 262)',
      gradient: 'from-[oklch(0.50_0.27_262)] via-[oklch(0.55_0.24_192)] to-[oklch(0.50_0.27_262)]',
      available: true,
    },
    {
      id: 'team',
      title: 'Team Oversigt',
      description: 'Kontaktoplysninger og teammedlemmer',
      icon: <Users size={48} weight="duotone" />,
      color: 'oklch(0.55 0.24 192)',
      gradient: 'from-[oklch(0.55_0.24_192)] via-[oklch(0.60_0.22_220)] to-[oklch(0.55_0.24_192)]',
      available: false,
    },
    {
      id: 'calendar',
      title: 'Kalender',
      description: 'Hold styr på møder, deadlines og events',
      icon: <Calendar size={48} weight="duotone" />,
      color: 'oklch(0.65 0.26 340)',
      gradient: 'from-[oklch(0.65_0.26_340)] via-[oklch(0.70_0.20_20)] to-[oklch(0.65_0.26_340)]',
      available: false,
    },
    {
      id: 'analytics',
      title: 'Analytics',
      description: 'Rapporter og performance metrics',
      icon: <ChartBar size={48} weight="duotone" />,
      color: 'oklch(0.60 0.22 220)',
      gradient: 'from-[oklch(0.60_0.22_220)] via-[oklch(0.65_0.26_340)] to-[oklch(0.60_0.22_220)]',
      available: false,
    },
    {
      id: 'documents',
      title: 'Dokumenter',
      description: 'Fælles dokumenter og filer',
      icon: <FileText size={48} weight="duotone" />,
      color: 'oklch(0.62 0.20 150)',
      gradient: 'from-[oklch(0.62_0.20_150)] via-[oklch(0.55_0.24_192)] to-[oklch(0.62_0.20_150)]',
      available: false,
    },
    {
      id: 'projects',
      title: 'Projekter',
      description: 'Projektadministration og opgaver',
      icon: <Folder size={48} weight="duotone" />,
      color: 'oklch(0.70 0.18 90)',
      gradient: 'from-[oklch(0.70_0.18_90)] via-[oklch(0.62_0.20_150)] to-[oklch(0.70_0.18_90)]',
      available: false,
    },
    {
      id: 'chat',
      title: 'Team Chat',
      description: 'Intern kommunikation og beskeder',
      icon: <ChatCircle size={48} weight="duotone" />,
      color: 'oklch(0.58 0.25 25)',
      gradient: 'from-[oklch(0.58_0.25_25)] via-[oklch(0.65_0.26_340)] to-[oklch(0.58_0.25_25)]',
      available: false,
    },
    {
      id: 'settings',
      title: 'Indstillinger',
      description: 'Systemindstillinger og præferencer',
      icon: <Gear size={48} weight="duotone" />,
      color: 'oklch(0.48 0.02 270)',
      gradient: 'from-[oklch(0.48_0.02_270)] via-[oklch(0.55_0.05_270)] to-[oklch(0.48_0.02_270)]',
      available: false,
    },
  ]

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(0.55_0.22_265/0.15),transparent_50%),radial-gradient(ellipse_at_bottom_right,oklch(0.65_0.26_340/0.12),transparent_50%),radial-gradient(ellipse_at_bottom_left,oklch(0.55_0.24_192/0.10),transparent_50%)] pointer-events-none" />
      <div className="absolute inset-0" style={{
        backgroundImage: `repeating-linear-gradient(90deg, oklch(0.55 0.22 265 / 0.02) 0px, transparent 1px, transparent 100px, oklch(0.55 0.22 265 / 0.02) 101px),
                         repeating-linear-gradient(0deg, oklch(0.55 0.22 265 / 0.02) 0px, transparent 1px, transparent 100px, oklch(0.55 0.22 265 / 0.02) 101px)`
      }} />

      <div className="container mx-auto px-4 sm:px-6 py-12 sm:py-20 max-w-7xl relative z-10">
        <motion.header 
          className="text-center mb-16"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <motion.div 
            className="inline-flex items-center justify-center mb-6"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5, type: "spring", stiffness: 200 }}
          >
            <div className="relative">
              <div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-primary via-secondary to-accent shadow-2xl shadow-primary/30 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/40 via-transparent to-accent/40 animate-pulse" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,white,transparent)] opacity-20" />
                <Books size={48} weight="duotone" className="text-primary-foreground relative z-10" />
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

          <motion.h1 
            className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight bg-gradient-to-br from-primary via-secondary to-accent bg-clip-text text-transparent mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            Nexi Team Hub
          </motion.h1>
          
          <motion.p 
            className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            Samlet platform for guides, ressourcer og teamværktøjer
          </motion.p>
        </motion.header>

        <motion.div 
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
        >
          {modules.map((module, index) => (
            <motion.div
              key={module.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + index * 0.05, duration: 0.4 }}
            >
              <Card
                className={cn(
                  "relative overflow-hidden border-2 transition-all duration-300 group",
                  module.available 
                    ? "cursor-pointer hover:shadow-2xl hover:scale-[1.02] hover:border-primary/40 active:scale-[0.98]" 
                    : "opacity-60 cursor-not-allowed"
                )}
                onClick={() => module.available && onNavigate(module.id)}
              >
                <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                  style={{
                    background: `radial-gradient(circle at top right, ${module.color}15, transparent)`
                  }}
                />
                
                <div className="relative p-8">
                  <motion.div 
                    className={cn(
                      "mb-6 inline-flex items-center justify-center rounded-2xl p-4 shadow-lg transition-all duration-300",
                      module.available 
                        ? `bg-gradient-to-br ${module.gradient} group-hover:scale-110 group-hover:shadow-xl`
                        : "bg-muted"
                    )}
                    style={module.available ? { color: 'white' } : {}}
                  >
                    {module.icon}
                  </motion.div>

                  <h3 className="text-2xl font-bold mb-3 text-foreground">
                    {module.title}
                  </h3>
                  
                  <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                    {module.description}
                  </p>

                  {!module.available && (
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-muted text-muted-foreground text-xs font-semibold">
                      Kommer snart
                    </div>
                  )}

                  {module.available && (
                    <div className={cn(
                      "inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold text-white transition-all duration-300 opacity-0 group-hover:opacity-100",
                      `bg-gradient-to-r ${module.gradient}`
                    )}>
                      Åbn modul →
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  )
}
