export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{
      background: 'linear-gradient(135deg, hsl(24 100% 97%) 0%, hsl(30 67% 97%) 50%, hsl(24 100% 95%) 100%)'
    }}>
      <div className="w-full max-w-md">
        {children}
      </div>
    </div>
  )
}
