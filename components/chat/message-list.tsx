"use client"

import { useEffect, useRef } from "react"
import { Bot, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { MarkdownContent } from "./markdown-content"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp?: Date
}

interface MessageListProps {
  messages: Message[]
  isLoading?: boolean
}

export function MessageList({ messages, isLoading }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading])

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8" style={{
        background: 'linear-gradient(135deg, hsl(30 67% 97%) 0%, hsl(24 100% 97%) 100%)'
      }}>
        <div className="max-w-md text-center space-y-4 sm:space-y-6">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl shadow-xl" style={{
            background: 'linear-gradient(135deg, hsl(32 98% 56%) 0%, hsl(15 75% 55%) 100%)'
          }}>
            <Bot className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
          </div>
          <div className="space-y-2 sm:space-y-3">
            <h3 className="text-xl sm:text-2xl font-bold" style={{
              background: 'linear-gradient(135deg, hsl(22 60% 18%) 0%, hsl(15 70% 48%) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              Ready to chat
            </h3>
            <p className="text-xs sm:text-sm leading-relaxed font-medium px-2 sm:px-0" style={{
              color: 'hsl(20 50% 35%)'
            }}>
              Start a conversation by typing your message below. Try asking questions,
              requesting summaries, or exploring creative ideas.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 justify-center px-2 sm:px-0">
            <div className="px-4 py-2 rounded-full text-xs font-semibold shadow-sm" style={{
              background: 'linear-gradient(135deg, hsl(36 100% 93%) 0%, hsl(24 100% 95%) 100%)',
              color: 'hsl(15 70% 48%)',
              border: '1px solid hsl(35 100% 85%)'
            }}>
              💡 Ask anything
            </div>
            <div className="px-4 py-2 rounded-full text-xs font-semibold shadow-sm" style={{
              background: 'linear-gradient(135deg, hsl(36 100% 93%) 0%, hsl(24 100% 95%) 100%)',
              color: 'hsl(15 70% 48%)',
              border: '1px solid hsl(35 100% 85%)'
            }}>
              📝 Get summaries
            </div>
            <div className="px-4 py-2 rounded-full text-xs font-semibold shadow-sm" style={{
              background: 'linear-gradient(135deg, hsl(36 100% 93%) 0%, hsl(24 100% 95%) 100%)',
              color: 'hsl(15 70% 48%)',
              border: '1px solid hsl(35 100% 85%)'
            }}>
              🎨 Be creative
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4" style={{
      background: 'linear-gradient(135deg, hsl(30 67% 97%) 0%, hsl(24 100% 97%) 100%)'
    }}>
      {messages.map((message) => (
        <div
          key={message.id}
          className={cn(
            "flex gap-2 sm:gap-3",
            message.role === "user" ? "justify-end" : "justify-start"
          )}
        >
          {message.role === "assistant" && (
            <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 shadow-md" style={{
              background: 'linear-gradient(135deg, hsl(32 98% 56%) 0%, hsl(15 75% 55%) 100%)'
            }}>
              <Bot className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
          )}

          <div
            className={cn(
              "rounded-xl sm:rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 max-w-[85%] sm:max-w-[75%] lg:max-w-[70%] shadow-sm",
              message.role === "user"
                ? ""
                : ""
            )}
            style={message.role === "user" ? {
              background: 'linear-gradient(135deg, hsl(15 75% 55%) 0%, hsl(15 70% 48%) 100%)',
              color: 'white'
            } : {
              background: 'linear-gradient(135deg, hsl(0 0% 100%) 0%, hsl(30 54% 94%) 100%)',
              border: '1px solid hsl(30 45% 88%)',
              color: 'hsl(20 50% 35%)'
            }}
          >
            <MarkdownContent content={message.content} className="markdown-content text-sm sm:text-base" />
            {message.timestamp && (
              <p className="text-[10px] sm:text-xs opacity-70 mt-1 sm:mt-1.5 font-medium">
                {new Date(message.timestamp).toLocaleTimeString()}
              </p>
            )}
          </div>

          {message.role === "user" && (
            <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 shadow-md" style={{
              background: 'linear-gradient(135deg, hsl(30 54% 94%) 0%, hsl(30 45% 88%) 100%)',
              border: '1px solid hsl(30 45% 88%)'
            }}>
              <User className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: 'hsl(15 70% 48%)' }} />
            </div>
          )}
        </div>
      ))}

      {isLoading && (
        <div className="flex gap-3 justify-start">
          <div className="h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md" style={{
            background: 'linear-gradient(135deg, hsl(32 98% 56%) 0%, hsl(15 75% 55%) 100%)'
          }}>
            <Bot className="h-5 w-5 text-white" />
          </div>
          <div className="rounded-2xl px-4 py-3 shadow-sm" style={{
            background: 'linear-gradient(135deg, hsl(0 0% 100%) 0%, hsl(30 54% 94%) 100%)',
            border: '1px solid hsl(30 45% 88%)'
          }}>
            <div className="flex gap-1">
              <div className="h-2 w-2 rounded-full animate-bounce" style={{
                background: 'hsl(15 75% 55%)',
                animationDelay: "0ms"
              }} />
              <div className="h-2 w-2 rounded-full animate-bounce" style={{
                background: 'hsl(15 75% 55%)',
                animationDelay: "150ms"
              }} />
              <div className="h-2 w-2 rounded-full animate-bounce" style={{
                background: 'hsl(15 75% 55%)',
                animationDelay: "300ms"
              }} />
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  )
}
