export type GuideCategory = 'Procedures' | 'Technical' | 'HR' | 'Safety' | 'General'

export interface Guide {
  id: string
  title: string
  category: GuideCategory
  content: string
  tags: string[]
  createdAt: number
  updatedAt: number
  wordFileData?: string
  wordFileName?: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  relatedGuides?: string[]
}
