import { useState, useEffect, useCallback, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Trophy, PencilSimple, Trash, Check } from '@phosphor-icons/react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'

type Difficulty = string

interface ScoreEntry {
  email: string
  score: number
  level?: number
  timestamp: number
}

type Leaderboard = Record<Difficulty, ScoreEntry[]>
type PlayCounts = Record<string, Record<Difficulty, number>>

interface CategorySetting {
  label: string
  color: string
  bg: string
  border: string
  statBg: string
  statBorder: string
  statText: string
}

interface GameLeaderboardAdminProps {
  gameTitle: string
  icon: ReactNode
  /** KV-nøgle for spillets globale leaderboard, fx 'tetris-global-leaderboard'. */
  leaderboardKey: string
  /** KV-nøgle for spillets play counts, fx 'tetris-play-counts'. */
  playCountsKey: string
  /** Spil med levels (Brick Break) viser og redigerer også level. */
  hasLevel?: boolean
  /** Overstyr kategorierne (default: easy/medium/hard/expert). Brug fx ['all'] for et samlet highscores uden sværhedsgrader. */
  categories?: Difficulty[]
  /** Overstyr visuel opsætning pr. kategori (default: DIFFICULTY_SETTINGS). */
  categorySettings?: Record<Difficulty, CategorySetting>
  users: Array<{ email: string; fullName: string }>
}

const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard', 'expert']

const DIFFICULTY_SETTINGS: Record<Difficulty, { label: string; color: string; bg: string; border: string; statBg: string; statBorder: string; statText: string }> = {
  easy: { label: 'Let', color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/30', statBg: 'bg-green-500/10', statBorder: 'border-green-500/20', statText: 'text-green-600' },
  medium: { label: 'Mellem', color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', statBg: 'bg-yellow-500/10', statBorder: 'border-yellow-500/20', statText: 'text-yellow-600' },
  hard: { label: 'Svær', color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30', statBg: 'bg-red-500/10', statBorder: 'border-red-500/20', statText: 'text-red-600' },
  expert: { label: 'Ekspert', color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/30', statBg: 'bg-purple-500/10', statBorder: 'border-purple-500/20', statText: 'text-purple-600' },
}

// Manager-administration af ét spils highscores og spil-statistik.
// Erstatter de fem næsten identiske sektioner, der tidligere lå i ManagerPanel.
export function GameLeaderboardAdmin({ gameTitle, icon, leaderboardKey, playCountsKey, hasLevel = false, categories = DIFFICULTIES, categorySettings = DIFFICULTY_SETTINGS, users }: GameLeaderboardAdminProps) {
  const [leaderboard, setLeaderboard] = useState<Leaderboard | null>(null)
  const [playCounts, setPlayCounts] = useState<PlayCounts | null>(null)
  const [editingEntry, setEditingEntry] = useState<{ difficulty: Difficulty; email: string } | null>(null)
  const [newScore, setNewScore] = useState('')
  const [newLevel, setNewLevel] = useState('')

  const isFlatMode = categories.length === 1

  const load = useCallback(async () => {
    const raw = await window.kv.get<unknown>(leaderboardKey)
    const board: Leaderboard = isFlatMode
      ? { [categories[0]]: Array.isArray(raw) ? raw as ScoreEntry[] : [] }
      : (raw as Leaderboard) || Object.fromEntries(categories.map(c => [c, []])) as Leaderboard
    setLeaderboard(board)
    const counts = await window.kv.get<PlayCounts>(playCountsKey)
    setPlayCounts(counts || {})
  }, [leaderboardKey, playCountsKey, categories, isFlatMode])

  useEffect(() => {
    load()
  }, [load])

  const getUserName = (email: string) => {
    const user = users.find(u => u.email === email)
    return user ? user.fullName : email
  }

  const totalPlays = (counts: Record<Difficulty, number>) =>
    categories.reduce((sum, c) => sum + (counts[c] || 0), 0)

  const openEditDialog = (difficulty: Difficulty, entry: ScoreEntry) => {
    setEditingEntry({ difficulty, email: entry.email })
    setNewScore(entry.score.toString())
    setNewLevel(entry.level?.toString() || '')
  }

  const closeEditDialog = () => {
    setEditingEntry(null)
    setNewScore('')
    setNewLevel('')
  }

  const handleSaveScore = async () => {
    if (!editingEntry) return

    const scoreValue = parseInt(newScore)
    if (isNaN(scoreValue) || scoreValue < 0) {
      toast.error('Ugyldig score')
      return
    }
    const levelValue = parseInt(newLevel)
    if (hasLevel && (isNaN(levelValue) || levelValue < 0)) {
      toast.error('Ugyldig score eller level')
      return
    }

    const board = await window.kv.get<Leaderboard>(leaderboardKey)
    if (!board) {
      toast.error('Leaderboard ikke fundet')
      return
    }

    const entries = board[editingEntry.difficulty]
    const entryIndex = entries.findIndex(entry => entry.email === editingEntry.email)
    if (entryIndex === -1) {
      toast.error('Score entry ikke fundet')
      return
    }

    entries[entryIndex] = {
      ...entries[entryIndex],
      score: scoreValue,
      ...(hasLevel ? { level: levelValue } : {}),
      timestamp: Date.now(),
    }
    entries.sort((a, b) => b.score - a.score)

    if (isFlatMode) {
      await window.kv.set(leaderboardKey, entries)
    } else {
      await window.kv.set(leaderboardKey, { ...board, [editingEntry.difficulty]: entries })
    }
    await load()
    closeEditDialog()
    toast.success('Score opdateret')
  }

  const handleDeleteScore = async (difficulty: Difficulty, email: string) => {
    if (isFlatMode) {
      const raw = await window.kv.get<unknown>(leaderboardKey)
      const entries = (Array.isArray(raw) ? raw as ScoreEntry[] : []).filter(entry => entry.email !== email)
      await window.kv.set(leaderboardKey, entries)
      await load()
      toast.success('Score slettet')
      return
    }

    const board = await window.kv.get<Leaderboard>(leaderboardKey)
    if (!board) return
    board[difficulty] = board[difficulty].filter(entry => entry.email !== email)
    await window.kv.set(leaderboardKey, board)
    await load()
    toast.success('Score slettet')
  }

  return (
    <>
      <Card className="p-6 border-2">
        <div className="flex items-center gap-3 mb-6">
          {icon}
          <h2 className="text-2xl font-bold">{gameTitle} Spil Statistik</h2>
        </div>

        {playCounts && Object.keys(playCounts).length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {Object.entries(playCounts)
              .sort(([, a], [, b]) => totalPlays(b) - totalPlays(a))
              .map(([email, counts]) => (
                <motion.div
                  key={email}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-xl border-2 bg-gradient-to-br from-card to-muted/30 hover:shadow-lg transition-all"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex-1">
                      <div className="font-semibold text-lg">{getUserName(email)}</div>
                      <div className="text-xs text-muted-foreground">{email}</div>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                      <Trophy size={18} weight="fill" className="text-primary" />
                      <span className="font-bold text-lg text-primary">{totalPlays(counts)}</span>
                      <span className="text-xs text-muted-foreground">spil</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {categories.map((difficulty) => (
                      <div key={difficulty} className={`p-2 rounded ${categorySettings[difficulty].statBg} border ${categorySettings[difficulty].statBorder}`}>
                        <div className="text-xs text-muted-foreground mb-1">{categorySettings[difficulty].label}</div>
                        <div className={`font-bold ${categorySettings[difficulty].statText}`}>{counts[difficulty] || 0}</div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Trophy size={64} className="text-muted-foreground/30 mx-auto mb-4" weight="duotone" />
            <p className="text-muted-foreground">Ingen spil statistik endnu</p>
            <p className="text-sm text-muted-foreground mt-2">Statistik vil vises når brugere begynder at spille {gameTitle}</p>
          </div>
        )}
      </Card>

      <Card className="p-6 border-2">
        <div className="mb-4 p-4 bg-muted/50 rounded-lg border">
          <p className="text-sm text-muted-foreground">
            Her kan du redigere og slette highscores fra {gameTitle}. Du kan ændre score værdier{hasLevel ? ', level nået,' : ''} eller fjerne hele entries.
          </p>
        </div>

        {!leaderboard ? (
          <div className="text-center py-12">
            <Trophy size={64} className="text-muted-foreground mx-auto mb-4" weight="duotone" />
            <p className="text-muted-foreground">Indlæser highscores...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {categories.map((difficulty) => {
              const board = leaderboard[difficulty] || []
              const setting = categorySettings[difficulty]

              return (
                <div key={difficulty} className="space-y-3">
                  <div className={`p-4 rounded-lg ${setting.bg} border ${setting.border}`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Trophy size={24} weight="duotone" className={setting.color} />
                        <div>
                          <h3 className="font-bold text-lg">{setting.label}</h3>
                          <p className="text-xs text-muted-foreground">
                            {board.length} {board.length === 1 ? 'score' : 'scores'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {board.length === 0 ? (
                      <div className="text-center py-6">
                        <Trophy size={32} className="text-muted-foreground/30 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Ingen scores endnu</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {board.map((entry, index) => (
                          <motion.div
                            key={entry.email}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center justify-between p-3 rounded-lg bg-card border hover:shadow-sm transition-all group"
                          >
                            <div className="flex items-center gap-3 flex-1">
                              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 font-bold text-sm">
                                #{index + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold truncate">{getUserName(entry.email)}</div>
                                <div className="text-xs text-muted-foreground">{entry.email}</div>
                              </div>
                              {hasLevel ? (
                                <div className="text-right">
                                  <div className="text-lg font-bold text-primary">{entry.score}</div>
                                  <div className="text-xs text-muted-foreground">Level {entry.level}</div>
                                </div>
                              ) : (
                                <div className="text-lg font-bold text-primary">{entry.score}</div>
                              )}
                            </div>
                            <div className="ml-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditDialog(difficulty, entry)}
                                className="hover:bg-primary/10"
                              >
                                <PencilSimple size={20} />
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
                                    <AlertDialogTitle>Slet score?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Er du sikker på at du vil slette scoren for <strong>{getUserName(entry.email)}</strong>? Denne handling kan ikke fortrydes.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Annuller</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteScore(difficulty, entry.email)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Slet score
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <Dialog open={!!editingEntry} onOpenChange={(open) => { if (!open) closeEditDialog() }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rediger {gameTitle} score</DialogTitle>
            <DialogDescription>
              Rediger scoren{hasLevel ? ' og level' : ''} for {editingEntry?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor={`edit-score-${leaderboardKey}`}>Score *</Label>
              <Input
                id={`edit-score-${leaderboardKey}`}
                type="number"
                value={newScore}
                onChange={(e) => setNewScore(e.target.value)}
                placeholder="Indtast score"
                min="0"
              />
            </div>
            {hasLevel && (
              <div className="space-y-2">
                <Label htmlFor={`edit-level-${leaderboardKey}`}>Level *</Label>
                <Input
                  id={`edit-level-${leaderboardKey}`}
                  type="number"
                  value={newLevel}
                  onChange={(e) => setNewLevel(e.target.value)}
                  placeholder="Indtast level"
                  min="0"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeEditDialog}>
              Annuller
            </Button>
            <Button onClick={handleSaveScore} className="gap-2">
              <Check size={18} weight="bold" />
              Gem ændringer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
