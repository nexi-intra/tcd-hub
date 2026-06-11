import { SignOut, User } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface UserProfileProps {
  userEmail: string
  onLogout: () => void
}

export function UserProfile({ userEmail, onLogout }: UserProfileProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className="flex items-center gap-2 h-10 px-3 hover:bg-primary/10 transition-colors"
        >
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary via-secondary to-accent flex items-center justify-center">
            <User size={18} weight="bold" className="text-primary-foreground" />
          </div>
          <span className="text-sm font-medium hidden sm:inline">{userEmail}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Min konto</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-muted-foreground text-sm">
          {userEmail}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={onLogout}
          className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
        >
          <SignOut size={16} className="mr-2" />
          Log ud
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
