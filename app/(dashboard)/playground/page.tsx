"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ModelSelector } from "@/components/agents/model-selector"
import { MessageList } from "@/components/chat/message-list"
import { MessageInput } from "@/components/chat/message-input"
import { useToast } from "@/hooks/use-toast"
import { formatCost } from "@/lib/utils/cost-calculator"
import { ArrowRight, Sparkles } from "lucide-react"

type ChatMessage = {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

type ChatResponse = {
  response: string
  usage: {
    inputTokens: number
    outputTokens: number
  }
  cost: number
}

const defaultSystemPrompt = "You are a helpful AI assistant. Answer clearly and concisely."

export default function PlaygroundPage() {
  const { toast } = useToast()
  const [modelId, setModelId] = useState("")
  const [systemPrompt, setSystemPrompt] = useState(defaultSystemPrompt)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [totalInputTokens, setTotalInputTokens] = useState(0)
  const [totalOutputTokens, setTotalOutputTokens] = useState(0)
  const [totalCost, setTotalCost] = useState(0)

  useEffect(() => {
    setMessages([])
    setTotalInputTokens(0)
    setTotalOutputTokens(0)
    setTotalCost(0)
  }, [modelId])

  const handleSend = async (content: string) => {
    if (!modelId) {
      toast({
        title: "Select a model",
        description: "Choose a model before starting the chat.",
        variant: "destructive",
      })
      return
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date(),
    }

    const nextMessages = [...messages, userMessage]
    setMessages(nextMessages)
    setIsLoading(true)

    try {
      const response = await fetch("/api/playground/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelId,
          systemPrompt,
          messages: nextMessages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
        }),
      })

      if (!response.ok) {
        const errorBody = await response.json()
        throw new Error(errorBody?.error || "Failed to send message")
      }

      const data = (await response.json()) as ChatResponse

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.response,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])
      setTotalInputTokens((prev) => prev + data.usage.inputTokens)
      setTotalOutputTokens((prev) => prev + data.usage.outputTokens)
      setTotalCost((prev) => prev + data.cost)
    } catch (error) {
      toast({
        title: "Message failed",
        description: (error as Error).message,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Playground</h1>
            <p className="text-muted-foreground">
              Chat with any model and quickly compare outputs.
            </p>
          </div>
        </div>
        <Button variant="outline" asChild>
          <Link href="/playground/compare">
            Compare models
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-6 lg:grid-cols-[1fr_360px] min-h-0">
        <Card className="flex flex-col min-h-0">
          <CardHeader>
            <CardTitle>Chat</CardTitle>
            <CardDescription>Send messages and explore model behavior.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col min-h-0 p-0">
            <MessageList messages={messages} isLoading={isLoading} />
            <MessageInput onSend={handleSend} disabled={isLoading} />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Conversation Usage</CardTitle>
              <CardDescription>Running totals for this chat.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Input tokens</span>
                <span className="font-medium">{totalInputTokens.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Output tokens</span>
                <span className="font-medium">{totalOutputTokens.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between border-t pt-3 text-sm">
                <span className="text-muted-foreground">Total tokens</span>
                <span className="font-semibold">
                  {(totalInputTokens + totalOutputTokens).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Estimated cost</span>
                <span className="font-semibold">{formatCost(totalCost)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Model</CardTitle>
              <CardDescription>Select a model to chat with.</CardDescription>
            </CardHeader>
            <CardContent>
              <ModelSelector value={modelId} onValueChange={setModelId} disabled={isLoading} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>System Prompt</CardTitle>
              <CardDescription>Customize how the model should respond.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Label htmlFor="systemPrompt" className="text-sm">
                Prompt
              </Label>
              <Textarea
                id="systemPrompt"
                value={systemPrompt}
                onChange={(event) => setSystemPrompt(event.target.value)}
                rows={6}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                This prompt is included with every message you send.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
