import type { ChunkingStrategyInterface } from "../types"

/**
 * Recursive Chunking Strategy
 * Splits text hierarchically: paragraphs -> sentences -> words
 */
export class RecursiveChunking implements ChunkingStrategyInterface {
  private separators = ["\n\n", "\n", ". ", " "]

  /**
   * Recursively split text using different separators
   */
  private recursiveSplit(
    text: string,
    separators: string[],
    chunkSize: number
  ): string[] {
    if (separators.length === 0 || text.length <= chunkSize) {
      return [text]
    }

    const separator = separators[0]
    const parts = text.split(separator)
    const chunks: string[] = []
    let currentChunk = ""

    for (const part of parts) {
      if (part.length > chunkSize) {
        // Part is too large, split it further
        if (currentChunk) {
          chunks.push(currentChunk.trim())
          currentChunk = ""
        }

        const subChunks = this.recursiveSplit(part, separators.slice(1), chunkSize)
        chunks.push(...subChunks)
      } else if (currentChunk.length + separator.length + part.length <= chunkSize) {
        // Add to current chunk
        currentChunk += (currentChunk ? separator : "") + part
      } else {
        // Start new chunk
        if (currentChunk) {
          chunks.push(currentChunk.trim())
        }
        currentChunk = part
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim())
    }

    return chunks.filter(c => c.length > 0)
  }

  chunk(
    text: string,
    options: { chunkSize: number; chunkOverlap: number }
  ): string[] {
    const { chunkSize } = options
    return this.recursiveSplit(text, this.separators, chunkSize)
  }
}
