/**
 * Data Sources Type Definitions
 */

export type DataSourceType = "file" | "web" | "api" | "text"
export type DataSourceStatus = "pending" | "processing" | "indexed" | "failed"
export type FileType = "pdf" | "docx" | "txt" | "md" | "csv" | "json"

export type ChunkingStrategy = "fixed-size" | "sentence" | "recursive" | "semantic"
export type IndexingStrategy = "vector" | "bm25" | "hybrid"

export interface DataSource {
  id: string
  organizationId: string
  name: string
  description?: string
  type: DataSourceType
  fileType?: FileType
  filePath?: string
  fileSize?: number
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

export interface Chunk {
  id: string
  dataSourceId: string
  content: string
  embedding?: number[]
  metadata?: Record<string, any>
  position: number
  createdAt: Date
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
  error?: string
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
