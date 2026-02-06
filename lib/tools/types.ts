/**
 * Tool Type Definitions
 */

import type { JsonObject, JsonValue, ToolSchema } from "@/lib/ai/types"

export type ToolType = "built-in" | "mcp-local" | "mcp-remote" | "custom" | "data-source"

export interface BaseTool {
  name: string
  displayName: string
  description: string
  type: ToolType
  schema: ToolSchema // OpenAI function schema
  config?: Record<string, JsonValue>
}

export type BuiltInToolConfig = Record<string, never>

export interface MCPLocalConfig {
  serverPath: string // Path to the MCP server executable
  args?: string[] // Command line arguments
  env?: Record<string, string> // Environment variables
}

export interface MCPRemoteConfig {
  endpoint: string // Remote MCP server endpoint
  apiKey?: string // Optional API key
  headers?: Record<string, string> // Additional headers
}

export interface DataSourceConfig {
  dataSourceId: string // ID of the data source
  topK?: number // Number of chunks to retrieve
  similarityThreshold?: number // Minimum similarity score
}

export interface ToolExecutor {
  execute(params: JsonObject): Promise<unknown>
}

/**
 * Tool execution result
 */
export interface ToolResult {
  success: boolean
  data?: JsonValue
  error?: string
}
