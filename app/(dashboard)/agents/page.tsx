"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AgentCard } from "@/components/agents/agent-card"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { Plus, Search, Bot } from "lucide-react"

interface Agent {
  id: string
  name: string
  description: string
  status: string
  model: {
    displayName: string
    provider: {
      displayName: string
    }
  }
  _count: {
    dataSources: number
    tools: number
  }
}

export default function AgentsPage() {
  const { toast } = useToast()
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  const loadAgents = useCallback(async () => {
    try {
      const response = await fetch("/api/agents")
      const data = await response.json()
      setAgents(data)
    } catch {
      toast({
        title: "Error",
        description: "Failed to load agents",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    loadAgents()
  }, [loadAgents])

  const handleDelete = async (id: string) => {
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

      await loadAgents()
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete agent",
        variant: "destructive",
      })
    }
  }

  const filteredAgents = agents.filter((agent) =>
    agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold" style={{
            background: 'linear-gradient(135deg, hsl(22 60% 18%) 0%, hsl(15 70% 48%) 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>Agents</h1>
          <p className="mt-1 sm:mt-2 text-sm sm:text-base font-medium" style={{ color: 'hsl(20 50% 35%)' }}>
            Create and manage your AI agents
          </p>
        </div>
        <Button asChild className="shadow-lg font-semibold self-start sm:self-auto touch-manipulation" style={{
          background: 'linear-gradient(135deg, hsl(15 75% 55%) 0%, hsl(15 70% 48%) 100%)'
        }}>
          <Link href="/agents/new">
            <Plus className="mr-2 h-4 w-4" />
            Create Agent
          </Link>
        </Button>
      </div>

      {agents.length > 0 && (
        <div className="flex items-center gap-4">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: 'hsl(15 70% 48%)' }} />
            <Input
              placeholder="Search agents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 border-amber-300 focus:border-terracotta-500 bg-white/80 font-medium"
              style={{ color: 'hsl(20 50% 35%)' }}
            />
          </div>
        </div>
      )}

      {filteredAgents.length > 0 ? (
        <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {filteredAgents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} onDelete={handleDelete} />
          ))}
        </div>
      ) : agents.length > 0 ? (
        <div className="text-center py-8 sm:py-12">
          <p className="font-medium text-sm sm:text-base" style={{ color: 'hsl(20 50% 45%)' }}>No agents found matching your search.</p>
        </div>
      ) : (
        <div className="text-center py-12 sm:py-16 px-4 border-2 border-dashed rounded-2xl shadow-lg" style={{
          borderColor: 'hsl(35 100% 85%)',
          background: 'linear-gradient(135deg, hsl(36 100% 93%) 0%, hsl(24 100% 95%) 100%)'
        }}>
          <div className="mx-auto max-w-md">
            <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl mb-4 shadow-lg" style={{
              background: 'linear-gradient(135deg, hsl(32 98% 56%) 0%, hsl(15 75% 55%) 100%)'
            }}>
              <Bot className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
            </div>
            <h3 className="font-bold text-lg sm:text-xl mb-2" style={{ color: 'hsl(22 60% 18%)' }}>No agents yet</h3>
            <p className="mb-6 font-medium text-sm sm:text-base" style={{ color: 'hsl(20 50% 35%)' }}>
              Create your first AI agent to get started with Lucas.ai
            </p>
            <Button asChild className="shadow-lg font-semibold touch-manipulation" style={{
              background: 'linear-gradient(135deg, hsl(15 75% 55%) 0%, hsl(15 70% 48%) 100%)'
            }}>
              <Link href="/agents/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Agent
              </Link>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
