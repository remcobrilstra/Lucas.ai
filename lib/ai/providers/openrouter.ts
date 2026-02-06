import OpenAI from "openai"

export function createOpenRouterClient(apiKey: string) {
  return new OpenAI({
    apiKey,
    baseURL: "https://openrouter.ai/api/v1",
  })
}

export type OpenRouterClient = ReturnType<typeof createOpenRouterClient>
