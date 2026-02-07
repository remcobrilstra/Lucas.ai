import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { SessionProvider } from "@/components/providers/session-provider"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SessionProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-6" style={{
            background: 'linear-gradient(135deg, hsl(24 100% 97%) 0%, hsl(30 67% 97%) 100%)'
          }}>
            {children}
          </main>
        </div>
      </div>
    </SessionProvider>
  )
}
