/**
 * Unified AI Provider Types
 */

export interface Message {
  role: "system" | "user" | "assistant" | "tool"
  content: string
  name?: string
  tool_call_id?: string
  toolCalls?: ToolCall[]
}

export type JsonPrimitive = string | number | boolean | null
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[]
export type JsonObject = { [key: string]: JsonValue }

export interface ToolCall {
  id?: string // Tool call ID (used by Anthropic)
  name: string
  arguments: JsonObject
}

export interface ToolSchema {
  type: "function"
  function: {
    name: string
    description?: string
    parameters?: JsonObject
  }
}

export type ToolChoice =
  | "auto"
  | "none"
  | {
      type: "function"
      function: {
        name: string
      }
    }

export interface ChatCompletionOptions {
  model: string
  messages: Message[]
  temperature?: number
  maxTokens?: number
  topP?: number
  tools?: ToolSchema[]
  toolChoice?: ToolChoice
}

export interface ChatCompletionResponse {
  content: string
  toolCalls?: ToolCall[]
  usage: {
    inputTokens: number
    outputTokens: number
  }
  finishReason?: string
}

export interface StreamChunk {
  content?: string
  toolCall?: {
    id?: string
    name?: string
    arguments?: JsonObject
  }
  done: boolean
}

/**
 * Unified AI Provider Interface
 */
export interface AIProvider {
  /**
   * Execute a chat completion (non-streaming)
   */
  chatCompletion(options: ChatCompletionOptions): Promise<ChatCompletionResponse>

  /**
   * Execute a chat completion with streaming
   */
  chatCompletionStream(options: ChatCompletionOptions): Promise<AsyncIterable<StreamChunk>>

  /**
   * Check if the provider supports tools/function calling
   */
  supportsTools(): boolean

  /**
   * Get the provider type identifier
   */
  getProviderType(): string
}
