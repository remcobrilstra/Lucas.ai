"use client"

import { Suspense, useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })

  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const result = await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirect: false,
      })

      if (result?.error) {
        toast({
          title: "Error",
          description: "Invalid email or password",
          variant: "destructive",
        })
      } else {
        router.push(callbackUrl)
        router.refresh()
      }
    } catch {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    try {
      await signIn("google", { callbackUrl })
    } catch {
      toast({
        title: "Error",
        description: "Failed to sign in with Google",
        variant: "destructive",
      })
      setIsLoading(false)
    }
  }

  return (
    <Card className="shadow-2xl border-amber-200" style={{
      background: 'linear-gradient(135deg, hsl(0 0% 100%) 0%, hsl(30 54% 94%) 100%)'
    }}>
      <CardHeader className="space-y-2 border-b" style={{ borderColor: 'hsl(30 45% 88%)' }}>
        <CardTitle className="text-3xl font-bold text-center" style={{
          background: 'linear-gradient(135deg, hsl(22 60% 18%) 0%, hsl(15 70% 48%) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>Welcome back</CardTitle>
        <CardDescription className="text-center font-medium" style={{ color: 'hsl(20 50% 45%)' }}>
          Sign in to your Lucas.ai account
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="font-semibold" style={{ color: 'hsl(20 50% 35%)' }}>Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              disabled={isLoading}
              className="border-amber-300 focus:border-terracotta-500 bg-white/80 font-medium"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="font-semibold" style={{ color: 'hsl(20 50% 35%)' }}>Password</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              disabled={isLoading}
              className="border-amber-300 focus:border-terracotta-500 bg-white/80 font-medium"
            />
          </div>
          <Button type="submit" className="w-full shadow-lg font-semibold" disabled={isLoading} style={{
            background: 'linear-gradient(135deg, hsl(15 75% 55%) 0%, hsl(15 70% 48%) 100%)'
          }}>
            {isLoading ? "Signing in..." : "Sign in"}
          </Button>
        </form>

        {process.env.NEXT_PUBLIC_GOOGLE_ENABLED && (
          <>
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" style={{ borderColor: 'hsl(30 45% 88%)' }} />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="px-3 font-semibold" style={{
                  background: 'linear-gradient(135deg, hsl(0 0% 100%) 0%, hsl(30 54% 94%) 100%)',
                  color: 'hsl(20 50% 45%)'
                }}>Or continue with</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full border-amber-300 hover:bg-amber-50 font-semibold"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              style={{ color: 'hsl(20 50% 35%)' }}
            >
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Google
            </Button>
          </>
        )}
      </CardContent>
      <CardFooter className="border-t pt-6" style={{ borderColor: 'hsl(30 45% 88%)' }}>
        <p className="text-sm text-center w-full font-medium" style={{ color: 'hsl(20 50% 45%)' }}>
          Don&apos;t have an account?{" "}
          <Link href="/register" className="hover:underline font-bold" style={{ color: 'hsl(15 70% 48%)' }}>
            Sign up
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">Welcome back</CardTitle>
            <CardDescription className="text-center">Loading...</CardDescription>
          </CardHeader>
        </Card>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
