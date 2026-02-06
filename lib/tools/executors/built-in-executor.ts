import type { ToolExecutor } from "../types"
import type { JsonObject } from "@/lib/ai/types"
import { calculator } from "../built-in/calculator"
import { getCurrentDateTime } from "../built-in/datetime"
import { webSearch } from "../built-in/web-search"

/**
 * Executor for built-in tools
 */
export class BuiltInToolExecutor implements ToolExecutor {
  constructor(private toolName: string) {}

  async execute(params: JsonObject): Promise<unknown> {
    switch (this.toolName) {
      case "calculator":
        if (typeof params.expression !== "string") {
          throw new Error("Calculator tool requires an expression string")
        }
        return { result: calculator(params.expression) }

      case "get_current_datetime":
        return {
          datetime: getCurrentDateTime(
            typeof params.timezone === "string" ? params.timezone : undefined
          ),
        }

      case "web_search":
        if (typeof params.query !== "string") {
          throw new Error("Web search tool requires a query string")
        }
        return await webSearch(params.query)

      default:
        throw new Error(`Unknown built-in tool: ${this.toolName}`)
    }
  }
}
