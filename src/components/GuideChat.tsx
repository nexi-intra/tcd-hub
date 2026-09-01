// RAG-chatbot for guidebiblioteket: svar bygges UDELUKKENDE af citater fra
// guides (retrieval via BM25-indekset) — ingen ekstern AI, ingen hallucination.
// Hvert citat viser kilde (§-reference), relevansscore og kan åbne guiden.

import { useState, useRef, useEffect } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { PaperPlaneRight, Robot, User, ArrowSquareOut, Quotes } from '@phosphor-icons/react'
import { Guide } from '@/lib/types'
import { guidePlainText } from '@/lib/guideTypes'
import type { GuideSearchIndex, SearchHit } from '@/lib/searchIndex'
import { detectLanguage, translateText, type GuideLanguage } from '@/lib/translator'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

interface Citation {
  guideId: string
  guideTitle: string
  reference: string
  heading: string
  quote: string
  /** Ordbogsbaseret oversættelse af citatet, når guide- og spørgesprog er forskellige. */
  translatedQuote?: string
  relevance: number
}

interface RagMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  citations?: Citation[]
  timestamp: number
}

interface GuideChatProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  guides: Guide[]
  searchIndex: GuideSearchIndex
  onOpenGuide: (guideId: string) => void
}

const MIN_RELEVANCE = 0.25

const UI_TEXT = {
  da: {
    found: (count: number, guides: number) =>
      `Jeg fandt ${count} relevant${count === 1 ? '' : 'e'} afsnit i ${guides} guide${guides === 1 ? '' : 's'}. Svaret er citeret direkte fra biblioteket:`,
    noHits: (q: string) => `Jeg fandt ikke noget i guidebiblioteket, der matcher "${q}". Prøv andre søgeord — eller opret en guide om emnet, hvis det mangler.`,
    empty: 'Der er ingen guides i biblioteket endnu. Opret den første guide via "Ny guide"-knappen.',
    translated: 'Oversat fra engelsk',
    openGuide: 'Åbn guide',
  },
  en: {
    found: (count: number, guides: number) =>
      `I found ${count} relevant section${count === 1 ? '' : 's'} in ${guides} guide${guides === 1 ? '' : 's'}. The answer is quoted directly from the library:`,
    noHits: (q: string) => `I couldn't find anything in the guide library matching "${q}". Try different keywords — or create a guide on the topic if it's missing.`,
    empty: 'There are no guides in the library yet. Create the first one via the "Ny guide" button.',
    translated: 'Translated from Danish',
    openGuide: 'Open guide',
  },
} as const

function hitsToCitations(hits: SearchHit[], guides: Guide[], answerLanguage: GuideLanguage): Citation[] {
  const languageById = new Map(guides.map((g) => [g.id, g.language || detectLanguage(guidePlainText(g))]))
  return hits
    .filter((hit) => hit.normalizedScore >= MIN_RELEVANCE)
    .slice(0, 4)
    .map((hit) => {
      const quote = hit.chunk.text.length > 220 ? hit.chunk.text.slice(0, 220) + '…' : hit.chunk.text
      const sourceLanguage = languageById.get(hit.chunk.guideId) || detectLanguage(hit.chunk.text)
      return {
        guideId: hit.chunk.guideId,
        guideTitle: hit.chunk.guideTitle,
        reference: hit.chunk.stepNumber
          ? `§${hit.chunk.stepNumber}`
          : hit.chunk.sectionNumber
            ? `§${hit.chunk.sectionNumber}`
            : '',
        heading: hit.chunk.heading,
        quote,
        translatedQuote: sourceLanguage !== answerLanguage
          ? translateText(quote, sourceLanguage, answerLanguage)
          : undefined,
        relevance: Math.round(hit.normalizedScore * 100),
      }
    })
}

export function GuideChat({ open, onOpenChange, guides, searchIndex, onOpenGuide }: GuideChatProps) {
  const [messages, setMessages] = useState<RagMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hej! Stil mig et spørgsmål, så finder jeg svaret i guidebiblioteket og citerer de relevante trin.',
      timestamp: Date.now(),
    },
  ])
  const [input, setInput] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = () => {
    const question = input.trim()
    if (!question) return

    const userMessage: RagMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: question,
      timestamp: Date.now(),
    }

    let assistantMessage: RagMessage
    const answerLanguage = detectLanguage(question)
    const t = UI_TEXT[answerLanguage]
    if (guides.length === 0) {
      assistantMessage = {
        id: `${Date.now()}-a`,
        role: 'assistant',
        content: t.empty,
        timestamp: Date.now(),
      }
    } else {
      const hits = searchIndex.search(question, 12)
      const citations = hitsToCitations(hits, guides, answerLanguage)
      if (citations.length === 0) {
        assistantMessage = {
          id: `${Date.now()}-a`,
          role: 'assistant',
          content: t.noHits(question),
          timestamp: Date.now(),
        }
      } else {
        const guideCount = new Set(citations.map((c) => c.guideId)).size
        assistantMessage = {
          id: `${Date.now()}-a`,
          role: 'assistant',
          content: t.found(citations.length, guideCount),
          citations,
          timestamp: Date.now(),
        }
      }
    }

    setMessages((prev) => [...prev, userMessage, assistantMessage])
    setInput('')
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:w-[520px] flex flex-col p-0">
        <SheetHeader className="p-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2 text-xl">
              <div className="h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center">
                <Robot size={24} weight="duotone" className="text-accent-foreground" />
              </div>
              Guide Assistent
            </SheetTitle>
            <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground">
              <kbd className="px-2 py-1 bg-muted rounded border border-border font-mono text-xs">ESC</kbd>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Svarer kun med indhold fra guidebiblioteket ({guides.length} guide{guides.length === 1 ? '' : 's'}, {searchIndex.chunkCount} afsnit indekseret)
          </p>
        </SheetHeader>

        <ScrollArea className="flex-1 p-6" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  'flex gap-3',
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {message.role === 'assistant' && (
                  <div className="h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                    <Robot size={18} weight="duotone" className="text-accent-foreground" />
                  </div>
                )}
                <div className={cn('max-w-[85%] space-y-2', message.role === 'user' && 'order-first')}>
                  <div
                    className={cn(
                      'rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap break-words',
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-br-sm'
                        : 'bg-muted rounded-bl-sm'
                    )}
                  >
                    {message.content}
                  </div>

                  {message.citations?.map((citation, index) => (
                    <motion.div
                      key={`${citation.guideId}-${citation.reference}-${index}`}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.06 }}
                      className="rounded-xl border-2 border-border bg-card p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Quotes size={14} weight="fill" className="text-primary shrink-0" />
                          <span className="text-xs font-bold truncate">{citation.guideTitle}</span>
                          {citation.reference && (
                            <Badge variant="secondary" className="text-[10px] font-mono shrink-0">{citation.reference}</Badge>
                          )}
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] font-semibold shrink-0',
                            citation.relevance >= 70 ? 'bg-green-500/10 text-green-600 border-green-500/30'
                              : citation.relevance >= 45 ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500/30'
                              : 'text-muted-foreground'
                          )}
                        >
                          {citation.relevance} %
                        </Badge>
                      </div>
                      {citation.heading && citation.heading !== citation.guideTitle && (
                        <div className="text-[11px] font-semibold text-muted-foreground">{citation.heading}</div>
                      )}
                      <blockquote className="text-xs text-foreground/90 border-l-2 border-primary/40 pl-2 italic break-words">
                        “{citation.quote}”
                      </blockquote>
                      {citation.translatedQuote && (
                        <div className="rounded-lg bg-muted/60 px-2 py-1.5 space-y-0.5">
                          <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                            {detectLanguage(citation.quote) === 'da' ? UI_TEXT.en.translated : UI_TEXT.da.translated}
                          </div>
                          <p className="text-xs break-words">{citation.translatedQuote}</p>
                        </div>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 gap-1.5 text-xs w-full"
                        onClick={() => onOpenGuide(citation.guideId)}
                      >
                        <ArrowSquareOut size={13} weight="bold" />
                        Åbn guide
                      </Button>
                    </motion.div>
                  ))}
                </div>
                {message.role === 'user' && (
                  <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <User size={18} weight="duotone" className="text-primary" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </ScrollArea>

        <div className="p-4 border-t bg-card">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSend()
                }
              }}
              placeholder="Spørg om noget fra guiderne…"
              className="flex-1"
            />
            <Button onClick={handleSend} disabled={!input.trim()} size="icon" className="shrink-0">
              <PaperPlaneRight size={18} weight="bold" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
