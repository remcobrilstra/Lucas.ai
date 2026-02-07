"use client"

import { useEffect, useState } from "react"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

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

interface ModelSelectorProps {
  value?: string
  onValueChange: (value: string) => void
  disabled?: boolean
  filterModelIds?: string[] // Optional: only show these model IDs
}

export function ModelSelector({ value, onValueChange, disabled, filterModelIds }: ModelSelectorProps) {
  const [models, setModels] = useState<Model[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadModels()
  }, [])

  const loadModels = async () => {
    try {
      const response = await fetch("/api/models")
      const data = await response.json()
      setModels(data)
    } catch (error) {
      console.error("Failed to load models:", error)
    } finally {
      setLoading(false)
    }
  }

  // Filter models if filterModelIds is provided
  const filteredModels = filterModelIds
    ? models.filter((model) => filterModelIds.includes(model.id))
    : models

  // Group models by provider
  const groupedModels = filteredModels.reduce((acc, model) => {
    const providerName = model.provider.displayName
    if (!acc[providerName]) {
      acc[providerName] = []
    }
    acc[providerName].push(model)
    return acc
  }, {} as Record<string, Model[]>)

  const selectedModel = filteredModels.find((m) => m.id === value)

  return (
    <div className="space-y-4">
      <Select value={value} onValueChange={onValueChange} disabled={disabled || loading}>
        <SelectTrigger>
          <SelectValue placeholder={loading ? "Loading models..." : "Select a model"} />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(groupedModels).map(([providerName, providerModels]) => (
            <SelectGroup key={providerName}>
              <SelectLabel>{providerName}</SelectLabel>
              {providerModels.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  <div className="flex items-center gap-2">
                    <span>{model.displayName}</span>
                    <span className="text-xs text-muted-foreground">
                      ({model.contextWindow.toLocaleString()} tokens)
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>

      {selectedModel && (
        <div className="rounded-lg border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Model Details</h4>
            <div className="flex gap-2">
              {selectedModel.capabilities.map((cap) => (
                <Badge key={cap} variant="secondary" className="text-xs">
                  {cap}
                </Badge>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Context Window</p>
              <p className="font-medium">{selectedModel.contextWindow.toLocaleString()} tokens</p>
            </div>
            <div>
              <p className="text-muted-foreground">Provider</p>
              <p className="font-medium">{selectedModel.provider.displayName}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Input Price</p>
              <p className="font-medium">${selectedModel.inputPricePerM}/1M tokens</p>
            </div>
            <div>
              <p className="text-muted-foreground">Output Price</p>
              <p className="font-medium">${selectedModel.outputPricePerM}/1M tokens</p>
            </div>
          </div>

          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              Estimated cost for 10K input + 2K output tokens: $
              {((10000 / 1000000) * selectedModel.inputPricePerM +
                (2000 / 1000000) * selectedModel.outputPricePerM).toFixed(4)}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
