"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { useState } from "react"

export default function SettingsPage() {
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold" style={{
          background: 'linear-gradient(135deg, hsl(22 60% 18%) 0%, hsl(15 70% 48%) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>Settings</h1>
        <p className="mt-2 font-medium" style={{ color: 'hsl(20 50% 35%)' }}>
          Manage your account and preferences
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Link href="/settings/providers" onMouseEnter={() => setHoveredCard('providers')} onMouseLeave={() => setHoveredCard(null)}>
          <Card className="cursor-pointer transition-all shadow-lg border-amber-200 h-full" style={{
            background: hoveredCard === 'providers'
              ? 'linear-gradient(135deg, hsl(36 100% 93%) 0%, hsl(24 100% 95%) 100%)'
              : 'linear-gradient(135deg, hsl(0 0% 100%) 0%, hsl(30 54% 94%) 100%)',
            transform: hoveredCard === 'providers' ? 'translateY(-2px)' : 'none'
          }}>
            <CardHeader className="border-b" style={{ borderColor: 'hsl(30 45% 88%)' }}>
              <CardTitle className="text-xl font-bold" style={{ color: 'hsl(22 60% 18%)' }}>Providers</CardTitle>
              <CardDescription className="font-medium" style={{ color: 'hsl(20 50% 45%)' }}>
                Configure API keys for AI providers
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium" style={{ color: 'hsl(20 50% 35%)' }}>
                  OpenAI, Anthropic, Google, and more
                </p>
                <ArrowRight className="h-5 w-5" style={{ color: 'hsl(15 70% 48%)' }} />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/settings/models" onMouseEnter={() => setHoveredCard('models')} onMouseLeave={() => setHoveredCard(null)}>
          <Card className="cursor-pointer transition-all shadow-lg border-amber-200 h-full" style={{
            background: hoveredCard === 'models'
              ? 'linear-gradient(135deg, hsl(36 100% 93%) 0%, hsl(24 100% 95%) 100%)'
              : 'linear-gradient(135deg, hsl(0 0% 100%) 0%, hsl(30 54% 94%) 100%)',
            transform: hoveredCard === 'models' ? 'translateY(-2px)' : 'none'
          }}>
            <CardHeader className="border-b" style={{ borderColor: 'hsl(30 45% 88%)' }}>
              <CardTitle className="text-xl font-bold" style={{ color: 'hsl(22 60% 18%)' }}>Models</CardTitle>
              <CardDescription className="font-medium" style={{ color: 'hsl(20 50% 45%)' }}>
                Browse available AI models
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium" style={{ color: 'hsl(20 50% 35%)' }}>
                  View pricing, capabilities, and specifications
                </p>
                <ArrowRight className="h-5 w-5" style={{ color: 'hsl(15 70% 48%)' }} />
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/settings/organization" onMouseEnter={() => setHoveredCard('organization')} onMouseLeave={() => setHoveredCard(null)}>
          <Card className="cursor-pointer transition-all shadow-lg border-amber-200 h-full" style={{
            background: hoveredCard === 'organization'
              ? 'linear-gradient(135deg, hsl(36 100% 93%) 0%, hsl(24 100% 95%) 100%)'
              : 'linear-gradient(135deg, hsl(0 0% 100%) 0%, hsl(30 54% 94%) 100%)',
            transform: hoveredCard === 'organization' ? 'translateY(-2px)' : 'none'
          }}>
            <CardHeader className="border-b" style={{ borderColor: 'hsl(30 45% 88%)' }}>
              <CardTitle className="text-xl font-bold" style={{ color: 'hsl(22 60% 18%)' }}>Organization</CardTitle>
              <CardDescription className="font-medium" style={{ color: 'hsl(20 50% 45%)' }}>
                Manage your organization settings
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium" style={{ color: 'hsl(20 50% 35%)' }}>
                  Team members, billing, and more
                </p>
                <ArrowRight className="h-5 w-5" style={{ color: 'hsl(15 70% 48%)' }} />
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
