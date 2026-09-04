export type UserRole = 'admin' | 'manager' | 'user'

export const ADMIN_EMAIL = 'jacob.remmer@nexigroup.com'
export const MANAGER_EMAILS = ['jacob.remmer@nexigroup.com']

// Garanteret adgang for administratoren, uanset tilstanden af den delte
// KV-store (fx hvis brugerens konto ved et uheld bliver slettet/ændret).
// Kun en PBKDF2-hash er bagt ind i koden — IKKE selve adgangskoden — så
// den ikke kan læses direkte af nogen med adgang til kildekoden.
export const MASTER_ADMIN_PASSWORD_HASH = 'pbkdf2$150000$yDMn6LPFNdPCNXoGCeHVWg==$7gOEKz3Ovs7I8o2MfwMqJXzSC+uc91L+/BDC/+dPhUY='

interface UserData {
  email: string
  password: string
  fullName: string
  role?: UserRole
  isManager?: boolean
}

export async function getUserRole(email: string): Promise<UserRole> {
  const normalizedEmail = email.trim().toLowerCase()

  // Hardcoded roles take precedence and work even if the KV store is unavailable.
  if (normalizedEmail === ADMIN_EMAIL.toLowerCase()) {
    return 'admin'
  }
  if (MANAGER_EMAILS.some(m => m.toLowerCase() === normalizedEmail)) {
    return 'manager'
  }

  let usersData: Record<string, UserData> | undefined
  try {
    usersData = await window.kv.get<Record<string, UserData>>('users')
  } catch (error) {
    console.error('Kunne ikke hente brugerroller fra KV:', error)
    return 'user'
  }

  const user = usersData?.[email] || usersData?.[normalizedEmail]
  if (!user) {
    return 'user'
  }

  if (user.role) {
    return user.role
  }

  if (user.isManager) {
    return 'manager'
  }

  return 'user'
}

export async function hasAdminAccess(email: string): Promise<boolean> {
  const role = await getUserRole(email)
  return role === 'admin'
}

export async function hasManagerAccess(email: string): Promise<boolean> {
  const role = await getUserRole(email)
  return role === 'admin' || role === 'manager'
}

export function getRoleDisplayName(role: UserRole, language: 'da' | 'en' = 'da'): string {
  const roleNames = {
    da: {
      admin: 'Administrator',
      manager: 'Manager',
      user: 'Bruger'
    },
    en: {
      admin: 'Administrator',
      manager: 'Manager',
      user: 'User'
    }
  }
  return roleNames[language][role]
}

export function getRoleDescription(role: UserRole, language: 'da' | 'en' = 'da'): string {
  if (language === 'en') {
    switch (role) {
      case 'admin':
        return 'Full access to all features, can manage users and permissions'
      case 'manager':
        return 'Can assign permissions, handle sick leave, approve/reject vacation requests and edit guides'
      case 'user':
        return 'Standard user access, can view guides and request vacation'
    }
  }
  switch (role) {
    case 'admin':
      return 'Fuld adgang til alle funktioner, kan administrere brugere og rettigheder'
    case 'manager':
      return 'Kan tildele rettigheder, håndtere sygemeldinger, godkende/afvise ferieansøgninger og redigere guides'
    case 'user':
      return 'Standard brugeradgang, kan se guides og anmode om ferie'
  }
}
