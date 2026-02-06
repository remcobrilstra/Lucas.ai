import type { EmbeddingProvider } from "../types"
import { prisma } from "@/lib/db/prisma"
import { decrypt } from "@/lib/utils/crypto"
import { OpenAIEmbeddings } from "./openai-embeddings"

/**
 * Embedding Provider Registry
 * Manages different embedding providers
 */
class EmbeddingRegistry {
  private providers: Map<string, (apiKey: string) => EmbeddingProvider> = new Map()

  constructor() {
    // Register OpenAI providers
    this.registerProvider("text-embedding-3-small", (apiKey) => {
      return new OpenAIEmbeddings(apiKey, "text-embedding-3-small")
    })

    this.registerProvider("text-embedding-3-large", (apiKey) => {
      return new OpenAIEmbeddings(apiKey, "text-embedding-3-large")
    })
  }

  /**
   * Register a new embedding provider
   */
  registerProvider(name: string, factory: (apiKey: string) => EmbeddingProvider): void {
    this.providers.set(name, factory)
  }

  /**
   * Get embedding provider
   */
  getProvider(name: string, apiKey: string): EmbeddingProvider {
    const factory = this.providers.get(name)

    if (!factory) {
      throw new Error(`Unknown embedding provider: ${name}`)
    }

    return factory(apiKey)
  }

  /**
   * Get available providers
   */
  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys())
  }
}

export const embeddingRegistry = new EmbeddingRegistry()

let cachedOpenAIProviderId: string | null = null

async function resolveOpenAIApiKey(organizationId?: string): Promise<string> {
  if (organizationId) {
    if (!cachedOpenAIProviderId) {
      const provider = await prisma.provider.findUnique({ where: { name: "openai" } })
      if (!provider) {
        throw new Error("OpenAI provider not found")
      }
      cachedOpenAIProviderId = provider.id
    }

    const orgProvider = await prisma.organizationProvider.findUnique({
      where: {
        organizationId_providerId: {
          organizationId,
          providerId: cachedOpenAIProviderId,
        },
      },
    })

    if (!orgProvider || !orgProvider.isActive) {
      throw new Error("OpenAI provider is not configured for this organization")
    }

    const decryptedKey = decrypt(orgProvider.apiKey)
    if (!decryptedKey) {
      throw new Error("OpenAI provider API key could not be decrypted")
    }

    return decryptedKey
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY not configured")
  }

  return apiKey
}

/**
 * Generate embedding for text
 */
export async function generateEmbedding(
  text: string,
  model: string,
  organizationId?: string
): Promise<number[]> {
  const apiKey = await resolveOpenAIApiKey(organizationId)
  const provider = embeddingRegistry.getProvider(model, apiKey)
  return await provider.generateEmbedding(text)
}

/**
 * Generate embeddings for multiple texts
 */
export async function batchGenerateEmbeddings(
  texts: string[],
  model: string,
  organizationId?: string
): Promise<number[][]> {
  const apiKey = await resolveOpenAIApiKey(organizationId)
  const provider = embeddingRegistry.getProvider(model, apiKey)
  return await provider.batchGenerateEmbeddings(texts)
}
