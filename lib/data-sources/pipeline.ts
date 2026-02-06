import { prisma } from "@/lib/db/prisma"
import type { ProcessingOptions, ProcessingResult } from "./types"
import { extractText } from "./processors/registry"
import { chunkText } from "./chunking/registry"
import { batchGenerateEmbeddings } from "./embeddings/registry"

/**
 * Data Source Processing Pipeline
 * Orchestrates document processing, chunking, and embedding
 */
export class DataSourcePipeline {
  /**
   * Process a data source end-to-end
   */
  async process(
    dataSourceId: string,
    filePath: string,
    fileType: string,
    options: ProcessingOptions,
    organizationId?: string
  ): Promise<ProcessingResult> {
    try {
      // Update status to processing
      await prisma.dataSource.update({
        where: { id: dataSourceId },
        data: { status: "processing" },
      })

      // Step 1: Extract text from document
      console.log(`[${dataSourceId}] Extracting text...`)
      const text = await extractText(filePath, fileType as any)

      if (!text || text.trim().length === 0) {
        throw new Error("No text extracted from document")
      }

      // Step 2: Chunk text
      console.log(`[${dataSourceId}] Chunking text...`)
      const chunks = chunkText(text, options.chunkingStrategy, {
        chunkSize: options.chunkSize,
        chunkOverlap: options.chunkOverlap,
      })

      console.log(`[${dataSourceId}] Created ${chunks.length} chunks`)

      // Step 3: Generate embeddings
      console.log(`[${dataSourceId}] Generating embeddings...`)
      const embeddings = await batchGenerateEmbeddings(
        chunks,
        options.embeddingModel,
        organizationId
      )

      // Step 4: Store chunks in database
      console.log(`[${dataSourceId}] Storing chunks...`)
      await this.storeChunks(dataSourceId, chunks, embeddings)

      // Step 5: Update data source status
      await prisma.dataSource.update({
        where: { id: dataSourceId },
        data: {
          status: "indexed",
          totalChunks: chunks.length,
          errorMessage: null,
        },
      })

      console.log(`[${dataSourceId}] Processing complete!`)

      return {
        success: true,
        totalChunks: chunks.length,
      }
    } catch (error) {
      console.error(`[${dataSourceId}] Processing failed:`, error)

      // Update status to failed
      await prisma.dataSource.update({
        where: { id: dataSourceId },
        data: {
          status: "failed",
          errorMessage: error instanceof Error ? error.message : "Unknown error",
        },
      })

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  /**
   * Store chunks in database
   */
  private async storeChunks(
    dataSourceId: string,
    chunks: string[],
    embeddings: number[][]
  ): Promise<void> {
    // Delete existing chunks
    await prisma.chunk.deleteMany({
      where: { dataSourceId },
    })

    // Insert new chunks in batches
    const batchSize = 100
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize)
      const batchEmbeddings = embeddings.slice(i, i + batchSize)

      await Promise.all(
        batch.map(async (content, index) => {
          const embedding = batchEmbeddings[index]

          await prisma.$executeRaw`
            INSERT INTO "chunks" ("id", "dataSourceId", "content", "embedding", "position", "createdAt")
            VALUES (
              gen_random_uuid(),
              ${dataSourceId}::text,
              ${content}::text,
              ${JSON.stringify(embedding)}::vector,
              ${i + index}::integer,
              NOW()
            )
          `
        })
      )
    }
  }

  /**
   * Re-process a data source
   */
  async reprocess(dataSourceId: string): Promise<ProcessingResult> {
    const dataSource = await prisma.dataSource.findUnique({
      where: { id: dataSourceId },
    })

    if (!dataSource) {
      return {
        success: false,
        error: "Data source not found",
      }
    }

    if (!dataSource.filePath) {
      return {
        success: false,
        error: "No file path associated with data source",
      }
    }

    return await this.process(
      dataSourceId,
      dataSource.filePath,
      dataSource.fileType || "txt",
      {
        chunkingStrategy: dataSource.chunkingStrategy as any,
        chunkSize: dataSource.chunkSize,
        chunkOverlap: dataSource.chunkOverlap,
        indexingStrategy: dataSource.indexingStrategy as any,
        embeddingModel: dataSource.embeddingModel,
      },
      dataSource.organizationId
    )
  }
}

export const dataSourcePipeline = new DataSourcePipeline()
