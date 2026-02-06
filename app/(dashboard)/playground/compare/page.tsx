"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { PromptEditor } from "@/components/agents/prompt-editor"
import { useToast } from "@/hooks/use-toast"
import { formatCost } from "@/lib/utils/cost-calculator"
import { cn } from "@/lib/utils"
import { ArrowLeft, Loader2, Sparkles } from "lucide-react"

type Model = {
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

type PlaygroundResult = {
  modelId: string
  modelDisplayName: string
  providerDisplayName: string
  response?: string
  usage?: {
    inputTokens: number
    outputTokens: number
  }
  cost?: number
  responseTime?: number
  error?: string
}

const defaultSystemPrompt = "You are a helpful AI assistant. Answer clearly and concisely."

export default function PlaygroundComparePage() {
  const { toast } = useToast()
  const [models, setModels] = useState<Model[]>([])
  const [loadingModels, setLoadingModels] = useState(true)
  const [systemPrompt, setSystemPrompt] = useState(defaultSystemPrompt)
  const [userPrompt, setUserPrompt] = useState("")
  const [selectedModelIds, setSelectedModelIds] = useState<string[]>([])
  const [results, setResults] = useState<PlaygroundResult[]>([])
  const [isRunning, setIsRunning] = useState(false)

  useEffect(() => {
    const loadModels = async () => {
      try {
        const response = await fetch("/api/models")
        const data = await response.json()
        setModels(data)
        if (Array.isArray(data) && data.length > 0) {
          setSelectedModelIds([data[0].id])
        }
      } catch (error) {
        console.error("Failed to load models:", error)
      } finally {
        setLoadingModels(false)
      }
    }

    loadModels()
  }, [])

  const groupedModels = useMemo(() => {
    return models.reduce((acc, model) => {
      const providerName = model.provider.displayName
      if (!acc[providerName]) {
        acc[providerName] = []
      }
      acc[providerName].push(model)
      return acc
    }, {} as Record<string, Model[]>)
  }, [models])

  const canRun = Boolean(systemPrompt.trim())
    && Boolean(userPrompt.trim())
    && selectedModelIds.length > 0
    && !isRunning

  const toggleModel = (modelId: string) => {
    setSelectedModelIds((prev) => {
      if (prev.includes(modelId)) {
        return prev.filter((id) => id !== modelId)
      }
      return [...prev, modelId]
    })
  }

  const handleRun = async () => {
    if (!canRun) {
      return
    }

    setIsRunning(true)
    setResults([])

    try {
      const response = await fetch("/api/playground", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelIds: selectedModelIds,
          systemPrompt,
          userPrompt,
        }),
      })

      if (!response.ok) {
        const errorBody = await response.json()
        throw new Error(errorBody?.error || "Failed to run prompt")
      }

      const data = await response.json()
      setResults(data.results || [])
    } catch (error) {
      toast({
        title: "Run failed",
        description: (error as Error).message,
        variant: "destructive",
      })
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Model Comparison</h1>
              <p className="text-muted-foreground">
                Compare responses across multiple models side-by-side.
              </p>
            </div>
          </div>
          <Button variant="outline" asChild>
            <Link href="/playground">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Playground
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>System Prompt</CardTitle>
              <CardDescription>Set the behavior for every model run.</CardDescription>
            </CardHeader>
            <CardContent>
              <PromptEditor value={systemPrompt} onChange={setSystemPrompt} disabled={isRunning} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>User Prompt</CardTitle>
              <CardDescription>Ask your question or paste your test prompt.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={userPrompt}
                onChange={(event) => setUserPrompt(event.target.value)}
                placeholder="Write a prompt to compare across models..."
                rows={6}
                disabled={isRunning}
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {selectedModelIds.length} model{selectedModelIds.length === 1 ? "" : "s"} selected
                </p>
                <Button onClick={handleRun} disabled={!canRun}>
                  {isRunning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Run prompt
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Select Models</CardTitle>
              <CardDescription>Choose one or more models to compare.</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingModels ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading models...
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(groupedModels).map(([providerName, providerModels]) => (
                    <div key={providerName} className="space-y-2">
                      <h4 className="text-sm font-semibold text-muted-foreground">
                        {providerName}
                      </h4>
                      <div className="space-y-2">
                        {providerModels.map((model) => {
                          const isSelected = selectedModelIds.includes(model.id)
                          return (
                            <label
                              key={model.id}
                              className={cn(
                                "flex items-start gap-3 rounded-lg border p-3 transition",
                                isSelected ? "border-primary/60 bg-primary/5" : "hover:bg-muted"
                              )}
                            >
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleModel(model.id)}
                                disabled={isRunning}
                              />
                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-sm font-medium">{model.displayName}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {model.contextWindow.toLocaleString()} tokens
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {model.capabilities.map((capability) => (
                                    <Badge key={capability} variant="secondary" className="text-xs">
                                      {capability}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Results</CardTitle>
              <CardDescription>Each model response appears here after a run.</CardDescription>
            </CardHeader>
            <CardContent>
              {results.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No results yet. Run a prompt to compare model outputs.
                </div>
              ) : (
                <div className="space-y-4">
                  {results.map((result) => (
                    <div key={result.modelId} className="rounded-lg border p-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold">{result.modelDisplayName}</p>
                          <p className="text-xs text-muted-foreground">
                            {result.providerDisplayName}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs">
                          {typeof result.responseTime === "number" && (
                            <Badge variant="secondary">
                              {result.responseTime} ms
                            </Badge>
                          )}
                          {result.usage && (
                            <Badge variant="secondary">
                              {result.usage.inputTokens + result.usage.outputTokens} tokens
                            </Badge>
                          )}
                          {typeof result.cost === "number" && (
                            <Badge variant="secondary">{formatCost(result.cost)}</Badge>
                          )}
                        </div>
                      </div>

                      {result.error ? (
                        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                          {result.error}
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap text-sm">{result.response}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
