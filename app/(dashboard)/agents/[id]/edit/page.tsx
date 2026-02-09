"use client"

import { use, useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ModelSelector } from "@/components/agents/model-selector"
import { PromptEditor } from "@/components/agents/prompt-editor"
import { ToolSelector } from "@/components/agents/tool-selector"
import { useToast } from "@/hooks/use-toast"
import { ChevronLeft, ChevronRight, Loader2, ArrowLeft } from "lucide-react"
import Link from "next/link"

type Step = "basic" | "model" | "prompt" | "tools" | "review"

const steps: { id: Step; title: string; description: string }[] = [
  { id: "basic", title: "Basic Info", description: "Name and description" },
  { id: "model", title: "Model", description: "Select AI model" },
  { id: "prompt", title: "System Prompt", description: "Define behavior" },
  { id: "tools", title: "Tools", description: "Enable capabilities" },
  { id: "review", title: "Review", description: "Confirm changes" },
]

export default function EditAgentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { toast } = useToast()
  const [currentStep, setCurrentStep] = useState<Step>("basic")
  const [loading, setLoading] = useState(false)
  const [loadingAgent, setLoadingAgent] = useState(true)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    modelId: "",
    systemPrompt: "",
    temperature: 0.7,
    toolIds: [] as string[],
  })

  interface AgentTool {
    builtInToolId?: string | null
  }

  interface AgentResponse {
    name: string
    description: string
    modelId: string
    systemPrompt: string
    temperature: number
    tools: AgentTool[]
  }

  const loadAgent = useCallback(async () => {
    try {
      const response = await fetch(`/api/agents/${id}`)
      const data = (await response.json()) as AgentResponse

      setFormData({
        name: data.name,
        description: data.description,
        modelId: data.modelId,
        systemPrompt: data.systemPrompt,
        temperature: data.temperature,
        toolIds: data.tools.map((tool) => tool.builtInToolId).filter(Boolean) as string[],
      })
    } catch {
      toast({
        title: "Error",
        description: "Failed to load agent",
        variant: "destructive",
      })
    } finally {
      setLoadingAgent(false)
    }
  }, [id, toast])

  useEffect(() => {
    loadAgent()
  }, [loadAgent])

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep)

  const canProceed = () => {
    switch (currentStep) {
      case "basic":
        return formData.name.trim() !== "" && formData.description.trim() !== ""
      case "model":
        return formData.modelId !== ""
      case "prompt":
        return formData.systemPrompt.trim() !== ""
      case "tools":
        return true
      default:
        return true
    }
  }

  const handleNext = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStep(steps[currentStepIndex + 1].id)
    }
  }

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStep(steps[currentStepIndex - 1].id)
    }
  }

  const handleSubmit = async () => {
    setLoading(true)

    try {
      // Update agent
      const response = await fetch(`/api/agents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          modelId: formData.modelId,
          systemPrompt: formData.systemPrompt,
          temperature: formData.temperature,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update agent")
      }

      // Delete existing tools
      await fetch(`/api/agents/${id}/tools`, {
        method: "DELETE",
      })

      // Add new tools
      if (formData.toolIds.length > 0) {
        await Promise.all(
          formData.toolIds.map((toolId) =>
            fetch(`/api/agents/${id}/tools`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ toolId }),
            })
          )
        )
      }

      toast({
        title: "Success",
        description: "Agent updated successfully",
      })

      router.push(`/agents/${id}`)
    } catch {
      toast({
        title: "Error",
        description: "Failed to update agent",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (loadingAgent) {
    return <div>Loading agent...</div>
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/agents/${id}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Edit Agent</h1>
          <p className="text-muted-foreground mt-2">
            Modify your agent configuration
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  index <= currentStepIndex
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {index + 1}
              </div>
              <div className="text-center mt-2">
                <p className="text-sm font-medium">{step.title}</p>
                <p className="text-xs text-muted-foreground">{step.description}</p>
              </div>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`h-0.5 flex-1 mx-4 ${
                  index < currentStepIndex ? "bg-primary" : "bg-muted"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle>{steps[currentStepIndex].title}</CardTitle>
          <CardDescription>{steps[currentStepIndex].description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {currentStep === "basic" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="name">Agent Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Customer Support Bot"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe what this agent does..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                />
              </div>
            </>
          )}

          {currentStep === "model" && (
            <>
              <ModelSelector
                value={formData.modelId}
                onValueChange={(value) => setFormData({ ...formData, modelId: value })}
                onModelSelect={(model) => setFormData({ ...formData, modelId: model.id, temperature: model.defaultTemperature })}
              />
              <div className="space-y-2">
                <Label htmlFor="temperature">
                  Temperature Override (Optional)
                </Label>
                <Input
                  id="temperature"
                  type="number"
                  min="0"
                  max="2"
                  step="0.1"
                  value={formData.temperature}
                  onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) || 1.0 })}
                />
                <p className="text-xs text-muted-foreground">
                  Controls randomness. Higher values (e.g., 1.5) make output more creative, lower values (e.g., 0.3) make it more deterministic.
                </p>
              </div>
            </>
          )}

          {currentStep === "prompt" && (
            <PromptEditor
              value={formData.systemPrompt}
              onChange={(value) => setFormData({ ...formData, systemPrompt: value })}
            />
          )}

          {currentStep === "tools" && (
            <ToolSelector
              selectedTools={formData.toolIds}
              onToolsChange={(toolIds) => setFormData({ ...formData, toolIds })}
            />
          )}

          {currentStep === "review" && (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Agent Details</h4>
                <dl className="grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm text-muted-foreground">Name</dt>
                    <dd className="font-medium">{formData.name}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Description</dt>
                    <dd className="font-medium">{formData.description}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-muted-foreground">Tools Enabled</dt>
                    <dd className="font-medium">{formData.toolIds.length}</dd>
                  </div>
                </dl>
              </div>
              <div>
                <h4 className="font-semibold mb-2">System Prompt</h4>
                <div className="bg-muted p-4 rounded-lg max-h-48 overflow-y-auto">
                  <p className="text-sm whitespace-pre-wrap">{formData.systemPrompt}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStepIndex === 0 || loading}
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        {currentStep !== "review" ? (
          <Button onClick={handleNext} disabled={!canProceed() || loading}>
            Next
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        )}
      </div>
    </div>
  )
}
