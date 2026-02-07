"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { Star, Sparkles, Check } from "lucide-react"

interface Model {
  id: string
  modelKey: string
  displayName: string
  contextWindow: number
  inputPricePerM: number
  outputPricePerM: number
  capabilities: string[]
  provider: {
    displayName: string
  }
}

interface PlaygroundSettings {
  defaultModelId: string | null
  availableModelIds: string[]
}

export default function PlaygroundSettingsPage() {
  const { toast } = useToast()
  const [models, setModels] = useState<Model[]>([])
  const [settings, setSettings] = useState<PlaygroundSettings>({
    defaultModelId: null,
    availableModelIds: [],
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      // Load all models
      const modelsResponse = await fetch("/api/models")
      const modelsData = await modelsResponse.json()
      setModels(modelsData)

      // Load playground settings
      const settingsResponse = await fetch("/api/settings/playground")
      const settingsData = await settingsResponse.json()
      setSettings(settingsData)
    } catch (error) {
      console.error("Failed to load data:", error)
      toast({
        title: "Error",
        description: "Failed to load playground settings",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleToggleModel = (modelId: string) => {
    setSettings((prev) => {
      const isCurrentlyAvailable = prev.availableModelIds.includes(modelId)
      const newAvailableIds = isCurrentlyAvailable
        ? prev.availableModelIds.filter((id) => id !== modelId)
        : [...prev.availableModelIds, modelId]

      // If removing the default model, clear the default
      const newDefaultId =
        prev.defaultModelId === modelId && isCurrentlyAvailable
          ? null
          : prev.defaultModelId

      return {
        defaultModelId: newDefaultId,
        availableModelIds: newAvailableIds,
      }
    })
  }

  const handleSetDefault = (modelId: string) => {
    // Ensure the model is in available list
    setSettings((prev) => {
      const availableIds = prev.availableModelIds.includes(modelId)
        ? prev.availableModelIds
        : [...prev.availableModelIds, modelId]

      return {
        defaultModelId: modelId,
        availableModelIds: availableIds,
      }
    })
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const response = await fetch("/api/settings/playground", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to save settings")
      }

      toast({
        title: "Success",
        description: "Playground settings saved successfully",
      })
    } catch (error) {
      console.error("Failed to save settings:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save settings",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  // Group models by provider
  const groupedModels = models.reduce((acc, model) => {
    const providerName = model.provider.displayName
    if (!acc[providerName]) {
      acc[providerName] = []
    }
    acc[providerName].push(model)
    return acc
  }, {} as Record<string, Model[]>)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg font-medium" style={{ color: "hsl(20 50% 35%)" }}>
          Loading settings...
        </div>
      </div>
    )
  }

  const hasChanges = true // Could track actual changes if needed

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1
          className="text-2xl sm:text-3xl lg:text-4xl font-bold"
          style={{
            background: "linear-gradient(135deg, hsl(22 60% 18%) 0%, hsl(15 70% 48%) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          Playground Settings
        </h1>
        <p className="mt-1 sm:mt-2 text-sm sm:text-base font-medium" style={{ color: "hsl(20 50% 35%)" }}>
          Configure which models are available in the playground and set a default
        </p>
      </div>

      <div className="space-y-4 sm:space-y-6">
        {/* Instructions Card */}
        <Card
          className="shadow-lg border-amber-200"
          style={{
            background: "linear-gradient(135deg, hsl(36 100% 93%) 0%, hsl(24 100% 95%) 100%)",
          }}
        >
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex items-start gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl shadow-lg flex-shrink-0"
                style={{
                  background: "linear-gradient(135deg, hsl(32 98% 56%) 0%, hsl(15 75% 55%) 100%)",
                }}
              >
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold" style={{ color: "hsl(22 60% 18%)" }}>
                  How it works
                </p>
                <p className="text-xs sm:text-sm font-medium" style={{ color: "hsl(20 50% 35%)" }}>
                  • Select which models appear in the playground dropdown
                  <br />
                  • Choose a default model to auto-select when opening the playground
                  <br />• Only selected models will be accessible to users
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Model Selection */}
        {Object.entries(groupedModels).map(([providerName, providerModels]) => (
          <Card
            key={providerName}
            className="shadow-lg border-amber-200"
            style={{
              background: "linear-gradient(135deg, hsl(0 0% 100%) 0%, hsl(30 54% 94%) 100%)",
            }}
          >
            <CardHeader className="border-b" style={{ borderColor: "hsl(30 45% 88%)" }}>
              <CardTitle className="text-lg sm:text-xl font-bold" style={{ color: "hsl(22 60% 18%)" }}>
                {providerName}
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm font-medium" style={{ color: "hsl(20 50% 45%)" }}>
                {providerModels.length} model{providerModels.length !== 1 ? "s" : ""} available
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 sm:pt-6">
              <div className="space-y-3 sm:space-y-4">
                {providerModels.map((model) => {
                  const isAvailable = settings.availableModelIds.includes(model.id)
                  const isDefault = settings.defaultModelId === model.id

                  return (
                    <div
                      key={model.id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 sm:p-4 rounded-lg transition-colors"
                      style={{
                        background: isAvailable
                          ? "linear-gradient(135deg, hsl(36 100% 93%) 0%, hsl(24 100% 95%) 100%)"
                          : "hsl(30 60% 97%)",
                      }}
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <Checkbox
                          id={model.id}
                          checked={isAvailable}
                          onCheckedChange={() => handleToggleModel(model.id)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Label
                              htmlFor={model.id}
                              className="font-bold cursor-pointer text-sm sm:text-base"
                              style={{ color: "hsl(22 60% 18%)" }}
                            >
                              {model.displayName}
                            </Label>
                            {isDefault && (
                              <Badge
                                className="text-[10px] sm:text-xs"
                                style={{
                                  background: "linear-gradient(135deg, hsl(32 98% 56%) 0%, hsl(15 75% 55%) 100%)",
                                  color: "white",
                                }}
                              >
                                <Star className="h-3 w-3 mr-1 fill-current" />
                                Default
                              </Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <p className="text-[10px] sm:text-xs font-medium" style={{ color: "hsl(20 50% 45%)" }}>
                              {model.contextWindow.toLocaleString()} tokens
                            </p>
                            <span className="text-[10px] sm:text-xs" style={{ color: "hsl(20 50% 45%)" }}>•</span>
                            <p className="text-[10px] sm:text-xs font-medium" style={{ color: "hsl(20 50% 45%)" }}>
                              ${model.inputPricePerM}/${model.outputPricePerM} per 1M
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {model.capabilities.map((cap) => (
                              <Badge key={cap} variant="secondary" className="text-[10px] sm:text-xs">
                                {cap}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2 sm:flex-shrink-0">
                        {isAvailable && !isDefault && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSetDefault(model.id)}
                            className="text-xs sm:text-sm touch-manipulation border-amber-300 hover:bg-amber-50"
                            style={{ color: "hsl(15 70% 48%)" }}
                          >
                            <Star className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                            Set as Default
                          </Button>
                        )}
                        {!isAvailable && (
                          <Button
                            size="sm"
                            onClick={() => handleSetDefault(model.id)}
                            className="text-xs sm:text-sm touch-manipulation shadow-md"
                            style={{
                              background: "linear-gradient(135deg, hsl(15 75% 55%) 0%, hsl(15 70% 48%) 100%)",
                            }}
                          >
                            <Check className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                            Enable & Set Default
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Save Button */}
        <div className="flex justify-end gap-3">
          <Button
            size="lg"
            onClick={handleSave}
            disabled={saving}
            className="shadow-lg font-semibold touch-manipulation"
            style={{
              background: "linear-gradient(135deg, hsl(15 75% 55%) 0%, hsl(15 70% 48%) 100%)",
            }}
          >
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </div>
    </div>
  )
}
