import { prisma } from "@/lib/db/prisma"
import { getAIProviderForModel } from "./provider-factory"
import { calculateCost } from "@/lib/utils/cost-calculator"
import { BUILT_IN_TOOLS, executeTool } from "@/lib/tools/registry"
import type { Message, ToolCall } from "./types"

interface ExecuteAgentParams {
  agentId: string
  message: string
  organizationId: string
  conversationHistory?: Message[]
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

const MAX_TOOL_ROUNDS = 6

/**
 * Execute an agent with a user message (non-streaming)
 */
export async function executeAgent({
  agentId,
  message,
  organizationId,
  conversationHistory = [],
}: ExecuteAgentParams): Promise<ExecuteAgentResult> {
  const startTime = Date.now()

  try {
    // Load agent configuration
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      include: {
        model: {
          include: {
            provider: true,
          },
        },
        tools: {
          include: {
            builtInTool: true,
          },
        },
      },
    })

    if (!agent) {
      throw new Error("Agent not found")
    }

    // Get AI provider
    const aiProvider = await getAIProviderForModel(agent.modelId, organizationId)

    // Build tools array from agent's enabled tools
    const tools = agent.tools
      .filter((tool) => tool.builtInTool)
      .map((tool) => BUILT_IN_TOOLS[tool.builtInTool!.name])
      .filter(Boolean)

    // Create tool metadata map for execution (includes type and config)
    const toolMetadata = new Map(
      agent.tools
        .filter((tool) => tool.builtInTool)
        .map((tool) => [
          tool.builtInTool!.name,
          {
            type: tool.builtInTool!.type as "built-in" | "mcp-local" | "mcp-remote" | "custom",
            config: tool.config || tool.builtInTool!.config,
          },
        ])
    )

    const normalizeConfig = (value: unknown): Record<string, unknown> | undefined => {
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        return undefined
      }
      return value as Record<string, unknown>
    }

    const toolSchemas = tools.length > 0 && aiProvider.supportsTools()
      ? tools.map((tool) => tool.schema)
      : undefined

    // Build messages array
    const messages: Message[] = [
      {
        role: "system",
        content: agent.systemPrompt,
      },
      ...conversationHistory,
      {
        role: "user",
        content: message,
      },
    ]

    const totalUsage = { inputTokens: 0, outputTokens: 0 }
    const allToolCalls: ToolCall[] = []
    let lastResponse: string = ""

    for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
      const response = await aiProvider.chatCompletion({
        model: agent.model.modelKey,
        messages,
        temperature: agent.temperature,
        maxTokens: agent.maxTokens || undefined,
        topP: agent.topP || undefined,
        tools: toolSchemas,
        toolChoice: toolSchemas ? "auto" : undefined,
      })

      totalUsage.inputTokens += response.usage.inputTokens
      totalUsage.outputTokens += response.usage.outputTokens
      lastResponse = response.content

      if (!aiProvider.supportsTools() || !response.toolCalls?.length) {
        break
      }

      console.log("Agent made tool calls:", response.toolCalls)
      allToolCalls.push(...response.toolCalls)

      const toolResults = await Promise.all(
        response.toolCalls.map(async (toolCall, index) => {
          const toolCallId = toolCall.id || toolCall.name || `tool_call_${index}`
          try {
            const metadata = toolMetadata.get(toolCall.name)
            const result = await executeTool(
              toolCall.name,
              toolCall.arguments,
              metadata?.type || "built-in",
              normalizeConfig(metadata?.config)
            )
            return {
              role: "tool" as const,
              content: JSON.stringify(result),
              name: toolCall.name,
              tool_call_id: toolCallId,
            }
          } catch (error) {
            return {
              role: "tool" as const,
              content: JSON.stringify({ error: (error as Error).message }),
              name: toolCall.name,
              tool_call_id: toolCallId,
            }
          }
        })
      )

      messages.push({
        role: "assistant",
        content: response.content || "Using tools...",
        toolCalls: response.toolCalls.map((toolCall, index) => ({
          ...toolCall,
          id: toolCall.id || toolCall.name || `tool_call_${index}`,
        })),
      })
      messages.push(...toolResults)
    }

    const responseTime = Date.now() - startTime
    const cost = calculateCost(totalUsage.inputTokens, totalUsage.outputTokens, agent.model)

    return {
      response: lastResponse,
      usage: totalUsage,
      cost,
      responseTime,
      toolCalls: allToolCalls.length > 0 ? allToolCalls : undefined,
    }
  } catch (error) {
    console.error("Error executing agent:", error)
    throw error
  }
}

/**
 * Execute an agent with streaming
 */
export async function executeAgentStream({
  agentId,
  message,
  organizationId,
  conversationHistory = [],
}: ExecuteAgentParams) {
  // Load agent configuration
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    include: {
      model: {
        include: {
          provider: true,
        },
      },
      tools: {
        include: {
          builtInTool: true,
        },
      },
    },
  })

  if (!agent) {
    throw new Error("Agent not found")
  }

  // Get AI provider
  const aiProvider = await getAIProviderForModel(agent.modelId, organizationId)

  // Build tools array
  const tools = agent.tools
    .filter((tool) => tool.builtInTool)
    .map((tool) => BUILT_IN_TOOLS[tool.builtInTool!.name])
    .filter(Boolean)

  const toolSchemas = tools.length > 0 && aiProvider.supportsTools()
    ? tools.map((tool) => tool.schema)
    : undefined

  const toolMetadata = new Map(
    agent.tools
      .filter((tool) => tool.builtInTool)
      .map((tool) => [
        tool.builtInTool!.name,
        {
          type: tool.builtInTool!.type as "built-in" | "mcp-local" | "mcp-remote" | "custom",
          config: tool.config || tool.builtInTool!.config,
        },
      ])
  )

  const normalizeConfig = (value: unknown): Record<string, unknown> | undefined => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return undefined
    }
    return value as Record<string, unknown>
  }

  // Build messages
  const messages: Message[] = [
    {
      role: "system",
      content: agent.systemPrompt,
    },
    ...conversationHistory,
    {
      role: "user",
      content: message,
    },
  ]

  const runStream = async function* () {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
      const stream = await aiProvider.chatCompletionStream({
        model: agent.model.modelKey,
        messages,
        temperature: agent.temperature,
        maxTokens: agent.maxTokens || undefined,
        topP: agent.topP || undefined,
        tools: toolSchemas,
        toolChoice: toolSchemas ? "auto" : undefined,
      })

      const toolCallMap = new Map<string, ToolCall>()
      let roundContent = ""

      for await (const chunk of stream) {
        if (chunk.content) {
          roundContent += chunk.content
          yield chunk
        }

        if (chunk.toolCall?.name) {
          const key = chunk.toolCall.id || chunk.toolCall.name
          const existing = toolCallMap.get(key)
          toolCallMap.set(key, {
            id: chunk.toolCall.id || key,
            name: chunk.toolCall.name,
            arguments: chunk.toolCall.arguments || existing?.arguments || {},
          })
        }

        if (chunk.done) {
          break
        }
      }

      const toolCalls = Array.from(toolCallMap.values())

      if (!aiProvider.supportsTools() || toolCalls.length === 0) {
        yield { done: true }
        return
      }

      const toolResults = await Promise.all(
        toolCalls.map(async (toolCall, index) => {
          const toolCallId = toolCall.id || toolCall.name || `tool_call_${index}`
          try {
            const metadata = toolMetadata.get(toolCall.name)
            const result = await executeTool(
              toolCall.name,
              toolCall.arguments,
              metadata?.type || "built-in",
              normalizeConfig(metadata?.config)
            )
            return {
              role: "tool" as const,
              content: JSON.stringify(result),
              name: toolCall.name,
              tool_call_id: toolCallId,
            }
          } catch (error) {
            return {
              role: "tool" as const,
              content: JSON.stringify({ error: (error as Error).message }),
              name: toolCall.name,
              tool_call_id: toolCallId,
            }
          }
        })
      )

      messages.push({
        role: "assistant",
        content: roundContent || "Using tools...",
        toolCalls: toolCalls.map((toolCall, index) => ({
          ...toolCall,
          id: toolCall.id || toolCall.name || `tool_call_${index}`,
        })),
      })
      messages.push(...toolResults)
    }

    yield { done: true }
  }

  return runStream()
}
