/**
 * Data Sources Type Definitions
 */

export type DataSourceType = "files" | "website"
export type DocumentType = "file" | "webpage"
export type DataSourceStatus = "pending" | "processing" | "indexed" | "failed"
export type FileType = "pdf" | "docx" | "txt" | "md" | "csv" | "json"
export type CrawlFrequency = "hourly" | "daily" | "weekly" | "monthly" | null

export type ChunkingStrategy = "fixed-size" | "sentence" | "recursive" | "semantic"
export type IndexingStrategy = "vector" | "bm25" | "hybrid"

export interface DataSource {
  id: string
  organizationId: string
  name: string
  description?: string
  type: DataSourceType

  // Legacy single-file fields (for backwards compatibility)
  fileType?: FileType
  filePath?: string
  fileUrl?: string
  fileSize?: number

  // Website-specific fields
  websiteUrl?: string
  crawlDepth: number
  crawlFrequency?: CrawlFrequency
  lastCrawledAt?: Date
  maxPages: number

  status: DataSourceStatus
  chunkingStrategy: ChunkingStrategy
  chunkSize: number
  chunkOverlap: number
  indexingStrategy: IndexingStrategy
  embeddingModel: string
  totalChunks: number
  errorMessage?: string
  createdAt: Date
  updatedAt: Date
}

export interface Document {
  id: string
  dataSourceId: string
  name: string
  type: DocumentType

  // File-specific fields
  fileType?: FileType
  filePath?: string
  fileUrl?: string
  fileSize?: number

  // Webpage-specific fields
  pageUrl?: string
  pageTitle?: string
  crawlDepth: number

  // Status
  status: DataSourceStatus
  errorMessage?: string
  totalChunks: number

  // Override settings (null = use DataSource defaults)
  chunkingStrategy?: ChunkingStrategy
  chunkSize?: number
  chunkOverlap?: number
  embeddingModel?: string

  metadata?: MetadataRecord
  createdAt: Date
  updatedAt: Date
  processedAt?: Date
}

export interface Chunk {
  id: string
  dataSourceId: string
  documentId?: string
  content: string
  embedding?: number[]
  metadata?: MetadataRecord
  position: number
  createdAt: Date
}

export interface CrawlJob {
  id: string
  dataSourceId: string
  status: string
  startedAt?: Date
  completedAt?: Date
  errorMessage?: string
  pagesDiscovered: number
  pagesProcessed: number
  pagesFailed: number
  createdAt: Date
  updatedAt: Date
}

export interface ProcessingOptions {
  chunkingStrategy: ChunkingStrategy
  chunkSize: number
  chunkOverlap: number
  indexingStrategy: IndexingStrategy
  embeddingModel: string
}

export interface ProcessingResult {
  success: boolean
  totalChunks?: number
  totalDocuments?: number
  error?: string
}

export interface WebsiteConfig {
  url: string
  crawlDepth: number
  maxPages: number
  crawlFrequency?: CrawlFrequency
}

export interface CrawlResult {
  url: string
  title: string
  content: string
  depth: number
  links: string[]
}

/**
 * Document Processor Interface
 */
export interface DocumentProcessor {
  extractText(filePath: string): Promise<string>
  getSupportedTypes(): FileType[]
}

/**
 * Chunking Strategy Interface
 */
export interface ChunkingStrategyInterface {
  chunk(text: string, options: { chunkSize: number; chunkOverlap: number }): string[]
}

/**
 * Embedding Provider Interface
 */
export interface EmbeddingProvider {
  generateEmbedding(text: string): Promise<number[]>
  batchGenerateEmbeddings(texts: string[]): Promise<number[][]>
  getDimensions(): number
  getModelName(): string
}

/**
 * Generic record type for metadata
 */
export type MetadataRecord = Record<string, string | number | boolean | null | undefined>
