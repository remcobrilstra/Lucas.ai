import type { ToolExecutor, MCPRemoteConfig } from "../types"
import type { JsonObject } from "@/lib/ai/types"
import { callRemoteTool } from "../mcp-remote-client"

/**
 * Executor for remote MCP servers
 * Connects to a remote MCP server via HTTP/WebSocket
 */
export class MCPRemoteExecutor implements ToolExecutor {
  constructor(
    private toolName: string,
    private config: MCPRemoteConfig
  ) {}

  async execute(params: JsonObject): Promise<unknown> {
    try {
      return await callRemoteTool(this.config, this.toolName, params)
    } catch (error) {
      throw new Error(
        `Failed to execute MCP remote tool: ${error instanceof Error ? error.message : "Unknown error"}`
      )
    }
  }
}
