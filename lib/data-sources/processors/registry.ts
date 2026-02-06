import type { DocumentProcessor, FileType } from "../types"
import { TextProcessor } from "./text-processor"
import { PDFProcessor } from "./pdf-processor"
import { DOCXProcessor } from "./docx-processor"

/**
 * Document Processor Registry
 * Extensible registry for document processors
 */
class ProcessorRegistry {
  private processors: Map<FileType, DocumentProcessor> = new Map()

  constructor() {
    // Register default processors
    this.registerProcessor(new TextProcessor())
    this.registerProcessor(new PDFProcessor())
    this.registerProcessor(new DOCXProcessor())
  }

  /**
   * Register a new processor
   */
  registerProcessor(processor: DocumentProcessor): void {
    const types = processor.getSupportedTypes()
    for (const type of types) {
      this.processors.set(type, processor)
    }
  }

  /**
   * Get processor for file type
   */
  getProcessor(fileType: FileType): DocumentProcessor | undefined {
    return this.processors.get(fileType)
  }

  /**
   * Check if file type is supported
   */
  isSupported(fileType: FileType): boolean {
    return this.processors.has(fileType)
  }

  /**
   * Get all supported file types
   */
  getSupportedTypes(): FileType[] {
    return Array.from(this.processors.keys())
  }
}

export const processorRegistry = new ProcessorRegistry()

/**
 * Extract text from a file
 */
export async function extractText(filePath: string, fileType: FileType): Promise<string> {
  const processor = processorRegistry.getProcessor(fileType)

  if (!processor) {
    throw new Error(`Unsupported file type: ${fileType}`)
  }

  return await processor.extractText(filePath)
}
