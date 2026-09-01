import { useState, useRef, useEffect } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { PaperPlaneRight, Robot, User } from '@phosphor-icons/react'
import { ChatMessage, Guide } from '@/lib/types'
import { guidePlainText, guideExcerpt } from '@/lib/guideTypes'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

interface ChatAssistantProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  guides: Guide[]
}

export function ChatAssistant({ open, onOpenChange, guides }: ChatAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hej! Jeg er din guide-assistent. Hvordan kan jeg hjælpe dig i dag?',
      timestamp: Date.now(),
    },
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    // Local keyword search over the guide library — no AI backend required.
    const query = userMessage.content.toLowerCase()
    const terms = query.split(/\s+/).filter((term) => term.length > 2)

    const scored = guides
      .map((guide) => {
        const haystack = guidePlainText(guide).toLowerCase()
        let score = 0
        for (const term of terms) {
          if (guide.title.toLowerCase().includes(term)) score += 3
          else if (haystack.includes(term)) score += 1
        }
        return { guide, score }
      })
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)

    let content: string
    if (guides.length === 0) {
      content = 'Der er ingen guides i biblioteket endnu. Opret den første guide via "Tilføj Guide"-knappen.'
    } else if (scored.length === 0) {
      content = `Jeg fandt ingen guides, der matcher "${userMessage.content}". Prøv andre søgeord, eller opret en ny guide, hvis emnet mangler.`
    } else {
      const lines = scored.map(({ guide }) => {
        const snippet = guideExcerpt(guide, 150)
        return `• ${guide.title} (${guide.category})\n${snippet}`
      })
      content = `Jeg fandt ${scored.length === 1 ? 'denne guide' : 'disse guides'}, der kan hjælpe:\n\n${lines.join('\n\n')}\n\nÅbn guiden i biblioteket for at se det fulde indhold.`
    }

    const assistantMessage: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content,
      timestamp: Date.now(),
    }

    setMessages((prev) => [...prev, assistantMessage])
    setIsLoading(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:w-[500px] flex flex-col p-0">
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
                <div
                  className={cn(
                    'rounded-lg px-4 py-3 max-w-[80%]',
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-foreground'
                  )}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                </div>
                {message.role === 'user' && (
                  <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <User size={18} weight="duotone" className="text-primary" />
                  </div>
                )}
              </motion.div>
            ))}
            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-3 justify-start"
              >
                <div className="h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                  <Robot size={18} weight="duotone" className="text-accent-foreground" />
                </div>
                <div className="bg-muted rounded-lg px-4 py-3">
                  <div className="flex gap-1">
                    <div className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0ms]" />
                    <div className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:150ms]" />
                    <div className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </ScrollArea>

        <div className="p-6 pt-4 border-t">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSend()
            }}
            className="flex gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Stil et spørgsmål..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button type="submit" disabled={!input.trim() || isLoading} size="icon">
              <PaperPlaneRight size={18} weight="bold" />
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  )
}
