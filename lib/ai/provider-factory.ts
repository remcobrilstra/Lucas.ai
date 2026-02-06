import { prisma } from "@/lib/db/prisma"
import { decrypt } from "@/lib/utils/crypto"
import { createOpenAIClient } from "./providers/openai"
import { createAnthropicClient } from "./providers/anthropic"
import { createOpenRouterClient } from "./providers/openrouter"
import { BaseOpenAIProvider } from "./providers/base-openai"
import { AnthropicProvider } from "./providers/anthropic-provider"
import type { AIProvider } from "./types"

/**
 * Get unified AI provider for a given provider ID
 */
export async function getAIProvider(
  providerId: string,
  organizationId: string
): Promise<AIProvider> {
  // Get provider and organization config
  const [provider, orgProvider] = await Promise.all([
    prisma.provider.findUnique({ where: { id: providerId } }),
    prisma.organizationProvider.findUnique({
      where: {
        organizationId_providerId: {
          organizationId,
          providerId,
        },
      },
    }),
  ])

  if (!provider) {
    throw new Error("Provider not found")
  }

  if (!orgProvider || !orgProvider.isActive) {
    throw new Error(`Provider ${provider.displayName} is not configured`)
  }

  // Decrypt API key
  const apiKey = decrypt(orgProvider.apiKey)

  // Create appropriate provider
  switch (provider.type) {
    case "openai":
      return new BaseOpenAIProvider(createOpenAIClient(apiKey), "openai")

    case "anthropic":
      return new AnthropicProvider(createAnthropicClient(apiKey))

    case "openrouter":
      return new BaseOpenAIProvider(createOpenRouterClient(apiKey), "openrouter")

    case "xai":
      // xAI uses OpenAI-compatible API
      return new BaseOpenAIProvider(createOpenAIClient(apiKey), "xai")

    case "google":
      throw new Error("Google provider not yet implemented")

    case "ollama":
      throw new Error("Ollama provider not yet implemented")

    default:
      throw new Error(`Unknown provider type: ${provider.type}`)
  }
}

/**
 * Get AI provider using model information
 */
export async function getAIProviderForModel(
  modelId: string,
  organizationId: string
): Promise<AIProvider> {
  const model = await prisma.model.findUnique({
    where: { id: modelId },
    include: { provider: true },
  })

  if (!model) {
    throw new Error("Model not found")
  }

  return getAIProvider(model.providerId, organizationId)
}

// Legacy exports for backwards compatibility
export async function getProviderClient(providerId: string, organizationId: string) {
  const provider = await getAIProvider(providerId, organizationId)
  // This is a hack to get the underlying client, but we're deprecating this
  return (provider as unknown as { client: unknown }).client
}

export async function getProviderClientForModel(modelId: string, organizationId: string) {
  const provider = await getAIProviderForModel(modelId, organizationId)
  // This is a hack to get the underlying client, but we're deprecating this
  return (provider as unknown as { client: unknown }).client
}
