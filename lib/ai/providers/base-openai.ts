import type OpenAI from "openai"
import type {
  AIProvider,
  ChatCompletionOptions,
  ChatCompletionResponse,
  StreamChunk,
  JsonObject
} from "../types"

/**
 * Base OpenAI Provider - works for OpenAI, OpenRouter, xAI
 */
export class BaseOpenAIProvider implements AIProvider {
  constructor(
    private client: OpenAI,
    private providerType: string = "openai"
  ) {}

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

  async chatCompletion(options: ChatCompletionOptions): Promise<ChatCompletionResponse> {
    const response = await this.client.chat.completions.create({
      model: options.model,
      messages: this.toOpenAIMessages(options.messages),
      temperature: options.temperature,
      max_tokens: options.maxTokens,
      top_p: options.topP,
      tools: options.tools,
      tool_choice: options.toolChoice,
    })

    const message = response.choices[0]?.message

    return {
      content: message?.content || "",
      toolCalls: message?.tool_calls?.flatMap((tc) => {
        if (tc.type !== "function") {
          return []
        }

        return [
          {
            id: tc.id,
            name: tc.function.name,
            arguments: this.tryParseJson(tc.function.arguments) || {},
          },
        ]
      }),
      usage: {
        inputTokens: response.usage?.prompt_tokens || 0,
        outputTokens: response.usage?.completion_tokens || 0,
      },
      finishReason: response.choices[0]?.finish_reason,
    }
  }

  async chatCompletionStream(options: ChatCompletionOptions): Promise<AsyncIterable<StreamChunk>> {
    const stream = await this.client.chat.completions.create({
      model: options.model,
      messages: this.toOpenAIMessages(options.messages),
      temperature: options.temperature,
      max_tokens: options.maxTokens,
      top_p: options.topP,
      tools: options.tools,
      tool_choice: options.toolChoice,
      stream: true,
    })

    return this.transformStream(stream)
  }

  private async *transformStream(
    stream: AsyncIterable<OpenAI.ChatCompletionChunk>
  ): AsyncIterable<StreamChunk> {
    const toolCallBuffers = new Map<number, { id?: string; name?: string; argsText: string }>()
    const emittedToolCalls = new Set<number>()

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta
      const finishReason = chunk.choices[0]?.finish_reason

      if (delta?.content) {
        yield {
          content: delta.content,
          done: false,
        }
      }

      if (delta?.tool_calls) {
        for (const toolCall of delta.tool_calls) {
          if (!toolCall.function) {
            continue
          }
          console.log("Received tool call delta:", toolCall)
          const index = typeof toolCall.index === "number" ? toolCall.index : 0
          const buffer = toolCallBuffers.get(index) || { argsText: "" }

          if (toolCall.id) {
            buffer.id = toolCall.id
          }
          if (toolCall.function.name) {
            buffer.name = toolCall.function.name
          }
          if (typeof toolCall.function.arguments === "string") {
            buffer.argsText += toolCall.function.arguments
          }

          toolCallBuffers.set(index, buffer)

          const parsedArgs = this.tryParseJson(buffer.argsText)
          if (parsedArgs && !emittedToolCalls.has(index)) {
            emittedToolCalls.add(index)
            console.log("Emitting tool call from delta:", buffer)
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
      }

      if (finishReason === "tool_calls") {
        console.log("Stream finished with tool_calls, emitting any remaining buffered tool calls")
        for (const [index, buffer] of toolCallBuffers.entries()) {
          if (emittedToolCalls.has(index)) {
            continue
          }

          const parsedArgs = this.tryParseJson(buffer.argsText)
          if (parsedArgs) {
            emittedToolCalls.add(index)
            console.log("Emitting buffered tool call on finish:", buffer)
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
      }

      if (finishReason) {
        yield {
          done: true,
        }
      }
    }
  }

  private toOpenAIMessages(
    messages: ChatCompletionOptions["messages"]
  ): OpenAI.ChatCompletionMessageParam[] {
    return messages.map((message) => {
      if (message.role === "tool") {
        return {
          role: "tool",
          content: message.content,
          tool_call_id: message.tool_call_id || "",
        }
      }

      if (message.role === "assistant" && message.toolCalls?.length) {
        return {
          role: "assistant",
          content: message.content,
          tool_calls: message.toolCalls.map((toolCall, index) => {
            const id = toolCall.id || `tool_call_${index}`
            return {
              id,
              type: "function",
              function: {
                name: toolCall.name,
                arguments: JSON.stringify(toolCall.arguments || {}),
              },
            }
          }),
        }
      }

      return {
        role: message.role,
        content: message.content,
      } as OpenAI.ChatCompletionMessageParam
    })
  }

  supportsTools(): boolean {
    return true
  }

  getProviderType(): string {
    return this.providerType
  }
}
