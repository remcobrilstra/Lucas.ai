import type { ToolExecutor, MCPLocalConfig } from "../types"
import type { JsonObject } from "@/lib/ai/types"

/**
 * Executor for local MCP servers
 * Starts a local MCP server process and communicates via stdio
 */
export class MCPLocalExecutor implements ToolExecutor {
  constructor(
    private toolName: string,
    private config: MCPLocalConfig
  ) {}

  async execute(_params: JsonObject): Promise<unknown> {
    void _params
    // TODO: Implement MCP local execution
    // 1. Start the MCP server process if not already running
    // 2. Send the tool call request via stdio
    // 3. Parse and return the response

    throw new Error("MCP local execution not yet implemented")
  }

  /**
   * Start the MCP server process
   */
  private async startServer(): Promise<void> {
    // TODO: Implement server startup using child_process
  }

  /**
   * Stop the MCP server process
   */
  async stop(): Promise<void> {
    // TODO: Implement server cleanup
  }
}
