"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatCost } from "@/lib/utils/cost-calculator"
import type { ToolCall } from "@/lib/ai/types"
import type { RetrievedChunk } from "@/lib/data-sources/types"
import { FileText } from "lucide-react"

interface DebugInfo {
  usage?: {
    inputTokens: number
    outputTokens: number
  }
  cost?: number
  responseTime?: number
  toolCalls?: ToolCall[]
  retrievedChunks?: RetrievedChunk[]
}

interface DebugPanelProps {
  debugInfo: DebugInfo | null
  sessionUsage?: {
    inputTokens: number
    outputTokens: number
    cost: number
  } | null
  contextWindowTokens?: number | null
}

export function DebugPanel({ debugInfo, sessionUsage, contextWindowTokens }: DebugPanelProps) {
  const hasSessionUsage =
    !!sessionUsage &&
    sessionUsage.inputTokens + sessionUsage.outputTokens > 0
  const latestUsageTokens = debugInfo?.usage
    ? debugInfo.usage.inputTokens + debugInfo.usage.outputTokens
    : 0
  const contextUsagePercent =
    contextWindowTokens && latestUsageTokens > 0
      ? Math.min(100, (latestUsageTokens / contextWindowTokens) * 100)
      : 0

  if (!debugInfo && !hasSessionUsage) {
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
        {hasSessionUsage && sessionUsage && (
          <Card className="border-border/60">
            <CardHeader className="pb-2 border-b">
              <CardTitle className="text-xs font-semibold">Session Metrics</CardTitle>
              <p className="text-[10px] text-muted-foreground">Real-time usage tracking</p>
            </CardHeader>
            <CardContent className="space-y-3 pt-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1 bg-muted/40 p-2 rounded-lg border border-border/50">
                  <p className="text-[9px] uppercase tracking-wide text-muted-foreground font-semibold">Input</p>
                  <p className="text-lg font-semibold">
                    {(sessionUsage.inputTokens / 1000).toFixed(1)}K
                  </p>
                </div>
                <div className="space-y-1 bg-muted/40 p-2 rounded-lg border border-border/50">
                  <p className="text-[9px] uppercase tracking-wide text-muted-foreground font-semibold">Output</p>
                  <p className="text-lg font-semibold">
                    {(sessionUsage.outputTokens / 1000).toFixed(1)}K
                  </p>
                </div>
              </div>
              <div className="pt-3 border-t space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-muted-foreground font-medium">Total tokens</span>
                  <span className="text-sm font-semibold">
                    {((sessionUsage.inputTokens + sessionUsage.outputTokens) / 1000).toFixed(1)}K
                  </span>
                </div>
                <div className="flex items-baseline justify-between bg-muted/60 px-3 py-2 rounded-lg border border-border/50">
                  <span className="text-xs font-semibold">Cost estimate</span>
                  <span className="text-base font-semibold">
                    {formatCost(sessionUsage.cost)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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

        {contextWindowTokens && latestUsageTokens > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Context Window</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-muted-foreground">Latest message</span>
                <span className="font-semibold">
                  {latestUsageTokens.toLocaleString()} / {contextWindowTokens.toLocaleString()}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted">
                <div
                  className="h-2 rounded-full bg-primary"
                  style={{ width: `${contextUsagePercent.toFixed(1)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {contextUsagePercent.toFixed(1)}% of context window
              </p>
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

        {debugInfo.retrievedChunks && debugInfo.retrievedChunks.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Retrieved Context
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="text-xs text-muted-foreground">
                  {debugInfo.retrievedChunks.length} chunk
                  {debugInfo.retrievedChunks.length !== 1 ? "s" : ""} retrieved from knowledge base
                </div>
                {debugInfo.retrievedChunks.map((chunk, index) => (
                  <div key={chunk.id} className="p-3 bg-muted rounded space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-xs">Source {index + 1}</span>
                      <Badge variant="outline" className="text-xs">
                        {(chunk.similarity * 100).toFixed(0)}% match
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-4">
                      {chunk.content}
                    </p>
                    {chunk.metadata && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                          Metadata
                        </summary>
                        <pre className="mt-1 overflow-x-auto">
                          {JSON.stringify(chunk.metadata, null, 2)}
                        </pre>
                      </details>
                    )}
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
