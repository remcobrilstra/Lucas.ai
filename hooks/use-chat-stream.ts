"use client"

import { useState, useCallback } from "react"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

interface UseChatStreamOptions {
  agentId: string
  onError?: (error: Error) => void
}

export function useChatStream({ agentId, onError }: UseChatStreamOptions) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [streamingMessage, setStreamingMessage] = useState("")

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
          body: JSON.stringify({ message: content, stream: true }),
        })

        if (!response.ok) {
          throw new Error("Failed to send message")
        }

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

        // Add final message
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: accumulated,
          timestamp: new Date(),
        }

        setMessages((prev) => [...prev, assistantMessage])
        setStreamingMessage("")
      } catch (error) {
        console.error("Error sending message:", error)
        onError?.(error as Error)
      } finally {
        setIsLoading(false)
      }
    },
    [agentId, onError]
  )

  return {
    messages,
    isLoading,
    streamingMessage,
    sendMessage,
  }
}
