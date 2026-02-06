import Link from "next/link"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bot, Play, Edit, Trash2 } from "lucide-react"

interface AgentCardProps {
  agent: {
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
  onDelete?: (id: string) => void
}

export function AgentCard({ agent, onDelete }: AgentCardProps) {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">{agent.name}</h3>
              <p className="text-sm text-muted-foreground">
                {agent.model.provider.displayName} · {agent.model.displayName}
              </p>
            </div>
          </div>
          <Badge variant={agent.status === "active" ? "default" : "secondary"}>
            {agent.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1">
        <p className="text-sm text-muted-foreground line-clamp-2">{agent.description}</p>

        <div className="flex gap-4 mt-4 text-sm">
          <div>
            <span className="text-muted-foreground">Data Sources:</span>{" "}
            <span className="font-medium">{agent._count.dataSources}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Tools:</span>{" "}
            <span className="font-medium">{agent._count.tools}</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex gap-2">
        <Button asChild variant="default" size="sm" className="flex-1">
          <Link href={`/agents/${agent.id}/test`}>
            <Play className="mr-2 h-4 w-4" />
            Test
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href={`/agents/${agent.id}/edit`}>
            <Edit className="h-4 w-4" />
          </Link>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onDelete?.(agent.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  )
}
