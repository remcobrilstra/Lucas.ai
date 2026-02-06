import type { ChunkingStrategy, ChunkingStrategyInterface } from "../types"
import { FixedSizeChunking } from "./fixed-size"
import { SentenceChunking } from "./sentence"
import { RecursiveChunking } from "./recursive"

/**
 * Chunking Strategy Registry
 * Extensible registry for chunking strategies
 */
class ChunkingRegistry {
  private strategies: Map<ChunkingStrategy, ChunkingStrategyInterface> = new Map()

  constructor() {
    // Register default strategies
    this.strategies.set("fixed-size", new FixedSizeChunking())
    this.strategies.set("sentence", new SentenceChunking())
    this.strategies.set("recursive", new RecursiveChunking())
  }

  /**
   * Register a new chunking strategy
   */
  registerStrategy(name: ChunkingStrategy, strategy: ChunkingStrategyInterface): void {
    this.strategies.set(name, strategy)
  }

  /**
   * Get chunking strategy
   */
  getStrategy(name: ChunkingStrategy): ChunkingStrategyInterface | undefined {
    return this.strategies.get(name)
  }

  /**
   * Get all available strategies
   */
  getAvailableStrategies(): ChunkingStrategy[] {
    return Array.from(this.strategies.keys())
  }
}

export const chunkingRegistry = new ChunkingRegistry()

/**
 * Chunk text using specified strategy
 */
export function chunkText(
  text: string,
  strategy: ChunkingStrategy,
  options: { chunkSize: number; chunkOverlap: number }
): string[] {
  const chunker = chunkingRegistry.getStrategy(strategy)

  if (!chunker) {
    throw new Error(`Unknown chunking strategy: ${strategy}`)
  }

  return chunker.chunk(text, options)
}
