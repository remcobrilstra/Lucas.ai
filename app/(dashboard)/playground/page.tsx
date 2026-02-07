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
import { ArrowRight, Sparkles, ChevronDown, Settings2, Zap, MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"

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
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [availableModelIds, setAvailableModelIds] = useState<string[]>([])
  const [loadingSettings, setLoadingSettings] = useState(true)

  // Load playground settings and auto-select default model
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch("/api/settings/playground")

        if (!response.ok) {
          console.error("Settings API error:", response.status, response.statusText)
          setLoadingSettings(false)
          return
        }

        const data = await response.json()
        console.log("Loaded playground settings:", data)

        setAvailableModelIds(data.availableModelIds || [])

        // Auto-select default model if available
        if (data.defaultModelId) {
          console.log("Setting default model:", data.defaultModelId)
          setModelId(data.defaultModelId)
        } else {
          console.log("No default model configured")
        }
      } catch (error) {
        console.error("Failed to load playground settings:", error)
      } finally {
        setLoadingSettings(false)
      }
    }

    loadSettings()
  }, [])

  useEffect(() => {
    setMessages([])
    setTotalInputTokens(0)
    setTotalOutputTokens(0)
    setTotalCost(0)
  }, [modelId])

  const handleSend = async (content: string) => {
    if (!modelId) {
      toast({
        title: "Select a model first",
        description: "Choose a model to start chatting.",
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

  const hasStarted = messages.length > 0 || modelId !== ""

  if (loadingSettings) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg font-medium" style={{ color: "hsl(20 50% 35%)" }}>
          Loading playground...
        </div>
      </div>
    )
  }

  return (
    <div className="playground-container">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');

        .playground-container {
          --amber-50: 39 100% 97%;
          --amber-100: 36 100% 93%;
          --amber-200: 35 100% 85%;
          --amber-400: 32 98% 56%;
          --amber-500: 28 93% 50%;
          --amber-600: 25 90% 45%;
          --peach-50: 24 100% 97%;
          --peach-100: 24 100% 95%;
          --peach-200: 24 95% 90%;
          --warm-50: 30 67% 97%;
          --warm-100: 30 54% 94%;
          --warm-200: 30 45% 88%;
          --terracotta-500: 15 75% 55%;
          --terracotta-600: 15 70% 48%;
          --clay-700: 20 50% 35%;
          --clay-800: 20 55% 25%;
          --clay-900: 22 60% 18%;
        }

        .playground-container {
          background: linear-gradient(135deg, hsl(var(--peach-50)) 0%, hsl(var(--warm-50)) 100%);
          min-height: calc(100vh - 7rem);
        }

        .playground-header {
          font-family: 'DM Sans', system-ui, -apple-system, sans-serif;
        }

        .warm-card {
          background: linear-gradient(135deg, hsl(0 0% 100% / 0.9) 0%, hsl(var(--peach-100) / 0.5) 100%);
          backdrop-filter: blur(10px);
        }

        .warm-card-alt {
          background: linear-gradient(135deg, hsl(var(--warm-100)) 0%, hsl(0 0% 100%) 100%);
        }

        .step-indicator {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .step-indicator.active {
          background: linear-gradient(135deg, hsl(var(--amber-400)), hsl(var(--terracotta-500)));
          box-shadow: 0 4px 14px -2px hsl(var(--amber-400) / 0.4);
        }

        .step-indicator.complete {
          background: linear-gradient(135deg, hsl(var(--terracotta-500)), hsl(var(--terracotta-600)));
        }

        .welcome-fade-in {
          animation: welcomeFadeIn 0.6s ease-out forwards;
        }

        @keyframes welcomeFadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .model-card-pulse {
          animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          background: linear-gradient(135deg, hsl(var(--amber-100)) 0%, hsl(var(--peach-100)) 50%, hsl(var(--warm-100)) 100%);
          border: 2px solid hsl(var(--amber-400) / 0.3);
        }

        @keyframes pulse {
          0%, 100% {
            box-shadow: 0 0 0 0 hsl(var(--amber-400) / 0.4), 0 10px 30px -5px hsl(var(--amber-500) / 0.2);
          }
          50% {
            box-shadow: 0 0 0 8px hsl(var(--amber-400) / 0), 0 10px 30px -5px hsl(var(--amber-500) / 0.3);
          }
        }

        .chat-interface {
          transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .advanced-panel {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          max-height: 0;
          overflow: hidden;
        }

        .advanced-panel.open {
          max-height: 500px;
        }

        .stat-card {
          background: linear-gradient(135deg, hsl(var(--warm-100)) 0%, hsl(var(--peach-100)) 100%);
          border: 1px solid hsl(var(--amber-200));
        }

        .header-gradient {
          background: linear-gradient(135deg, hsl(var(--terracotta-500)) 0%, hsl(var(--amber-500)) 100%);
        }
      `}</style>

      <div className="h-[calc(100vh-6.5rem)] sm:h-[calc(100vh-7rem)] flex flex-col gap-4 sm:gap-6 lg:gap-8">
        {/* Header with stepped progress */}
        <div className="welcome-fade-in">
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-start sm:justify-between gap-4 sm:gap-6">
            <div className="playground-header space-y-2 sm:space-y-3">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="header-gradient flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-xl sm:rounded-2xl shadow-xl shadow-amber-500/30 flex-shrink-0">
                  <Sparkles className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight bg-gradient-to-r from-clay-900 to-terracotta-600 bg-clip-text text-transparent dark:from-amber-100 dark:to-amber-300">
                    Playground
                  </h1>
                  <p className="text-clay-700 dark:text-amber-200 text-xs sm:text-sm mt-0.5 font-medium">
                    {!hasStarted ? "Start by selecting a model below" : "Chat with AI models in real-time"}
                  </p>
                </div>
              </div>

              {/* Progress indicators */}
              <div className="flex items-center gap-2 sm:ml-1 flex-wrap">
                <div className={cn(
                  "step-indicator flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-full text-[10px] sm:text-xs font-semibold transition-all",
                  modelId ? "complete text-white shadow-lg" : "active text-white shadow-lg"
                )}>
                  <div className="w-1.5 h-1.5 rounded-full bg-current" />
                  <span className="whitespace-nowrap">{modelId ? "Model selected" : "Choose model"}</span>
                </div>

                {modelId && (
                  <div className={cn(
                    "step-indicator flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-full text-[10px] sm:text-xs font-semibold transition-all",
                    messages.length > 0 ? "complete text-white shadow-lg" : "active text-white shadow-lg"
                  )}>
                    <div className="w-1.5 h-1.5 rounded-full bg-current" />
                    <span className="whitespace-nowrap">{messages.length > 0 ? "Chatting" : "Start chatting"}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 sm:gap-3 self-start sm:self-auto flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="gap-2 border-amber-300 bg-white/80 hover:bg-amber-50 text-clay-800 font-medium text-xs sm:text-sm touch-manipulation"
              >
                <Settings2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden xs:inline">Advanced</span>
                <ChevronDown className={cn(
                  "h-3 w-3 transition-transform",
                  showAdvanced && "rotate-180"
                )} />
              </Button>
              <Button
                variant="outline"
                size="sm"
                asChild
                className="gap-2 border-terracotta-500 bg-terracotta-500 hover:bg-terracotta-600 text-white font-medium shadow-md text-xs sm:text-sm touch-manipulation"
              >
                <Link href="/playground/compare">
                  <span className="hidden xs:inline">Compare models</span>
                  <span className="xs:hidden">Compare</span>
                  <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Main content area */}
        <div className="flex-1 min-h-0 flex flex-col gap-4 sm:gap-6">
          {/* No model selected state - prominent onboarding */}
          {!modelId && (
            <Card className="model-card-pulse shadow-xl">
              <CardHeader className="pb-3 sm:pb-4">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="header-gradient flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg sm:rounded-xl shadow-lg shadow-amber-500/30 flex-shrink-0">
                    <Zap className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg sm:text-xl lg:text-2xl font-bold text-clay-900 dark:text-amber-100">
                      Choose Your AI Model
                    </CardTitle>
                    <CardDescription className="mt-1 sm:mt-1.5 text-xs sm:text-sm text-clay-700 dark:text-amber-200">
                      Select from GPT-4, Claude, Gemini, and more. Each model has unique capabilities and pricing.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                <ModelSelector
                  value={modelId}
                  onValueChange={setModelId}
                  disabled={isLoading}
                  filterModelIds={availableModelIds.length > 0 ? availableModelIds : undefined}
                />
                <div className="flex items-center gap-2.5 text-sm text-terracotta-700 dark:text-amber-300 bg-gradient-to-r from-amber-100 to-peach-100 dark:from-amber-900/20 dark:to-terracotta-900/20 px-4 py-3 rounded-lg border border-amber-300/50">
                  <MessageSquare className="h-4 w-4 flex-shrink-0" />
                  <span className="font-medium">Once selected, you can start chatting immediately. No configuration required.</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Model selected - show chat interface */}
          {modelId && (
            <div className="chat-interface grid flex-1 grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-[1fr_340px] min-h-0">
              {/* Chat area */}
              <Card className="warm-card flex flex-col min-h-0 border-amber-200 dark:border-amber-800 shadow-lg">
                <CardHeader className="border-b border-amber-200 bg-gradient-to-r from-peach-100 to-warm-100 dark:from-amber-900/30 dark:to-terracotta-900/30 flex-shrink-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-base sm:text-lg font-bold text-clay-900 dark:text-amber-100">Conversation</CardTitle>
                      <CardDescription className="text-[10px] sm:text-xs mt-0.5 text-clay-700 dark:text-amber-200 truncate">
                        {messages.length === 0
                          ? "Type a message below to begin"
                          : `${messages.filter(m => m.role === 'user').length} messages sent`}
                      </CardDescription>
                    </div>
                    {messages.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setMessages([])
                          setTotalInputTokens(0)
                          setTotalOutputTokens(0)
                          setTotalCost(0)
                        }}
                        className="text-xs h-7 sm:h-8 px-2 sm:px-3 text-terracotta-600 hover:text-terracotta-700 hover:bg-amber-100 flex-shrink-0 touch-manipulation"
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col min-h-0 p-0">
                  <MessageList messages={messages} isLoading={isLoading} />
                  <MessageInput onSend={handleSend} disabled={isLoading} />
                </CardContent>
              </Card>

              {/* Sidebar with stats and settings */}
              <div className="space-y-3 sm:space-y-4">
                {/* Usage stats - only show when there are messages */}
                {messages.length > 0 && (
                  <Card className="stat-card shadow-lg">
                    <CardHeader className="pb-2 sm:pb-3 border-b border-amber-200">
                      <CardTitle className="text-xs sm:text-sm font-bold text-clay-900 dark:text-amber-100">Session Metrics</CardTitle>
                      <CardDescription className="text-[10px] sm:text-xs text-clay-700 dark:text-amber-200">Real-time usage tracking</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 sm:space-y-3 pt-3 sm:pt-4">
                      <div className="grid grid-cols-2 gap-2 sm:gap-3">
                        <div className="space-y-0.5 sm:space-y-1 bg-white/60 dark:bg-clay-900/20 p-2 sm:p-3 rounded-lg border border-amber-200/50">
                          <p className="text-[9px] sm:text-[10px] uppercase tracking-wide text-terracotta-600 dark:text-amber-400 font-bold">Input</p>
                          <p className="text-lg sm:text-xl font-bold text-clay-900 dark:text-amber-100">
                            {(totalInputTokens / 1000).toFixed(1)}K
                          </p>
                        </div>
                        <div className="space-y-0.5 sm:space-y-1 bg-white/60 dark:bg-clay-900/20 p-2 sm:p-3 rounded-lg border border-amber-200/50">
                          <p className="text-[9px] sm:text-[10px] uppercase tracking-wide text-terracotta-600 dark:text-amber-400 font-bold">Output</p>
                          <p className="text-lg sm:text-xl font-bold text-clay-900 dark:text-amber-100">
                            {(totalOutputTokens / 1000).toFixed(1)}K
                          </p>
                        </div>
                      </div>
                      <div className="pt-3 border-t border-amber-200 space-y-2">
                        <div className="flex items-baseline justify-between">
                          <span className="text-xs text-clay-700 dark:text-amber-200 font-medium">Total tokens</span>
                          <span className="text-sm font-bold text-clay-900 dark:text-amber-100">
                            {((totalInputTokens + totalOutputTokens) / 1000).toFixed(1)}K
                          </span>
                        </div>
                        <div className="flex items-baseline justify-between bg-gradient-to-r from-terracotta-100 to-amber-100 dark:from-terracotta-900/30 dark:to-amber-900/30 px-3 py-2 rounded-lg border border-terracotta-300/50">
                          <span className="text-xs text-terracotta-800 dark:text-amber-200 font-bold">Cost estimate</span>
                          <span className="text-base font-bold text-terracotta-600 dark:text-amber-400">
                            {formatCost(totalCost)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Model info card - compact */}
                <Card className="warm-card-alt border-amber-200 dark:border-amber-800 shadow-lg">
                  <CardHeader className="pb-3 border-b border-amber-200">
                    <CardTitle className="text-sm font-bold text-clay-900 dark:text-amber-100">Active Model</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <ModelSelector
                      value={modelId}
                      onValueChange={setModelId}
                      disabled={isLoading}
                      filterModelIds={availableModelIds.length > 0 ? availableModelIds : undefined}
                    />
                  </CardContent>
                </Card>

                {/* Advanced settings panel */}
                <div className={cn("advanced-panel", showAdvanced && "open")}>
                  <Card className="warm-card-alt border-amber-200 dark:border-amber-800 shadow-lg">
                    <CardHeader className="pb-3 border-b border-amber-200">
                      <CardTitle className="text-sm font-bold text-clay-900 dark:text-amber-100">System Prompt</CardTitle>
                      <CardDescription className="text-xs text-clay-700 dark:text-amber-200">
                        Customize model behavior
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 pt-4">
                      <Textarea
                        id="systemPrompt"
                        value={systemPrompt}
                        onChange={(event) => setSystemPrompt(event.target.value)}
                        rows={5}
                        disabled={isLoading}
                        className="text-xs resize-none bg-white/60 border-amber-300"
                      />
                      <p className="text-[10px] text-clay-600 dark:text-amber-300">
                        Applied to all messages in this conversation
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
