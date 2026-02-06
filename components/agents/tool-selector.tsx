"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Calculator, Clock, Search, Wrench, type LucideIcon } from "lucide-react"

interface Tool {
  id: string
  name: string
  displayName: string
  description: string
  category: string
}

interface ToolSelectorProps {
  selectedTools: string[]
  onToolsChange: (toolIds: string[]) => void
}

const iconMap: Record<string, LucideIcon> = {
  math: Calculator,
  datetime: Clock,
  search: Search,
}

export function ToolSelector({ selectedTools, onToolsChange }: ToolSelectorProps) {
  const [tools, setTools] = useState<Tool[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const loadTools = async () => {
      try {
        const response = await fetch("/api/tools")
        const data = (await response.json()) as Tool[]
        if (isMounted) {
          setTools(data)
        }
      } catch (error) {
        console.error("Failed to load tools:", error)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadTools()

    return () => {
      isMounted = false
    }
  }, [])

  const handleToggle = (toolId: string) => {
    if (selectedTools.includes(toolId)) {
      onToolsChange(selectedTools.filter((id) => id !== toolId))
    } else {
      onToolsChange([...selectedTools, toolId])
    }
  }

  if (loading) {
    return <div>Loading tools...</div>
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Select the tools you want to enable for this agent. The agent will be able to call these tools when needed.
      </p>

      <div className="grid gap-4">
        {tools.map((tool) => {
          const Icon = iconMap[tool.category] || Wrench
          const isSelected = selectedTools.includes(tool.id)

          return (
            <Card
              key={tool.id}
              className={`cursor-pointer transition-colors ${
                isSelected ? "border-primary" : ""
              }`}
              onClick={() => handleToggle(tool.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleToggle(tool.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{tool.displayName}</CardTitle>
                    </div>
                  </div>
                  <Badge variant="secondary">{tool.category}</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground">{tool.description}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {selectedTools.length > 0 && (
        <div className="rounded-lg bg-muted p-4">
          <p className="text-sm font-medium">
            {selectedTools.length} tool{selectedTools.length !== 1 ? "s" : ""} selected
          </p>
        </div>
      )}
    </div>
  )
}
