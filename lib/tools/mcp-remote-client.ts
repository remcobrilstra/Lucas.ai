import type { MCPRemoteConfig } from "./types"
import type { JsonObject, JsonValue } from "@/lib/ai/types"

interface JsonRpcError {
  code: number
  message: string
  data?: JsonValue
}

interface JsonRpcResponse {
  jsonrpc: "2.0"
  id: string
  result?: JsonValue
  error?: JsonRpcError
}

export interface MCPRemoteToolDefinition {
  name: string
  description?: string
  inputSchema?: JsonObject
  parameters?: JsonObject
}

const buildHeaders = (config: MCPRemoteConfig): Record<string, string> => {
  return {
    "Content-Type": "application/json",
    ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
    ...(config.headers || {}),
  }
}

const parseEventStreamResponse = (text: string): JsonRpcResponse => {
  const blocks = text.split(/\n\n+/)
  let lastPayload: JsonRpcResponse | null = null

  for (const block of blocks) {
    const lines = block.split(/\n/)
    const dataLines: string[] = []

    for (const line of lines) {
      if (line.startsWith("data:")) {
        dataLines.push(line.slice(5).trim())
      }
    }

    if (dataLines.length === 0) continue

    const data = dataLines.join("\n")
    if (!data || data === "[DONE]") {
      continue
    }

    try {
      const parsed = JSON.parse(data) as JsonRpcResponse
      if (parsed && parsed.jsonrpc === "2.0") {
        lastPayload = parsed
      }
    } catch {
      // Ignore non-JSON data lines.
    }
  }

  if (!lastPayload) {
    throw new Error("MCP event stream did not include a JSON-RPC payload")
  }

  return lastPayload
}

const jsonRpcRequest = async (
  config: MCPRemoteConfig,
  method: string,
  params?: JsonObject
): Promise<JsonValue> => {
  const response = await fetch(config.endpoint, {
    method: "POST",
    headers: buildHeaders(config),
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: `${method}-${Date.now()}`,
      method,
      params,
    }),
  })

  if (!response.ok) {
    throw new Error(`MCP server returned ${response.status}: ${response.statusText}`)
  }

  const contentType = response.headers.get("content-type")?.toLowerCase() || ""
  let payload: JsonRpcResponse

  if (contentType.includes("text/event-stream")) {
    const text = await response.text()
    payload = parseEventStreamResponse(text)
  } else {
    const text = await response.text()
    try {
      payload = JSON.parse(text) as JsonRpcResponse
    } catch (error) {
      throw new Error(
        `Failed to parse MCP response as JSON: ${error instanceof Error ? error.message : "Unknown error"}`
      )
    }
  }

  if (payload.error) {
    throw new Error(`MCP error ${payload.error.code}: ${payload.error.message}`)
  }

  if (payload.result === undefined) {
    throw new Error("MCP response missing result")
  }

  return payload.result
}

export const listRemoteTools = async (
  config: MCPRemoteConfig
): Promise<MCPRemoteToolDefinition[]> => {
  const result = await jsonRpcRequest(config, "tools/list", {})
  console.log("Received tool list from MCP server:", result)
  const tools = Array.isArray((result as { tools?: unknown }).tools)
    ? (result as { tools: unknown[] }).tools
    : Array.isArray(result)
      ? (result as unknown[])
      : []

  return tools
    .map((tool) => tool as MCPRemoteToolDefinition)
    .filter((tool) => typeof tool.name === "string" && tool.name.length > 0)
}

export const callRemoteTool = async (
  config: MCPRemoteConfig,
  toolName: string,
  args: JsonObject
): Promise<JsonValue> => {
  const result = await jsonRpcRequest(config, "tools/call", {
    name: toolName,
    arguments: args,
  })

  return result
}
