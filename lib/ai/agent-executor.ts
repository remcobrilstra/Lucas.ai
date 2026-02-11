import { prisma } from "@/lib/db/prisma"
import { getAIProviderForModel } from "./provider-factory"
import { calculateCost } from "@/lib/utils/cost-calculator"
import { executeTool } from "@/lib/tools/registry"
import { listRemoteTools } from "@/lib/tools/mcp-remote-client"
import type { MCPRemoteConfig, ToolType } from "@/lib/tools/types"
import type { Message, ToolCall, ToolSchema } from "./types"

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

interface ToolMetadataEntry {
  type: ToolType
  config?: Record<string, unknown>
}

const normalizeConfig = (value: unknown): Record<string, unknown> | undefined => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined
  }
  return value as Record<string, unknown>
}

const sanitizeToolNameSegment = (value: string): string => {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/_{2,}/g, "_")
    .replace(/^[_-]+|[_-]+$/g, "")

  return normalized
}

const buildToolContext = async (
  tools: {
    builtInTool: {
      name: string
      type: string
      config: unknown
      schema: unknown
    } | null
    config: unknown
  }[],
  dataSources: {
    dataSourceId: string
    topK: number
    similarityThreshold: number
    dataSource: {
      id: string
      name: string
      description: string | null
    }
  }[],
  supportsTools: boolean
): Promise<{ toolSchemas?: ToolSchema[]; toolMetadata: Map<string, ToolMetadataEntry> }> => {
  const toolMetadata = new Map<string, ToolMetadataEntry>()

  if (!supportsTools) {
    return { toolSchemas: undefined, toolMetadata }
  }

  const toolSchemas: ToolSchema[] = []
  const registerTool = (schema: ToolSchema, metadata: ToolMetadataEntry) => {
    if (toolMetadata.has(schema.function.name)) {
      return
    }
    toolSchemas.push(schema)
    toolMetadata.set(schema.function.name, metadata)
  }

  for (const tool of tools) {
    if (!tool.builtInTool) continue

    const type = tool.builtInTool.type as ToolType
    const config = normalizeConfig(tool.config || tool.builtInTool.config)

    if (type === "mcp-remote") {
      if (!config?.endpoint || typeof config.endpoint !== "string") {
        continue
      }
      console.log(`Registering MCP remote tool: ${tool.builtInTool.name} with endpoint ${config.endpoint}`)
      const remoteTools = await listRemoteTools(config as MCPRemoteConfig)
      remoteTools.forEach((remoteTool) => {
        const parameters =
          remoteTool.inputSchema || remoteTool.parameters || { type: "object", properties: {} }
        registerTool(
          {
          type: "function",
          function: {
            name: remoteTool.name,
            description: remoteTool.description,
            parameters,
          },
          },
          { type, config }
        )
      })

      continue
    }

    const schema = tool.builtInTool.schema as ToolSchema
    if (schema?.function?.name) {
      registerTool(schema, { type, config })
    } else if (tool.builtInTool.name) {
      toolMetadata.set(tool.builtInTool.name, { type, config })
    }
  }

  // Register data sources as virtual tools
  for (const ds of dataSources) {
    const baseName = sanitizeToolNameSegment(ds.dataSource.name)
    const idSuffix = sanitizeToolNameSegment(ds.dataSourceId) || "data_source"
    const toolName = baseName ? `search_${baseName}_${idSuffix}` : `search_${idSuffix}`
    const description = ds.dataSource.description
      ? `Search the "${ds.dataSource.name}" knowledge base. ${ds.dataSource.description}`
      : `Search the "${ds.dataSource.name}" knowledge base for relevant information.`

    registerTool(
      {
        type: "function",
        function: {
          name: toolName,
          description,
          parameters: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "The search query to find relevant information in the knowledge base",
              },
            },
            required: ["query"],
          },
        },
      },
      {
        type: "data-source" as ToolType,
        config: {
          dataSourceId: ds.dataSourceId,
          topK: ds.topK,
          similarityThreshold: ds.similarityThreshold,
        }
      }
    )
  }

  return {
    toolSchemas: toolSchemas.length > 0 ? toolSchemas : undefined,
    toolMetadata,
  }
}

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
        dataSources: {
          include: {
            dataSource: true,
          },
        },
      },
    })

    if (!agent) {
      throw new Error("Agent not found")
    }

    // Get AI provider
    const aiProvider = await getAIProviderForModel(agent.modelId, organizationId)

    const { toolSchemas, toolMetadata } = await buildToolContext(
      agent.tools,
      agent.dataSources || [],
      aiProvider.supportsTools()
    )

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
              normalizeConfig(metadata?.config),
              organizationId
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
      console.log("Tool results:", toolResults)
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
      dataSources: {
        include: {
          dataSource: true,
        },
      },
    },
  })

  if (!agent) {
    throw new Error("Agent not found")
  }

  // Get AI provider
  const aiProvider = await getAIProviderForModel(agent.modelId, organizationId)
  console.log("Using AI provider:", aiProvider.constructor.name, "for model:", agent.model.modelKey)
  const { toolSchemas, toolMetadata } = await buildToolContext(
    agent.tools,
    agent.dataSources || [],
    aiProvider.supportsTools()
  )
 console.log("Tool schemas for agent:", toolSchemas)
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
      console.log("Agent made tool calls:", toolCalls)
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
              normalizeConfig(metadata?.config),
              organizationId
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
      console.log("Tool results:", toolResults)
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
