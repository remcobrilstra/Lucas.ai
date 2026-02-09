"use client"

import { use, useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { MessageList } from "@/components/chat/message-list"
import { MessageInput } from "@/components/chat/message-input"
import { DebugPanel } from "@/components/chat/debug-panel"
import { useToast } from "@/hooks/use-toast"
import { useChatStream } from "@/hooks/use-chat-stream"
import { ArrowLeft, PanelRightClose, PanelRightOpen } from "lucide-react"
import Link from "next/link"

export default function TestAgentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { toast } = useToast()
  const [showDebug, setShowDebug] = useState(false)
  const [contextWindowTokens, setContextWindowTokens] = useState<number | null>(null)

  const {
    messages,
    isLoading,
    streamingMessage,
    sendMessage,
    debugInfo,
    sessionUsage,
  } = useChatStream({
    agentId: id,
    stream: false,
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      })
    },
  })

  useEffect(() => {
    let isActive = true

    const loadAgentContextWindow = async () => {
      try {
        const response = await fetch(`/api/agents/${id}`)

        if (!response.ok) {
          throw new Error("Failed to load agent")
        }

        const data = await response.json()
        const contextWindow = data?.model?.contextWindow

        if (isActive) {
          setContextWindowTokens(
            typeof contextWindow === "number" ? contextWindow : null
          )
        }
      } catch (error) {
        console.error("Failed to load agent context window:", error)
        if (isActive) {
          setContextWindowTokens(null)
        }
      }
    }

    setContextWindowTokens(null)
    loadAgentContextWindow()

    return () => {
      isActive = false
    }
  }, [id])

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

        {showDebug && (
          <DebugPanel
            debugInfo={debugInfo}
            sessionUsage={messages.length > 0 ? sessionUsage : null}
            contextWindowTokens={contextWindowTokens}
          />
        )}
      </div>
    </div>
  )
}
