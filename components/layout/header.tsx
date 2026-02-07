"use client"

import { useSession, signOut } from "next-auth/react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { LogOut, User, Menu } from "lucide-react"

interface HeaderProps {
  onMenuClick: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const { data: session } = useSession()

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U"
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <header className="h-14 sm:h-16 border-b shadow-sm flex-shrink-0" style={{
      background: 'linear-gradient(90deg, hsl(0 0% 100%) 0%, hsl(30 54% 94%) 100%)',
      borderColor: 'hsl(30 45% 88%)'
    }}>
      <div className="flex h-full items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          {/* Mobile hamburger menu */}
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 -ml-2 rounded-lg transition-colors hover:bg-amber-100 touch-manipulation"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" style={{ color: 'hsl(20 50% 35%)' }} />
          </button>

          <div className="flex-1">
            {/* Breadcrumbs or page title can go here */}
          </div>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 sm:h-10 sm:w-10 rounded-full hover:bg-amber-100 touch-manipulation">
                <Avatar className="h-9 w-9 sm:h-10 sm:w-10 ring-2 ring-amber-200">
                  <AvatarImage src={session?.user?.image || ""} alt={session?.user?.name || ""} />
                  <AvatarFallback style={{
                    background: 'linear-gradient(135deg, hsl(32 98% 56%) 0%, hsl(15 75% 55%) 100%)',
                    color: 'white',
                    fontWeight: '600'
                  }}>{getInitials(session?.user?.name)}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56" style={{
              background: 'linear-gradient(135deg, hsl(0 0% 100%) 0%, hsl(30 54% 94%) 100%)',
              border: '1px solid hsl(30 45% 88%)'
            }}>
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-semibold leading-none truncate" style={{ color: 'hsl(22 60% 18%)' }}>
                    {session?.user?.name}
                  </p>
                  <p className="text-xs leading-none truncate" style={{ color: 'hsl(20 50% 35%)' }}>
                    {session?.user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator style={{ background: 'hsl(30 45% 88%)' }} />
              <DropdownMenuItem style={{ color: 'hsl(20 50% 35%)' }} className="hover:bg-amber-100 touch-manipulation cursor-pointer">
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator style={{ background: 'hsl(30 45% 88%)' }} />
              <DropdownMenuItem
                className="hover:bg-red-50 touch-manipulation cursor-pointer"
                style={{ color: 'hsl(0 70% 50%)' }}
                onClick={() => signOut({ callbackUrl: "/login" })}
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
