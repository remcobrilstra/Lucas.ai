import type { ChunkingStrategyInterface } from "../types"

/**
 * Sentence Chunking Strategy
 * Splits text by sentences and groups them into chunks
 */
export class SentenceChunking implements ChunkingStrategyInterface {
  /**
   * Split text into sentences
   */
  private splitSentences(text: string): string[] {
    // Simple sentence splitting regex
    // Splits on . ! ? followed by whitespace or end of string
    const sentencePattern = /[^.!?]+[.!?]+(?=\s|$)/g
    const sentences = text.match(sentencePattern) || []

    return sentences.map(s => s.trim()).filter(s => s.length > 0)
  }

  chunk(
    text: string,
    options: { chunkSize: number; chunkOverlap: number }
  ): string[] {
    const { chunkSize } = options
    const sentences = this.splitSentences(text)
    const chunks: string[] = []

    let currentChunk = ""

    for (const sentence of sentences) {
      // If adding this sentence would exceed chunk size, start new chunk
      if (currentChunk.length + sentence.length > chunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim())
        currentChunk = ""
      }

      currentChunk += (currentChunk ? " " : "") + sentence
    }

    // Add remaining text
    if (currentChunk.trim().length > 0) {
      chunks.push(currentChunk.trim())
    }

    return chunks
  }
}
