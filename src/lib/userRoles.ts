export type UserRole = 'admin' | 'manager' | 'user'

export const ADMIN_EMAIL = 'jacob.remmer@nexigroup.com'
export const MANAGER_EMAILS = ['jacob.remmer@nexigorup.com']

interface UserData {
  email: string
  password: string
  fullName: string
  role?: UserRole
  isManager?: boolean
}

export async function getUserRole(email: string): Promise<UserRole> {
  const usersData = await window.spark.kv.get<Record<string, UserData>>('users')
  
  if (!usersData || !usersData[email]) {
    if (MANAGER_EMAILS.some(m => m.toLowerCase() === email.toLowerCase())) {
      return 'manager'
    }
    return 'user'
  }

  const user = usersData[email]
  
  if (user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
    return 'admin'
  }
  
  if (MANAGER_EMAILS.some(m => m.toLowerCase() === user.email.toLowerCase())) {
    return 'manager'
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

export function getRoleDisplayName(role: UserRole): string {
  const roleNames = {
    admin: 'Administrator',
    manager: 'Manager',
    user: 'Bruger'
  }
  return roleNames[role]
}

export function getRoleDescription(role: UserRole): string {
  switch (role) {
    case 'admin':
      return 'Fuld adgang til alle funktioner, kan administrere brugere og rettigheder'
    case 'manager':
      return 'Kan tildele rettigheder, håndtere sygemeldinger, godkende/afvise ferieansøgninger og redigere guides'
    case 'user':
      return 'Standard brugeradgang, kan se guides og anmode om ferie'
  }
}
