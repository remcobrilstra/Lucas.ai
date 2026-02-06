"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatCost } from "@/lib/utils/cost-calculator"
import type { ToolCall } from "@/lib/ai/types"

interface DebugInfo {
  usage?: {
    inputTokens: number
    outputTokens: number
  }
  cost?: number
  responseTime?: number
  toolCalls?: ToolCall[]
}

interface DebugPanelProps {
  debugInfo: DebugInfo | null
}

export function DebugPanel({ debugInfo }: DebugPanelProps) {
  if (!debugInfo) {
    return (
      <div className="w-80 border-l bg-card p-4">
        <h3 className="font-semibold mb-4">Debug Info</h3>
        <p className="text-sm text-muted-foreground">
          Send a message to see debug information
        </p>
      </div>
    )
  }

  return (
    <div className="w-80 border-l bg-card p-4 overflow-y-auto">
      <h3 className="font-semibold mb-4">Debug Info</h3>

      <div className="space-y-4">
        {debugInfo.usage && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Token Usage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Input:</span>
                <Badge variant="secondary">{debugInfo.usage.inputTokens.toLocaleString()}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Output:</span>
                <Badge variant="secondary">{debugInfo.usage.outputTokens.toLocaleString()}</Badge>
              </div>
              <div className="flex justify-between font-semibold pt-2 border-t">
                <span>Total:</span>
                <Badge>
                  {(debugInfo.usage.inputTokens + debugInfo.usage.outputTokens).toLocaleString()}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {debugInfo.cost !== undefined && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Cost</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCost(debugInfo.cost)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                For this response
              </p>
            </CardContent>
          </Card>
        )}

        {debugInfo.responseTime !== undefined && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Response Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(debugInfo.responseTime / 1000).toFixed(2)}s
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Time to generate response
              </p>
            </CardContent>
          </Card>
        )}

        {debugInfo.toolCalls && debugInfo.toolCalls.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Tool Calls</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                {debugInfo.toolCalls.map((tool, index) => (
                  <div key={index} className="p-2 bg-muted rounded">
                    <p className="font-medium">{tool.name}</p>
                    <pre className="text-xs mt-1 overflow-x-auto">
                      {JSON.stringify(tool.arguments, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
