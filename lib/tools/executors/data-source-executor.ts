import type { ToolExecutor, DataSourceConfig } from "../types"
import type { JsonObject } from "@/lib/ai/types"
import { vectorSearch } from "@/lib/data-sources/retrieval"

/**
 * Executor for data source virtual tools
 * Performs vector search on attached data sources
 */
export class DataSourceExecutor implements ToolExecutor {
  constructor(
    private toolName: string,
    private config: DataSourceConfig,
    private organizationId: string
  ) {}

  async execute(params: JsonObject): Promise<unknown> {
    const query = params.query as string

    if (!query || typeof query !== "string") {
      throw new Error("Query parameter is required and must be a string")
    }

    try {
      // Perform vector search
      const chunks = await vectorSearch(query, {
        dataSourceIds: [this.config.dataSourceId],
        topK: this.config.topK || 5,
        threshold: this.config.similarityThreshold || 0.7,
        embeddingModel: "text-embedding-3-small",
        organizationId: this.organizationId,
      })

      // Format results for the LLM
      if (chunks.length === 0) {
        return {
          success: true,
          message: "No relevant information found in the knowledge base.",
          results: [],
        }
      }

      const results = chunks.map((chunk, index) => ({
        position: index + 1,
        similarity: chunk.similarity,
        content: chunk.content,
        metadata: chunk.metadata,
      }))

      // Create a formatted response
      const formattedResults = chunks
        .map(
          (chunk, index) =>
            `[Result ${index + 1}, relevance: ${(chunk.similarity * 100).toFixed(0)}%]\n${chunk.content}`
        )
        .join("\n\n---\n\n")

      return {
        success: true,
        message: `Found ${chunks.length} relevant result${chunks.length !== 1 ? "s" : ""} in the knowledge base.`,
        content: formattedResults,
        results,
      }
    } catch (error) {
      console.error("Error executing data source search:", error)
      throw new Error(
        `Failed to search knowledge base: ${error instanceof Error ? error.message : "Unknown error"}`
      )
    }
  }
}
