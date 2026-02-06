"use client"

import { use, useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Edit, Play, Trash2, ArrowLeft } from "lucide-react"

interface Agent {
  id: string
  name: string
  description: string
  status: string
  systemPrompt: string
  temperature: number
  model: {
    displayName: string
    provider: {
      displayName: string
    }
  }
  dataSources: unknown[]
  tools: unknown[]
}

export default function AgentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { toast } = useToast()
  const [agent, setAgent] = useState<Agent | null>(null)
  const [loading, setLoading] = useState(true)

  const loadAgent = useCallback(async () => {
    try {
      const response = await fetch(`/api/agents/${id}`)
      const data = await response.json()
      setAgent(data)
    } catch {
      toast({
        title: "Error",
        description: "Failed to load agent",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [id, toast])

  useEffect(() => {
    loadAgent()
  }, [loadAgent])

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this agent?")) {
      return
    }

    try {
      const response = await fetch(`/api/agents/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete agent")
      }

      toast({
        title: "Success",
        description: "Agent deleted successfully",
      })

      router.push("/agents")
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete agent",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  if (!agent) {
    return <div>Agent not found</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/agents">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{agent.name}</h1>
          <p className="text-muted-foreground mt-2">{agent.description}</p>
        </div>
        <div className="flex gap-2">
          <Badge variant={agent.status === "active" ? "default" : "secondary"}>
            {agent.status}
          </Badge>
        </div>
      </div>

      <div className="flex gap-2">
        <Button asChild>
          <Link href={`/agents/${agent.id}/test`}>
            <Play className="mr-2 h-4 w-4" />
            Test Agent
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href={`/agents/${agent.id}/edit`}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Link>
        </Button>
        <Button variant="destructive" onClick={handleDelete}>
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Model</p>
              <p className="font-medium">
                {agent.model.provider.displayName} · {agent.model.displayName}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Temperature</p>
              <p className="font-medium">{agent.temperature}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Data Sources</p>
              <p className="font-medium">{agent.dataSources.length} connected</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Tools</p>
              <p className="font-medium">{agent.tools.length} enabled</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Prompt</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-muted p-4 rounded-lg max-h-64 overflow-y-auto">
              <p className="text-sm whitespace-pre-wrap">{agent.systemPrompt}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
