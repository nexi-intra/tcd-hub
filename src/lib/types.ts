import type { UserRole } from './userRoles'

export type GuideCategory = 'Procedures' | 'Technical' | 'HR' | 'Safety' | 'General'

// Guide-domænet (v2 m. sektioner/trin, versionering og opdaterings-interval) bor i guideTypes.ts.
export type { Guide, GuideSection, GuideStep, GuideVersionEntry } from './guideTypes'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  relatedGuides?: string[]
}

// ---- Fælles domænetyper (KV-storens datamodel) ----

export type ApprovalStatus = 'pending' | 'approved' | 'rejected'
export type VacationStatus = ApprovalStatus

/** Bruger som gemt i KV-nøglen 'users' (Record<email, StoredUser>). */
export interface StoredUser {
  email: string
  password: string
  fullName: string
  phone?: string
  isManager?: boolean
  role?: UserRole
  status?: ApprovalStatus
  /** Valgfrit brugernavn - kan bruges til login i stedet for email. Skal være unikt. */
  username?: string
}

/** KV: 'sick-leave-entries'. endDate sættes ikke af indmeldingsdialogen og kan mangle. */
export interface SickLeaveEntry {
  id: string
  userEmail: string
  userName: string
  startDate: string
  endDate?: string
  reason?: string
  status: ApprovalStatus
  submittedAt: string
  reportedBy?: string
  type?: 'self' | 'child'
}

/** KV: 'vacation-entries'. */
export interface VacationEntry {
  id: string
  userId: string
  userEmail: string
  startDate: string
  endDate: string
  notes?: string
  status: ApprovalStatus
  reviewedBy?: string
  reviewedAt?: string
  isSingleDay?: boolean
  manuallyGranted?: boolean
}

/** KV: 'shift-roles'. */
export interface ShiftRole {
  id: string
  name: string
  color: string
}

/** KV: 'shift-assignments'. */
export interface ShiftAssignment {
  id: string
  employeeId: string
  employeeName: string
  roleId: string
  date: string
  comment?: string
}

/** KV: 'employee-birthdays'. */
export interface BirthdayEntry {
  email: string
  fullName: string
  birthday: string
  birthYear?: number
}

/** KV: 'emails' (internt beskedsystem). */
export interface Email {
  id: string
  from: string
  to: string
  subject: string
  message: string
  timestamp: number
  read: boolean
  starred?: boolean
  folderId?: string
  /** Samtale-id: svar peger på original-mailens id, så tråden kan samles. */
  threadId?: string
  /** Historisk markør sat af enkelte afsendere (fx 'vacation-request'). */
  type?: string
  /** Handlings-knap i bunden af mailen — deep-link til et view/fane. */
  actionLink?: { view: string; tab?: string; label: string }
}

/** KV: 'email-folders'. */
export interface EmailFolder {
  id: string
  name: string
  userId: string
  createdAt: number
  color?: string
}

/** KV: 'meal-plan-weeks'. */
export interface WeekMenu {
  weekNumber: number
  year: number
  weekStart: string
  meals: {
    monday: string
    tuesday: string
    wednesday: string
    thursday: string
    friday: string
  }
}
