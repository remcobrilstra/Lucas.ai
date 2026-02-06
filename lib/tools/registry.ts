import type { ToolExecutor, ToolType, MCPLocalConfig, MCPRemoteConfig, DataSourceConfig } from "./types"
import type { JsonObject, ToolSchema } from "@/lib/ai/types"
import { BuiltInToolExecutor } from "./executors/built-in-executor"
import { MCPLocalExecutor } from "./executors/mcp-local-executor"
import { MCPRemoteExecutor } from "./executors/mcp-remote-executor"
import { DataSourceExecutor } from "./executors/data-source-executor"

export interface Tool {
  name: string
  displayName: string
  description: string
  type: ToolType
  schema: ToolSchema
  config?: Record<string, unknown>
  execute: (params: JsonObject) => Promise<unknown> | unknown
}

/**
 * Built-in tool definitions
 * These match the database seeded tools
 */
export const BUILT_IN_TOOLS: Record<string, Tool> = {
  calculator: {
    name: "calculator",
    displayName: "Calculator",
    description: "Perform mathematical calculations",
    type: "built-in",
    schema: {
      type: "function",
      function: {
        name: "calculator",
        description: "Evaluate a mathematical expression. Supports: +, -, *, /, ^, sqrt, sin, cos, tan, log, ln, abs, ceil, floor, round, pi, e",
        parameters: {
          type: "object",
          properties: {
            expression: {
              type: "string",
              description: 'The mathematical expression to evaluate (e.g., "2 + 2", "sqrt(16)", "sin(pi/2)")',
            },
          },
          required: ["expression"],
        },
      },
    },
    execute: async (params: JsonObject) => {
      const executor = new BuiltInToolExecutor("calculator")
      return await executor.execute(params)
    },
  },

  get_current_datetime: {
    name: "get_current_datetime",
    displayName: "Current Date & Time",
    description: "Get the current date and time",
    type: "built-in",
    schema: {
      type: "function",
      function: {
        name: "get_current_datetime",
        description: "Get the current date and time, optionally in a specific timezone",
        parameters: {
          type: "object",
          properties: {
            timezone: {
              type: "string",
              description: 'The timezone (e.g., "America/New_York", "Europe/London", "UTC")',
            },
          },
        },
      },
    },
    execute: async (params: JsonObject) => {
      const executor = new BuiltInToolExecutor("get_current_datetime")
      return await executor.execute(params)
    },
  },

  web_search: {
    name: "web_search",
    displayName: "Web Search",
    description: "Search the web for current information",
    type: "built-in",
    schema: {
      type: "function",
      function: {
        name: "web_search",
        description: "Search the web and return relevant results",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The search query",
            },
          },
          required: ["query"],
        },
      },
    },
    execute: async (params: JsonObject) => {
      const executor = new BuiltInToolExecutor("web_search")
      return await executor.execute(params)
    },
  },
}

/**
 * Create a tool executor based on type
 */
function createToolExecutor(
  toolName: string,
  type: ToolType,
  config?: Record<string, unknown>,
  organizationId?: string
): ToolExecutor {
  switch (type) {
    case "built-in":
      return new BuiltInToolExecutor(toolName)

    case "mcp-local":
      if (!config) {
        throw new Error(`MCP local tool ${toolName} requires config`)
      }
      return new MCPLocalExecutor(toolName, config as unknown as MCPLocalConfig)

    case "mcp-remote":
      if (!config) {
        throw new Error(`MCP remote tool ${toolName} requires config`)
      }
      return new MCPRemoteExecutor(toolName, config as unknown as MCPRemoteConfig)

    case "data-source":
      if (!config) {
        throw new Error(`Data source tool ${toolName} requires config`)
      }
      if (!organizationId) {
        throw new Error(`Data source tool ${toolName} requires organizationId`)
      }
      return new DataSourceExecutor(toolName, config as unknown as DataSourceConfig, organizationId)

    default:
      throw new Error(`Unknown tool type: ${type}`)
  }
}

/**
 * Execute a tool by name and type
 */
export async function executeTool(
  toolName: string,
  parameters: JsonObject,
  type: ToolType = "built-in",
  config?: Record<string, unknown>,
  organizationId?: string
): Promise<unknown> {
  // Check if it's a built-in tool
  if (type === "built-in" && BUILT_IN_TOOLS[toolName]) {
    const tool = BUILT_IN_TOOLS[toolName]
    try {
      return await tool.execute(parameters)
    } catch (error) {
      console.error(`Error executing built-in tool ${toolName}:`, error)
      throw error
    }
  }

  // For other tool types, create an executor
  try {
    const executor = createToolExecutor(toolName, type, config, organizationId)
    return await executor.execute(parameters)
  } catch (error) {
    console.error(`Error executing tool ${toolName} (${type}):`, error)
    throw error
  }
}

/**
 * Get all built-in tools as OpenAI function definitions
 */
export function getToolSchemas() {
  return Object.values(BUILT_IN_TOOLS).map((tool) => tool.schema)
}

/**
 * Get a specific tool definition
 */
export function getTool(toolName: string): Tool | undefined {
  return BUILT_IN_TOOLS[toolName]
}
