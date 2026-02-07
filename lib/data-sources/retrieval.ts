import { prisma } from "@/lib/db/prisma"
import { generateEmbedding } from "./embeddings/registry"
import type { MetadataRecord } from "./types"

export interface RetrievalOptions {
  dataSourceIds: string[]
  topK?: number
  threshold?: number
  embeddingModel?: string
  organizationId?: string
}

export interface RetrievedChunk {
  id: string
  content: string
  similarity: number
  metadata?: MetadataRecord
  position: number
  dataSourceId: string
}

/**
 * Vector search using pgvector
 */
export async function vectorSearch(
  query: string,
  options: RetrievalOptions
): Promise<RetrievedChunk[]> {
  const {
    dataSourceIds,
    topK = 5,
    threshold = 0.7,
    embeddingModel = "text-embedding-3-small",
    organizationId,
  } = options

  try {
    // Generate query embedding
    const queryEmbedding = await generateEmbedding(query, embeddingModel, organizationId)

    // Perform vector similarity search
    const results = await prisma.$queryRaw<Array<{
      id: string
      content: string
      similarity: number
      metadata: MetadataRecord | null
      position: number
      dataSourceId: string
    }>>`
      SELECT
        c.id,
        c.content,
        c.metadata,
        c.position,
        c."dataSourceId" as "dataSourceId",
        1 - (c.embedding <=> ${JSON.stringify(queryEmbedding)}::vector) as similarity
      FROM "chunks" c
      WHERE c."dataSourceId" = ANY(${dataSourceIds}::text[])
        AND c.embedding IS NOT NULL
        AND 1 - (c.embedding <=> ${JSON.stringify(queryEmbedding)}::vector) > ${threshold}
      ORDER BY c.embedding <=> ${JSON.stringify(queryEmbedding)}::vector
      LIMIT ${topK}
    `

    return results.map((row) => ({
      id: row.id,
      content: row.content,
      similarity: Number(row.similarity),
      metadata: row.metadata || undefined,
      position: row.position,
      dataSourceId: row.dataSourceId,
    }))
  } catch (error) {
    console.error("Vector search error:", error)
    throw new Error(`Vector search failed: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

/**
 * Get context from data sources for a query
 */
export async function getContext(
  query: string,
  options: RetrievalOptions
): Promise<string> {
  const chunks = await vectorSearch(query, options)

  if (chunks.length === 0) {
    return ""
  }

  // Sort by position to maintain document order
  const sortedChunks = chunks.sort((a, b) => a.position - b.position)

  // Join chunks with context
  return sortedChunks
    .map((chunk, index) => {
      const source = `[Source ${index + 1}, similarity: ${chunk.similarity.toFixed(2)}]`
      return `${source}\n${chunk.content}`
    })
    .join("\n\n---\n\n")
}
