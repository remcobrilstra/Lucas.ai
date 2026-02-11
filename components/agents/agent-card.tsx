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
  canEdit?: boolean
}

export function AgentCard({ agent, onDelete, canEdit = true }: AgentCardProps) {
  return (
    <Card className="flex flex-col shadow-lg border-amber-200" style={{
      background: 'linear-gradient(135deg, hsl(0 0% 100%) 0%, hsl(30 54% 94%) 100%)'
    }}>
      <CardHeader className="border-b" style={{ borderColor: 'hsl(30 45% 88%)' }}>
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-11 w-11 rounded-xl flex items-center justify-center shadow-md" style={{
              background: 'linear-gradient(135deg, hsl(32 98% 56%) 0%, hsl(15 75% 55%) 100%)'
            }}>
              <Bot className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold" style={{ color: 'hsl(22 60% 18%)' }}>{agent.name}</h3>
              <p className="text-xs font-medium" style={{ color: 'hsl(20 50% 45%)' }}>
                {agent.model.provider.displayName} · {agent.model.displayName}
              </p>
            </div>
          </div>
          <Badge
            variant={agent.status === "active" ? "default" : "secondary"}
            className="font-semibold shadow-sm"
            style={agent.status === "active" ? {
              background: 'linear-gradient(135deg, hsl(120 60% 50%) 0%, hsl(120 55% 45%) 100%)',
              color: 'white'
            } : {
              background: 'hsl(30 45% 88%)',
              color: 'hsl(20 50% 35%)'
            }}
          >
            {agent.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 pt-4">
        <p className="text-sm font-medium line-clamp-2" style={{ color: 'hsl(20 50% 35%)' }}>{agent.description}</p>

        <div className="flex gap-4 mt-4 text-sm">
          <div className="px-3 py-1.5 rounded-lg" style={{
            background: 'linear-gradient(135deg, hsl(36 100% 93%) 0%, hsl(24 100% 95%) 100%)',
            border: '1px solid hsl(35 100% 85%)'
          }}>
            <span className="font-medium" style={{ color: 'hsl(20 50% 45%)' }}>Data Sources:</span>{" "}
            <span className="font-bold" style={{ color: 'hsl(15 70% 48%)' }}>{agent._count.dataSources}</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg" style={{
            background: 'linear-gradient(135deg, hsl(36 100% 93%) 0%, hsl(24 100% 95%) 100%)',
            border: '1px solid hsl(35 100% 85%)'
          }}>
            <span className="font-medium" style={{ color: 'hsl(20 50% 45%)' }}>Tools:</span>{" "}
            <span className="font-bold" style={{ color: 'hsl(15 70% 48%)' }}>{agent._count.tools}</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex gap-2 border-t pt-4" style={{ borderColor: 'hsl(30 45% 88%)' }}>
        <Button asChild size="sm" className="flex-1 shadow-md font-semibold" style={{
          background: 'linear-gradient(135deg, hsl(15 75% 55%) 0%, hsl(15 70% 48%) 100%)'
        }}>
          <Link href={`/agents/${agent.id}/test`}>
            <Play className="mr-2 h-4 w-4" />
            Test
          </Link>
        </Button>
        {canEdit && (
          <>
            <Button asChild variant="outline" size="sm" className="border-amber-300 hover:bg-amber-50 font-semibold" style={{
              color: 'hsl(20 50% 35%)'
            }}>
              <Link href={`/agents/${agent.id}/edit`}>
                <Edit className="h-4 w-4" />
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete?.(agent.id)}
              className="border-amber-300 hover:bg-red-50 font-semibold"
              style={{ color: 'hsl(0 70% 50%)' }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        )}
      </CardFooter>
    </Card>
  )
}
