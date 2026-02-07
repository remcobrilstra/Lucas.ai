"use client"

import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { SessionProvider } from "@/components/providers/session-provider"
import { useState, useCallback } from "react"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleCloseSidebar = useCallback(() => {
    setSidebarOpen(false)
  }, [])

  const handleOpenSidebar = useCallback(() => {
    setSidebarOpen(true)
  }, [])

  return (
    <SessionProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={handleCloseSidebar} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header onMenuClick={handleOpenSidebar} />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6" style={{
            background: 'linear-gradient(135deg, hsl(24 100% 97%) 0%, hsl(30 67% 97%) 100%)'
          }}>
            {children}
          </main>
        </div>
      </div>
    </SessionProvider>
  )
}
