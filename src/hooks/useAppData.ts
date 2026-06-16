import { useState, useEffect, useCallback } from 'react'
import { useKV } from '@github/spark/hooks'

export interface TeamEmployee {
  id: string
  fullName: string
  email: string
  phone?: string
  role?: string
  avatarUrl?: string
}

export interface SickLeaveEntry {
  id: string
  userEmail: string
  userName: string
  startDate: string
  reason?: string
  status: 'pending' | 'approved' | 'rejected'
  submittedAt: string
  type?: 'self' | 'child'
}

export interface VacationEntry {
  id: string
  userId: string
  userEmail: string
  startDate: string
  endDate: string
  notes?: string
  status: 'pending' | 'approved' | 'rejected'
  reviewedBy?: string
  reviewedAt?: string
}

export interface ShiftRole {
  id: string
  name: string
  color: string
}

export interface ShiftAssignment {
  id: string
  employeeId: string
  employeeName: string
  roleId: string
  date: string
  comment?: string
}

export function useTeamData() {
  const [employees, setEmployees] = useState<TeamEmployee[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const employeesData = await window.spark.kv.get<TeamEmployee[]>('team-employees') || []
        setEmployees(employeesData)
      } catch (error) {
        console.error('Error loading employees:', error)
      } finally {
        setLoading(false)
      }
    }
    loadEmployees()
  }, [])

  const refreshEmployees = useCallback(async () => {
    const employeesData = await window.spark.kv.get<TeamEmployee[]>('team-employees') || []
    setEmployees(employeesData)
  }, [])

  return { employees, loading, refreshEmployees }
}

export function useSickLeaveData() {
  const [entries, setEntries, deleteEntries] = useKV<SickLeaveEntry[]>('sick-leave-entries', [])
  
  const addEntry = useCallback((entry: SickLeaveEntry) => {
    setEntries((current) => [...(current || []), entry])
  }, [setEntries])

  const updateEntry = useCallback((id: string, updates: Partial<SickLeaveEntry>) => {
    setEntries((current) =>
      (current || []).map((entry) => (entry.id === id ? { ...entry, ...updates } : entry))
    )
  }, [setEntries])

  const deleteEntry = useCallback((id: string) => {
    setEntries((current) => (current || []).filter((entry) => entry.id !== id))
  }, [setEntries])

  return { entries: entries || [], addEntry, updateEntry, deleteEntry, deleteAll: deleteEntries }
}

export function useVacationData() {
  const [entries, setEntries, deleteEntries] = useKV<VacationEntry[]>('vacation-entries', [])
  
  const addEntry = useCallback((entry: VacationEntry) => {
    setEntries((current) => [...(current || []), entry])
  }, [setEntries])

  const updateEntry = useCallback((id: string, updates: Partial<VacationEntry>) => {
    setEntries((current) =>
      (current || []).map((entry) => (entry.id === id ? { ...entry, ...updates } : entry))
    )
  }, [setEntries])

  const deleteEntry = useCallback((id: string) => {
    setEntries((current) => (current || []).filter((entry) => entry.id !== id))
  }, [setEntries])

  return { entries: entries || [], addEntry, updateEntry, deleteEntry, deleteAll: deleteEntries }
}

export function useShiftData() {
  const [roles, setRoles, deleteRoles] = useKV<ShiftRole[]>('shift-roles', [])
  const [assignments, setAssignments, deleteAssignments] = useKV<ShiftAssignment[]>('shift-assignments', [])

  const addRole = useCallback((role: ShiftRole) => {
    setRoles((current) => [...(current || []), role])
  }, [setRoles])

  const updateRole = useCallback((id: string, updates: Partial<ShiftRole>) => {
    setRoles((current) =>
      (current || []).map((role) => (role.id === id ? { ...role, ...updates } : role))
    )
  }, [setRoles])

  const deleteRole = useCallback((id: string) => {
    setRoles((current) => (current || []).filter((role) => role.id !== id))
    setAssignments((current) => (current || []).filter((assignment) => assignment.roleId !== id))
  }, [setRoles, setAssignments])

  const addAssignment = useCallback((assignment: ShiftAssignment) => {
    setAssignments((current) => [...(current || []), assignment])
  }, [setAssignments])

  const updateAssignment = useCallback((id: string, updates: Partial<ShiftAssignment>) => {
    setAssignments((current) =>
      (current || []).map((assignment) => (assignment.id === id ? { ...assignment, ...updates } : assignment))
    )
  }, [setAssignments])

  const deleteAssignment = useCallback((id: string) => {
    setAssignments((current) => (current || []).filter((assignment) => assignment.id !== id))
  }, [setAssignments])

  return {
    roles: roles || [],
    assignments: assignments || [],
    addRole,
    updateRole,
    deleteRole,
    addAssignment,
    updateAssignment,
    deleteAssignment,
    deleteAllRoles: deleteRoles,
    deleteAllAssignments: deleteAssignments
  }
}
