import type { ChunkingStrategyInterface } from "../types"

/**
 * Fixed Size Chunking Strategy
 * Splits text into fixed-size chunks with optional overlap
 */
export class FixedSizeChunking implements ChunkingStrategyInterface {
  chunk(
    text: string,
    options: { chunkSize: number; chunkOverlap: number }
  ): string[] {
    const { chunkSize, chunkOverlap } = options
    const chunks: string[] = []

    if (text.length === 0) {
      return chunks
    }

    let start = 0
    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length)
      const chunk = text.slice(start, end).trim()

      if (chunk.length > 0) {
        chunks.push(chunk)
      }

      // Move start position forward
      start += chunkSize - chunkOverlap

      // Prevent infinite loop
      if (start <= end - chunkSize + chunkOverlap) {
        start = end
      }
    }

    return chunks
  }
}
