import OpenAI from "openai"
import type { EmbeddingProvider } from "../types"

/**
 * OpenAI Embeddings Provider
 * Generates embeddings using OpenAI's embedding models
 */
export class OpenAIEmbeddings implements EmbeddingProvider {
  private client: OpenAI
  private model: string
  private dimensions: number

  constructor(apiKey: string, model: string = "text-embedding-3-small") {
    this.client = new OpenAI({ apiKey })
    this.model = model
    // text-embedding-3-small has 1536 dimensions
    // text-embedding-3-large has 3072 dimensions
    this.dimensions = model.includes("large") ? 3072 : 1536
  }

  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.client.embeddings.create({
        model: this.model,
        input: text,
      })

      return response.data[0].embedding
    } catch (error) {
      console.error("Error generating embedding:", error)
      throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  async batchGenerateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      // OpenAI allows up to 2048 inputs per request
      const batchSize = 100
      const embeddings: number[][] = []

      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize)
        const response = await this.client.embeddings.create({
          model: this.model,
          input: batch,
        })

        embeddings.push(...response.data.map(d => d.embedding))
      }

      return embeddings
    } catch (error) {
      console.error("Error generating batch embeddings:", error)
      throw new Error(`Failed to generate batch embeddings: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  getDimensions(): number {
    return this.dimensions
  }

  getModelName(): string {
    return this.model
  }
}
