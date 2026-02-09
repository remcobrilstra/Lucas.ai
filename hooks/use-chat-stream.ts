"use client"

import { useState, useCallback } from "react"
import type { ToolCall } from "@/lib/ai/types"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

interface UseChatStreamOptions {
  agentId: string
  onError?: (error: Error) => void
  stream?: boolean
}

interface DebugInfo {
  usage?: {
    inputTokens: number
    outputTokens: number
  }
  cost?: number
  responseTime?: number
  toolCalls?: ToolCall[]
}

interface SessionUsage {
  inputTokens: number
  outputTokens: number
  cost: number
}

interface ExecuteAgentResult {
  response: string
  usage: {
    inputTokens: number
    outputTokens: number
  }
  cost: number
  responseTime: number
  toolCalls?: ToolCall[]
}

export function useChatStream({ agentId, onError, stream = true }: UseChatStreamOptions) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [streamingMessage, setStreamingMessage] = useState("")
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null)
  const [sessionUsage, setSessionUsage] = useState<SessionUsage>({
    inputTokens: 0,
    outputTokens: 0,
    cost: 0,
  })

  const sendMessage = useCallback(
    async (content: string) => {
      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, userMessage])
      setIsLoading(true)
      setStreamingMessage("")

      try {
        const response = await fetch(`/api/agents/${agentId}/test`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: content, stream }),
        })

        if (!response.ok) {
          throw new Error("Failed to send message")
        }

        if (stream) {
          const reader = response.body?.getReader()
          const decoder = new TextDecoder()

          if (!reader) {
            throw new Error("No reader available")
          }

          let accumulated = ""

          while (true) {
            const { done, value } = await reader.read()

            if (done) break

            const chunk = decoder.decode(value, { stream: true })
            accumulated += chunk
            setStreamingMessage(accumulated)
          }

          const assistantMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: "assistant",
            content: accumulated,
            timestamp: new Date(),
          }

          setMessages((prev) => [...prev, assistantMessage])
          setStreamingMessage("")
          return
        }

        const data = (await response.json()) as ExecuteAgentResult

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.response,
          timestamp: new Date(),
        }

        setMessages((prev) => [...prev, assistantMessage])
        setDebugInfo({
          usage: data.usage,
          cost: data.cost,
          responseTime: data.responseTime,
          toolCalls: data.toolCalls,
        })
        setSessionUsage((prev) => ({
          inputTokens: prev.inputTokens + data.usage.inputTokens,
          outputTokens: prev.outputTokens + data.usage.outputTokens,
          cost: prev.cost + data.cost,
        }))
      } catch (error) {
        console.error("Error sending message:", error)
        onError?.(error as Error)
      } finally {
        setIsLoading(false)
      }
    },
    [agentId, onError, stream]
  )

  return {
    messages,
    isLoading,
    streamingMessage,
    sendMessage,
    debugInfo,
    sessionUsage,
  }
}
