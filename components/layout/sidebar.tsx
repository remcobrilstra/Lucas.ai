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
} from "lucide-react"

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

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="flex h-full w-64 flex-col border-r shadow-xl" style={{
      background: 'linear-gradient(180deg, hsl(0 0% 100%) 0%, hsl(30 54% 94%) 100%)',
      borderColor: 'hsl(30 45% 88%)'
    }}>
      <div className="flex h-16 items-center border-b px-6" style={{
        borderColor: 'hsl(30 45% 88%)'
      }}>
        <Link href="/dashboard" className="flex items-center space-x-2.5">
          <div className="h-9 w-9 rounded-xl flex items-center justify-center shadow-lg" style={{
            background: 'linear-gradient(135deg, hsl(32 98% 56%) 0%, hsl(15 75% 55%) 100%)'
          }}>
            <Bot className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold" style={{
            background: 'linear-gradient(135deg, hsl(22 60% 18%) 0%, hsl(15 70% 48%) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>Lucas.ai</span>
        </Link>
      </div>

      <nav className="flex-1 space-y-1.5 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center space-x-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all",
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
              <item.icon className="h-5 w-5" />
              <span>{item.name}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
