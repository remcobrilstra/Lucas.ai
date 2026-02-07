"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Bot,
  Database,
  Wrench,
  Settings,
  Sparkles,
  X,
} from "lucide-react"
import { useEffect, useRef } from "react"

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Agents",
    href: "/agents",
    icon: Bot,
  },
  {
    name: "Data Sources",
    href: "/data-sources",
    icon: Database,
  },
  {
    name: "Playground",
    href: "/playground",
    icon: Sparkles,
  },
  {
    name: "Tools",
    href: "/tools",
    icon: Wrench,
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
  },
]

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  const previousPathname = useRef(pathname)

  // Close sidebar on route change (mobile) - only when pathname actually changes
  useEffect(() => {
    // Only close if:
    // 1. Sidebar is open
    // 2. Pathname actually changed (not just a re-render)
    if (isOpen && previousPathname.current !== pathname) {
      onClose()
    }

    // Update previous pathname
    previousPathname.current = pathname
  }, [pathname, isOpen, onClose])

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity lg:hidden",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 flex h-full w-64 flex-col border-r shadow-xl transition-transform duration-300 ease-in-out lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{
          background: 'linear-gradient(180deg, hsl(0 0% 100%) 0%, hsl(30 54% 94%) 100%)',
          borderColor: 'hsl(30 45% 88%)'
        }}
      >
        <div className="flex h-14 sm:h-16 items-center justify-between border-b px-4 sm:px-6" style={{
          borderColor: 'hsl(30 45% 88%)'
        }}>
          <Link href="/dashboard" className="flex items-center space-x-2 sm:space-x-2.5">
            <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl flex items-center justify-center shadow-lg" style={{
              background: 'linear-gradient(135deg, hsl(32 98% 56%) 0%, hsl(15 75% 55%) 100%)'
            }}>
              <Bot className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            <span className="text-lg sm:text-xl font-bold" style={{
              background: 'linear-gradient(135deg, hsl(22 60% 18%) 0%, hsl(15 70% 48%) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>Lucas.ai</span>
          </Link>

          {/* Mobile close button */}
          <button
            onClick={onClose}
            className="lg:hidden p-2 rounded-lg transition-colors hover:bg-amber-100"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" style={{ color: 'hsl(20 50% 35%)' }} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 sm:space-y-1.5 px-2 sm:px-3 py-3 sm:py-4 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center space-x-3 rounded-xl px-3 py-2.5 sm:py-3 text-sm font-semibold transition-all touch-manipulation",
                  isActive
                    ? "shadow-md"
                    : ""
                )}
                style={isActive ? {
                  background: 'linear-gradient(135deg, hsl(15 75% 55%) 0%, hsl(15 70% 48%) 100%)',
                  color: 'white'
                } : {
                  color: 'hsl(20 50% 35%)'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'linear-gradient(135deg, hsl(36 100% 93%) 0%, hsl(24 100% 95%) 100%)'
                    e.currentTarget.style.color = 'hsl(15 70% 48%)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = 'hsl(20 50% 35%)'
                  }
                }}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </nav>
      </aside>
    </>
  )
}
