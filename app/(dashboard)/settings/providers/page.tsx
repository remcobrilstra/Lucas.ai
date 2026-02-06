"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { CheckCircle2, XCircle, Key, Trash2 } from "lucide-react"

interface Provider {
  id: string
  name: string
  displayName: string
  type: string
  configured?: boolean
  isActive?: boolean
}

export default function ProvidersPage() {
  const { toast } = useToast()
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(true)
  const [configuring, setConfiguring] = useState<string | null>(null)
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({})

  const loadProviders = useCallback(async () => {
    try {
      const response = await fetch("/api/providers")
      const data = await response.json()

      // Check configuration status for each provider
      const providersWithStatus = await Promise.all(
        data.map(async (provider: Provider) => {
          const configResponse = await fetch(`/api/providers/${provider.id}/config`)
          const configData = await configResponse.json()
          return {
            ...provider,
            configured: configData.configured,
            isActive: configData.isActive,
          }
        })
      )

      setProviders(providersWithStatus)
    } catch {
      toast({
        title: "Error",
        description: "Failed to load providers",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadProviders()
  }, [loadProviders])

  const handleConfigure = async (providerId: string) => {
    const apiKey = apiKeys[providerId]

    if (!apiKey) {
      toast({
        title: "Error",
        description: "Please enter an API key",
        variant: "destructive",
      })
      return
    }

    setConfiguring(providerId)

    try {
      const response = await fetch(`/api/providers/${providerId}/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      })

      if (!response.ok) {
        throw new Error("Failed to configure provider")
      }

      toast({
        title: "Success",
        description: "Provider configured successfully",
      })

      // Clear API key input
      setApiKeys({ ...apiKeys, [providerId]: "" })

      // Reload providers
      await loadProviders()
    } catch {
      toast({
        title: "Error",
        description: "Failed to configure provider",
        variant: "destructive",
      })
    } finally {
      setConfiguring(null)
    }
  }

  const handleDelete = async (providerId: string) => {
    if (!confirm("Are you sure you want to remove this provider configuration?")) {
      return
    }

    try {
      const response = await fetch(`/api/providers/${providerId}/config`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete provider configuration")
      }

      toast({
        title: "Success",
        description: "Provider configuration removed",
      })

      await loadProviders()
    } catch {
      toast({
        title: "Error",
        description: "Failed to remove provider configuration",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Provider Settings</h1>
        <p className="text-muted-foreground mt-2">
          Configure API keys for AI providers
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {providers.map((provider) => (
          <Card key={provider.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{provider.displayName}</CardTitle>
                {provider.configured ? (
                  <Badge variant="default" className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Configured
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <XCircle className="h-3 w-3" />
                    Not Configured
                  </Badge>
                )}
              </div>
              <CardDescription>
                {provider.type === "openai" && "OpenAI GPT models"}
                {provider.type === "anthropic" && "Claude models"}
                {provider.type === "openrouter" && "Access to multiple LLMs"}
                {provider.type === "google" && "Gemini models"}
                {provider.type === "xai" && "Grok models"}
                {provider.type === "ollama" && "Local models"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor={`apikey-${provider.id}`}>API Key</Label>
                <div className="flex gap-2">
                  <Input
                    id={`apikey-${provider.id}`}
                    type="password"
                    placeholder={provider.configured ? "••••••••" : "Enter API key"}
                    value={apiKeys[provider.id] || ""}
                    onChange={(e) =>
                      setApiKeys({ ...apiKeys, [provider.id]: e.target.value })
                    }
                    disabled={configuring === provider.id}
                  />
                  <Button
                    onClick={() => handleConfigure(provider.id)}
                    disabled={configuring === provider.id || !apiKeys[provider.id]}
                  >
                    {configuring === provider.id ? (
                      "Saving..."
                    ) : (
                      <>
                        <Key className="mr-2 h-4 w-4" />
                        {provider.configured ? "Update" : "Save"}
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {provider.configured && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(provider.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remove Configuration
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
