"use client"

import { use, useState } from "react"
import { Button } from "@/components/ui/button"
import { MessageList } from "@/components/chat/message-list"
import { MessageInput } from "@/components/chat/message-input"
import { DebugPanel } from "@/components/chat/debug-panel"
import { useToast } from "@/hooks/use-toast"
import { useChatStream } from "@/hooks/use-chat-stream"
import type { ToolCall } from "@/lib/ai/types"
import { ArrowLeft, PanelRightClose, PanelRightOpen } from "lucide-react"
import Link from "next/link"

interface DebugInfo {
  usage?: {
    inputTokens: number
    outputTokens: number
  }
  cost?: number
  responseTime?: number
  toolCalls?: ToolCall[]
}

export default function TestAgentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { toast } = useToast()
  const [debugInfo] = useState<DebugInfo | null>(null)
  const [showDebug, setShowDebug] = useState(true)

  const { messages, isLoading, streamingMessage, sendMessage } = useChatStream({
    agentId: id,
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      })
    },
  })

  // Add streaming message to display
  const displayMessages = streamingMessage
    ? [
        ...messages,
        {
          id: "streaming",
          role: "assistant" as const,
          content: streamingMessage,
          timestamp: new Date(),
        },
      ]
    : messages

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col">
      <div className="flex items-center justify-between border-b p-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/agents/${id}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Agent
            </Link>
          </Button>
          <div>
            <h2 className="font-semibold">Test Agent</h2>
            <p className="text-sm text-muted-foreground">
              Chat with your agent in real-time
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowDebug(!showDebug)}
        >
          {showDebug ? (
            <>
              <PanelRightClose className="mr-2 h-4 w-4" />
              Hide Debug
            </>
          ) : (
            <>
              <PanelRightOpen className="mr-2 h-4 w-4" />
              Show Debug
            </>
          )}
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 flex flex-col">
          <MessageList messages={displayMessages} isLoading={isLoading && !streamingMessage} />
          <MessageInput onSend={sendMessage} disabled={isLoading} />
        </div>

        {showDebug && <DebugPanel debugInfo={debugInfo} />}
      </div>
    </div>
  )
}
