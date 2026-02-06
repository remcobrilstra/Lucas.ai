import type Anthropic from "@anthropic-ai/sdk"
import type {
  AIProvider,
  ChatCompletionOptions,
  ChatCompletionResponse,
  StreamChunk,
  JsonObject
} from "../types"

type AnthropicStreamEvent = {
  type: string
  delta?: {
    type?: string
    text?: string
    partial_json?: string
  }
  content_block?: {
    type?: string
    id?: string
    name?: string
  }
}

type AnthropicTool = Anthropic.Messages.Tool

/**
 * Anthropic Provider (Claude)
 */
export class AnthropicProvider implements AIProvider {
  constructor(private client: Anthropic) {}

  private tryParseJson(value: string): JsonObject | undefined {
    if (!value) {
      return undefined
    }

    try {
      const parsed = JSON.parse(value) as unknown
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as JsonObject
      }
      return undefined
    } catch {
      return undefined
    }
  }

  private coerceJsonObject(value: unknown): JsonObject {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value as JsonObject
    }
    return {}
  }

  async chatCompletion(options: ChatCompletionOptions): Promise<ChatCompletionResponse> {
    // Separate system message from conversation
    const systemMessage = options.messages.find(m => m.role === "system")
    const conversationMessages = options.messages.filter(m => m.role !== "system")

    // Transform OpenAI tool format to Anthropic tool format
    const anthropicTools = options.tools?.map((tool): AnthropicTool => ({
      name: tool.function.name,
      description: tool.function.description,
      input_schema: (tool.function.parameters ?? { type: "object", properties: {} }) as
        AnthropicTool["input_schema"],
    }))

    // Transform messages to Anthropic format
    const anthropicMessages = conversationMessages.map(m => {
      // Handle tool result messages
      if (m.role === "tool") {
        return {
          role: "user" as const,
          content: [
            {
              type: "tool_result" as const,
              tool_use_id: m.tool_call_id || "",
              content: m.content,
            },
          ],
        }
      }

      // Regular messages
      return {
        role: m.role === "assistant" ? "assistant" as const : "user" as const,
        content: m.content,
      }
    })

    const response = await this.client.messages.create({
      model: options.model,
      max_tokens: options.maxTokens || 4096,
      temperature: options.temperature,
      system: systemMessage?.content,
      messages: anthropicMessages,
      tools: anthropicTools,
    })

    // Extract text and tool calls
    const textContent = response.content.find(c => c.type === "text")
    const toolUseBlocks = response.content.filter(c => c.type === "tool_use")

    return {
      content: textContent?.type === "text" ? textContent.text : "",
      toolCalls: toolUseBlocks.map(block => ({
        id: block.type === "tool_use" ? block.id : undefined,
        name: block.type === "tool_use" ? block.name : "",
        arguments: block.type === "tool_use" ? this.coerceJsonObject(block.input) : {},
      })),
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
      finishReason: response.stop_reason || undefined,
    }
  }

  async chatCompletionStream(options: ChatCompletionOptions): Promise<AsyncIterable<StreamChunk>> {
    // Separate system message from conversation
    const systemMessage = options.messages.find(m => m.role === "system")
    const conversationMessages = options.messages.filter(m => m.role !== "system")

    // Transform OpenAI tool format to Anthropic tool format
    const anthropicTools = options.tools?.map((tool): AnthropicTool => ({
      name: tool.function.name,
      description: tool.function.description,
      input_schema: (tool.function.parameters ?? { type: "object", properties: {} }) as
        AnthropicTool["input_schema"],
    }))

    const stream = await this.client.messages.stream({
      model: options.model,
      max_tokens: options.maxTokens || 4096,
      temperature: options.temperature,
      system: systemMessage?.content,
      messages: conversationMessages.map(m => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      })),
      tools: anthropicTools,
    })

    return this.transformStream(stream)
  }

  private async *transformStream(
    stream: AsyncIterable<unknown>
  ): AsyncIterable<StreamChunk> {
    const toolCallBuffers = new Map<string, { id: string; name?: string; argsText: string }>()
    const emittedToolCalls = new Set<string>()
    let currentToolUseId: string | null = null

    for await (const raw of stream) {
      const chunk = raw as AnthropicStreamEvent
      // Handle text deltas
      if (chunk.type === "content_block_delta" && chunk.delta?.type === "text_delta") {
        yield {
          content: chunk.delta.text,
          done: false,
        }
      }

      // Handle tool use
      if (chunk.type === "content_block_start" && chunk.content_block?.type === "tool_use") {
        const toolUseId = chunk.content_block.id
        if (!toolUseId) {
          continue
        }

        currentToolUseId = toolUseId
        toolCallBuffers.set(currentToolUseId, {
          id: currentToolUseId,
          name: chunk.content_block.name,
          argsText: "",
        })

        yield {
          toolCall: {
            id: currentToolUseId,
            name: chunk.content_block.name,
            arguments: {},
          },
          done: false,
        }
      }

      // Handle tool input deltas
      if (chunk.type === "content_block_delta" && chunk.delta?.type === "input_json_delta") {
        const activeId = currentToolUseId
        if (!activeId) {
          continue
        }

        const buffer = toolCallBuffers.get(activeId)
        if (!buffer) {
          continue
        }

        if (typeof chunk.delta.partial_json === "string") {
          buffer.argsText += chunk.delta.partial_json
        }

        toolCallBuffers.set(activeId, buffer)

        const parsedArgs = this.tryParseJson(buffer.argsText)
        if (parsedArgs && !emittedToolCalls.has(activeId)) {
          emittedToolCalls.add(activeId)
          yield {
            toolCall: {
              id: buffer.id,
              name: buffer.name,
              arguments: parsedArgs,
            },
            done: false,
          }
        }

        continue
      }

      if (chunk.type === "content_block_stop" && currentToolUseId) {
        const buffer = toolCallBuffers.get(currentToolUseId)
        if (buffer && !emittedToolCalls.has(currentToolUseId)) {
          const parsedArgs = this.tryParseJson(buffer.argsText)
          if (parsedArgs) {
            emittedToolCalls.add(currentToolUseId)
            yield {
              toolCall: {
                id: buffer.id,
                name: buffer.name,
                arguments: parsedArgs,
              },
              done: false,
            }
          }
        }

        currentToolUseId = null
        continue
      }

      if (chunk.type === "message_stop") {
        yield {
          done: true,
        }
      }
    }
  }

  supportsTools(): boolean {
    return true
  }

  getProviderType(): string {
    return "anthropic"
  }
}
