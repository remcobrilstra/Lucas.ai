"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { Search, Plus, Edit, Trash2, Loader2 } from "lucide-react"

interface Model {
  id: string
  modelKey: string
  displayName: string
  contextWindow: number
  maxOutputTokens: number | null
  inputPricePerM: number
  outputPricePerM: number
  capabilities: string[]
  isActive: boolean
  provider: {
    id: string
    displayName: string
  }
}

interface Provider {
  id: string
  displayName: string
}

export default function ModelsPage() {
  const { toast } = useToast()
  const [models, setModels] = useState<Model[]>([])
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [providerFilter, setProviderFilter] = useState<string>("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingModel, setEditingModel] = useState<Model | null>(null)
  const [saving, setSaving] = useState(false)

  const [formData, setFormData] = useState({
    providerId: "",
    modelKey: "",
    displayName: "",
    contextWindow: 128000,
    maxOutputTokens: 4096,
    inputPricePerM: 0.0,
    outputPricePerM: 0.0,
    capabilities: [] as string[],
    isActive: true,
  })

  const loadData = useCallback(async () => {
    try {
      const [modelsRes, providersRes] = await Promise.all([
        fetch("/api/models"),
        fetch("/api/providers"),
      ])

      const modelsData = await modelsRes.json()
      const providersData = await providersRes.json()

      setModels(modelsData)
      setProviders(providersData)
    } catch (error) {
      console.error("Failed to load data:", error)
      toast({
        title: "Error",
        description: "Failed to load models",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadData()
  }, [loadData])

  const providerNames = Array.from(new Set(models.map((m) => m.provider.displayName)))

  const filteredModels = models.filter((model) => {
    const matchesSearch =
      model.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      model.modelKey.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesProvider =
      providerFilter === "all" || model.provider.displayName === providerFilter

    return matchesSearch && matchesProvider
  })

  const handleCreate = () => {
    setEditingModel(null)
    setFormData({
      providerId: providers[0]?.id || "",
      modelKey: "",
      displayName: "",
      contextWindow: 128000,
      maxOutputTokens: 4096,
      inputPricePerM: 0.0,
      outputPricePerM: 0.0,
      capabilities: ["text"],
      isActive: true,
    })
    setDialogOpen(true)
  }

  const handleEdit = (model: Model) => {
    setEditingModel(model)
    setFormData({
      providerId: model.provider.id,
      modelKey: model.modelKey,
      displayName: model.displayName,
      contextWindow: model.contextWindow,
      maxOutputTokens: model.maxOutputTokens || 4096,
      inputPricePerM: model.inputPricePerM,
      outputPricePerM: model.outputPricePerM,
      capabilities: model.capabilities,
      isActive: model.isActive,
    })
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    setSaving(true)

    try {
      const url = editingModel ? `/api/models/${editingModel.id}` : "/api/models"
      const method = editingModel ? "PATCH" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to save model")
      }

      toast({
        title: "Success",
        description: editingModel ? "Model updated successfully" : "Model created successfully",
      })

      setDialogOpen(false)
      await loadData()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save model",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (model: Model) => {
    if (!confirm(`Are you sure you want to delete ${model.displayName}?`)) {
      return
    }

    try {
      const response = await fetch(`/api/models/${model.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to delete model")
      }

      toast({
        title: "Success",
        description: "Model deleted successfully",
      })

      await loadData()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete model",
        variant: "destructive",
      })
    }
  }

  const toggleCapability = (cap: string) => {
    setFormData((prev) => ({
      ...prev,
      capabilities: prev.capabilities.includes(cap)
        ? prev.capabilities.filter((c) => c !== cap)
        : [...prev.capabilities, cap],
    }))
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Models</h1>
          <p className="text-muted-foreground mt-2">
            Manage AI models and their configurations
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Add Model
        </Button>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search models..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={providerFilter} onValueChange={setProviderFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Providers" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Providers</SelectItem>
            {providerNames.map((provider) => (
              <SelectItem key={provider} value={provider}>
                {provider}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-6">
        {filteredModels.map((model) => (
          <Card key={model.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {model.displayName}
                    {!model.isActive && (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {model.provider.displayName} · {model.modelKey}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(model)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(model)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-4">
                {model.capabilities.map((cap) => (
                  <Badge key={cap} variant="outline" className="text-xs">
                    {cap}
                  </Badge>
                ))}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Context Window</p>
                  <p className="text-lg font-semibold">
                    {model.contextWindow.toLocaleString()} tokens
                  </p>
                </div>
                {model.maxOutputTokens && (
                  <div>
                    <p className="text-sm text-muted-foreground">Max Output</p>
                    <p className="text-lg font-semibold">
                      {model.maxOutputTokens.toLocaleString()} tokens
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Input Price</p>
                  <p className="text-lg font-semibold">
                    ${model.inputPricePerM.toFixed(2)}/1M
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Output Price</p>
                  <p className="text-lg font-semibold">
                    ${model.outputPricePerM.toFixed(2)}/1M
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredModels.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            No models found matching your criteria
          </p>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingModel ? "Edit Model" : "Add New Model"}</DialogTitle>
            <DialogDescription>
              {editingModel ? "Update model configuration" : "Configure a new AI model"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Provider</Label>
                <Select
                  value={formData.providerId}
                  onValueChange={(value) => setFormData({ ...formData, providerId: value })}
                  disabled={!!editingModel}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {providers.map((provider) => (
                      <SelectItem key={provider.id} value={provider.id}>
                        {provider.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Model Key</Label>
                <Input
                  value={formData.modelKey}
                  onChange={(e) => setFormData({ ...formData, modelKey: e.target.value })}
                  placeholder="e.g., gpt-4-turbo"
                  disabled={!!editingModel}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Display Name</Label>
              <Input
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                placeholder="e.g., GPT-4 Turbo"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Context Window (tokens)</Label>
                <Input
                  type="number"
                  value={formData.contextWindow}
                  onChange={(e) => setFormData({ ...formData, contextWindow: parseInt(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label>Max Output Tokens</Label>
                <Input
                  type="number"
                  value={formData.maxOutputTokens}
                  onChange={(e) => setFormData({ ...formData, maxOutputTokens: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Input Price (per 1M tokens)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.inputPricePerM}
                  onChange={(e) => setFormData({ ...formData, inputPricePerM: parseFloat(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label>Output Price (per 1M tokens)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.outputPricePerM}
                  onChange={(e) => setFormData({ ...formData, outputPricePerM: parseFloat(e.target.value) })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Capabilities</Label>
              <div className="flex gap-4">
                {["text", "vision", "function_calling"].map((cap) => (
                  <div key={cap} className="flex items-center space-x-2">
                    <Checkbox
                      checked={formData.capabilities.includes(cap)}
                      onCheckedChange={() => toggleCapability(cap)}
                    />
                    <label className="text-sm">{cap}</label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: !!checked })}
              />
              <Label>Active</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingModel ? "Save Changes" : "Create Model"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
