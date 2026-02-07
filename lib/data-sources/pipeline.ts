import { prisma } from "@/lib/db/prisma"
import type { ProcessingOptions, ProcessingResult } from "./types"
import { extractText } from "./processors/registry"
import { chunkText } from "./chunking/registry"
import { batchGenerateEmbeddings } from "./embeddings/registry"
import { WebsiteCrawler } from "./crawlers/website-crawler"

/**
 * Data Source Processing Pipeline
 * Orchestrates document processing, chunking, and embedding
 */
export class DataSourcePipeline {
  /**
   * Process an entire DataSource (all documents)
   */
  async processDataSource(dataSourceId: string): Promise<ProcessingResult> {
    try {
      const dataSource = await prisma.dataSource.findUnique({
        where: { id: dataSourceId },
        include: { documents: true },
      })

      if (!dataSource) {
        return {
          success: false,
          error: "Data source not found",
        }
      }

      // Update status to processing
      await prisma.dataSource.update({
        where: { id: dataSourceId },
        data: { status: "processing" },
      })

      // Route to appropriate processing method based on type
      if (dataSource.type === "website") {
        return await this.processWebsite(dataSourceId)
      } else {
        // Process all documents for files type
        let totalChunks = 0
        let successCount = 0
        let failCount = 0

        for (const document of dataSource.documents) {
          if (!document.filePath) {
            continue
          }

          const result = await this.processDocument(
            document.id,
            document.filePath,
            document.fileType || "txt",
            this.getProcessingOptions(dataSource, document),
            dataSource.organizationId
          )

          if (result.success) {
            successCount++
            totalChunks += result.totalChunks || 0
          } else {
            failCount++
          }
        }

        // Update data source status
        const finalStatus = failCount === 0 ? "indexed" : successCount > 0 ? "indexed" : "failed"
        await prisma.dataSource.update({
          where: { id: dataSourceId },
          data: {
            status: finalStatus,
            totalChunks,
            errorMessage: failCount > 0 ? `${failCount} document(s) failed to process` : null,
          },
        })

        return {
          success: failCount === 0,
          totalChunks,
          totalDocuments: successCount,
          error: failCount > 0 ? `${failCount} document(s) failed` : undefined,
        }
      }
    } catch (error) {
      console.error(`[${dataSourceId}] Processing failed:`, error)

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
   * Process a website-type DataSource
   */
  async processWebsite(dataSourceId: string): Promise<ProcessingResult> {
    try {
      const dataSource = await prisma.dataSource.findUnique({
        where: { id: dataSourceId },
      })

      if (!dataSource || !dataSource.websiteUrl) {
        throw new Error("Invalid website data source")
      }

      await prisma.dataSource.update({
        where: { id: dataSourceId },
        data: { status: "processing", errorMessage: null },
      })

      // Create crawl job
      const crawlJob = await prisma.crawlJob.create({
        data: {
          dataSourceId,
          status: "running",
          startedAt: new Date(),
        },
      })

      // Crawl website
      const crawler = new WebsiteCrawler({
        maxPages: dataSource.maxPages,
        maxDepth: dataSource.crawlDepth,
      })

      const crawlResults = await crawler.crawl(dataSource.websiteUrl)

      // Delete existing documents for this data source
      await prisma.document.deleteMany({
        where: { dataSourceId },
      })

      // Process each crawled page
      let totalChunks = 0
      let successCount = 0
      let failCount = 0

      for (const page of crawlResults) {
        try {
          // Create document record
          const document = await prisma.document.create({
            data: {
              dataSourceId,
              name: page.title,
              type: "webpage",
              pageUrl: page.url,
              pageTitle: page.title,
              crawlDepth: page.depth,
              status: "processing",
            },
          })

          // Process the page content
          const result = await this.processDocument(
            document.id,
            null,
            "md",
            this.getProcessingOptions(dataSource, document),
            dataSource.organizationId,
            page.content
          )

          if (result.success) {
            successCount++
            totalChunks += result.totalChunks || 0
          } else {
            failCount++
          }
        } catch (error) {
          console.error(`Failed to process page ${page.url}:`, error)
          failCount++
        }
      }

      // Update crawl job
      await prisma.crawlJob.update({
        where: { id: crawlJob.id },
        data: {
          status: "completed",
          completedAt: new Date(),
          pagesDiscovered: crawlResults.length,
          pagesProcessed: successCount,
          pagesFailed: failCount,
        },
      })

      // Update data source
      await prisma.dataSource.update({
        where: { id: dataSourceId },
        data: {
          status: "indexed",
          totalChunks,
          lastCrawledAt: new Date(),
          errorMessage: failCount > 0 ? `${failCount} page(s) failed` : null,
        },
      })

      return {
        success: true,
        totalChunks,
        totalDocuments: successCount,
      }
    } catch (error) {
      console.error(`[${dataSourceId}] Website processing failed:`, error)

      const errorMessage = error instanceof Error ? error.message : "Unknown error"

      await prisma.crawlJob.updateMany({
        where: {
          dataSourceId,
          status: {
            in: ["pending", "running"],
          },
        },
        data: {
          status: "failed",
          completedAt: new Date(),
          errorMessage,
        },
      })

      await prisma.dataSource.update({
        where: { id: dataSourceId },
        data: {
          status: "failed",
          errorMessage,
        },
      })

      return {
        success: false,
        error: errorMessage,
      }
    }
  }

  /**
   * Process a single document (renamed from process)
   */
  async processDocument(
    documentId: string,
    filePath: string | null,
    fileType: string,
    options: ProcessingOptions,
    organizationId?: string,
    contentOverride?: string
  ): Promise<ProcessingResult> {
    try {
      // Update document status to processing
      await prisma.document.update({
        where: { id: documentId },
        data: { status: "processing" },
      })

      // Step 1: Extract text from document or use content override
      console.log(`[${documentId}] Extracting text...`)
      let text: string
      if (contentOverride) {
        text = contentOverride
      } else if (filePath) {
        text = await extractText(filePath, fileType as "pdf" | "docx" | "txt" | "md")
      } else {
        throw new Error("No file path or content provided")
      }

      if (!text || text.trim().length === 0) {
        throw new Error("No text extracted from document")
      }

      // Get document to find dataSourceId
      const document = await prisma.document.findUnique({
        where: { id: documentId },
      })

      if (!document) {
        throw new Error("Document not found")
      }

      // Step 2: Chunk text
      console.log(`[${documentId}] Chunking text...`)
      const chunks = chunkText(text, options.chunkingStrategy, {
        chunkSize: options.chunkSize,
        chunkOverlap: options.chunkOverlap,
      })

      console.log(`[${documentId}] Created ${chunks.length} chunks`)

      // Step 3: Generate embeddings
      console.log(`[${documentId}] Generating embeddings...`)
      const embeddings = await batchGenerateEmbeddings(
        chunks,
        options.embeddingModel,
        organizationId
      )

      // Step 4: Store chunks in database
      console.log(`[${documentId}] Storing chunks...`)
      await this.storeChunks(document.dataSourceId, documentId, chunks, embeddings)

      // Step 5: Update document status
      await prisma.document.update({
        where: { id: documentId },
        data: {
          status: "indexed",
          totalChunks: chunks.length,
          errorMessage: null,
          processedAt: new Date(),
        },
      })

      console.log(`[${documentId}] Processing complete!`)

      return {
        success: true,
        totalChunks: chunks.length,
      }
    } catch (error) {
      console.error(`[${documentId}] Processing failed:`, error)

      // Update document status to failed
      await prisma.document.update({
        where: { id: documentId },
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
   * Get processing options with hierarchy (document overrides DataSource)
   */
  private getProcessingOptions(
    dataSource: { chunkingStrategy: string; chunkSize: number; chunkOverlap: number; indexingStrategy: string; embeddingModel: string },
    document: { chunkingStrategy?: string | null; chunkSize?: number | null; chunkOverlap?: number | null; embeddingModel?: string | null }
  ): ProcessingOptions {
    return {
      chunkingStrategy: (document.chunkingStrategy || dataSource.chunkingStrategy) as "fixed-size" | "sentence" | "recursive" | "semantic",
      chunkSize: document.chunkSize || dataSource.chunkSize,
      chunkOverlap: document.chunkOverlap || dataSource.chunkOverlap,
      indexingStrategy: dataSource.indexingStrategy as "vector" | "bm25" | "hybrid",
      embeddingModel: document.embeddingModel || dataSource.embeddingModel,
    }
  }

  /**
   * Store chunks in database
   */
  private async storeChunks(
    dataSourceId: string,
    documentId: string,
    chunks: string[],
    embeddings: number[][]
  ): Promise<void> {
    // Delete existing chunks for this document
    await prisma.chunk.deleteMany({
      where: { documentId },
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
            INSERT INTO "chunks" ("id", "dataSourceId", "documentId", "content", "embedding", "position", "createdAt")
            VALUES (
              gen_random_uuid(),
              ${dataSourceId}::text,
              ${documentId}::text,
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
    return await this.processDataSource(dataSourceId)
  }

  /**
   * Legacy method for backwards compatibility
   * @deprecated Use processDocument instead
   */
  async process(
    dataSourceId: string,
    filePath: string,
    fileType: string,
    options: ProcessingOptions,
    organizationId?: string
  ): Promise<ProcessingResult> {
    // For backwards compatibility, find or create a document
    const dataSource = await prisma.dataSource.findUnique({
      where: { id: dataSourceId },
      include: { documents: true },
    })

    if (!dataSource) {
      return {
        success: false,
        error: "Data source not found",
      }
    }

    // Find existing document or create one
    let document = dataSource.documents[0]
    if (!document) {
      document = await prisma.document.create({
        data: {
          dataSourceId,
          name: dataSource.name,
          type: "file",
          fileType,
          filePath,
          status: "pending",
        },
      })
    }

    return await this.processDocument(
      document.id,
      filePath,
      fileType,
      options,
      organizationId
    )
  }
}

export const dataSourcePipeline = new DataSourcePipeline()
