import { Prisma, PrismaClient } from '@prisma/client'
import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import 'dotenv/config'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log('Starting seed...')

  // Seed Providers
  const providers = [
    {
      name: 'openai',
      displayName: 'OpenAI',
      type: 'openai',
      baseUrl: 'https://api.openai.com/v1',
    },
    {
      name: 'anthropic',
      displayName: 'Anthropic',
      type: 'anthropic',
      baseUrl: 'https://api.anthropic.com',
    },
    {
      name: 'openrouter',
      displayName: 'OpenRouter',
      type: 'openrouter',
      baseUrl: 'https://openrouter.ai/api/v1',
    },
    {
      name: 'google',
      displayName: 'Google',
      type: 'google',
      baseUrl: 'https://generativelanguage.googleapis.com/v1',
    },
    {
      name: 'xai',
      displayName: 'xAI',
      type: 'xai',
      baseUrl: 'https://api.x.ai/v1',
    },
    {
      name: 'ollama',
      displayName: 'Ollama',
      type: 'ollama',
      baseUrl: 'http://localhost:11434',
    },
  ]

  console.log('Seeding providers...')
  for (const provider of providers) {
    await prisma.provider.upsert({
      where: { name: provider.name },
      update: provider,
      create: provider,
    })
  }

  // Get provider IDs
  const openai = await prisma.provider.findUnique({ where: { name: 'openai' } })
  const anthropic = await prisma.provider.findUnique({ where: { name: 'anthropic' } })
  const google = await prisma.provider.findUnique({ where: { name: 'google' } })
  const xai = await prisma.provider.findUnique({ where: { name: 'xai' } })

  // Seed Models
  const models = [
    // OpenAI Models
    {
      providerId: openai!.id,
      modelKey: 'gpt-4-turbo',
      displayName: 'GPT-4 Turbo',
      contextWindow: 128000,
      maxOutputTokens: 4096,
      inputPricePerM: 10.0,
      outputPricePerM: 30.0,
      capabilities: ['text', 'vision', 'function_calling'],
    },
    {
      providerId: openai!.id,
      modelKey: 'gpt-4o',
      displayName: 'GPT-4o',
      contextWindow: 128000,
      maxOutputTokens: 4096,
      inputPricePerM: 5.0,
      outputPricePerM: 15.0,
      capabilities: ['text', 'vision', 'function_calling'],
    },
    {
      providerId: openai!.id,
      modelKey: 'gpt-4o-mini',
      displayName: 'GPT-4o Mini',
      contextWindow: 128000,
      maxOutputTokens: 16384,
      inputPricePerM: 0.15,
      outputPricePerM: 0.6,
      capabilities: ['text', 'vision', 'function_calling'],
    },
    {
      providerId: openai!.id,
      modelKey: 'gpt-3.5-turbo',
      displayName: 'GPT-3.5 Turbo',
      contextWindow: 16385,
      maxOutputTokens: 4096,
      inputPricePerM: 0.5,
      outputPricePerM: 1.5,
      capabilities: ['text', 'function_calling'],
    },
    // Anthropic Models
    {
      providerId: anthropic!.id,
      modelKey: 'claude-opus-4-20250514',
      displayName: 'Claude Opus 4.5',
      contextWindow: 200000,
      maxOutputTokens: 4096,
      inputPricePerM: 15.0,
      outputPricePerM: 75.0,
      capabilities: ['text', 'vision', 'function_calling'],
    },
    {
      providerId: anthropic!.id,
      modelKey: 'claude-sonnet-4-20250514',
      displayName: 'Claude Sonnet 4.5',
      contextWindow: 200000,
      maxOutputTokens: 8192,
      inputPricePerM: 3.0,
      outputPricePerM: 15.0,
      capabilities: ['text', 'vision', 'function_calling'],
    },
    {
      providerId: anthropic!.id,
      modelKey: 'claude-3-5-haiku-20241022',
      displayName: 'Claude 3.5 Haiku',
      contextWindow: 200000,
      maxOutputTokens: 8192,
      inputPricePerM: 1.0,
      outputPricePerM: 5.0,
      capabilities: ['text', 'vision', 'function_calling'],
    },
    // Google Models
    {
      providerId: google!.id,
      modelKey: 'gemini-2.0-flash-exp',
      displayName: 'Gemini 2.0 Flash',
      contextWindow: 1000000,
      maxOutputTokens: 8192,
      inputPricePerM: 0.0,
      outputPricePerM: 0.0,
      capabilities: ['text', 'vision', 'function_calling'],
    },
    {
      providerId: google!.id,
      modelKey: 'gemini-1.5-pro',
      displayName: 'Gemini 1.5 Pro',
      contextWindow: 2000000,
      maxOutputTokens: 8192,
      inputPricePerM: 1.25,
      outputPricePerM: 5.0,
      capabilities: ['text', 'vision', 'function_calling'],
    },
    // xAI Models
    {
      providerId: xai!.id,
      modelKey: 'grok-2-latest',
      displayName: 'Grok 2',
      contextWindow: 128000,
      maxOutputTokens: 4096,
      inputPricePerM: 2.0,
      outputPricePerM: 10.0,
      capabilities: ['text', 'function_calling'],
    },
  ]

  console.log('Seeding models...')
  for (const model of models) {
    await prisma.model.upsert({
      where: {
        providerId_modelKey: {
          providerId: model.providerId,
          modelKey: model.modelKey,
        },
      },
      update: model,
      create: model,
    })
  }

  // Seed Built-in Tools
  const tools = [
    {
      name: 'web_search',
      displayName: 'Web Search',
      description: 'Search the web for current information',
      category: 'search',
      type: 'built-in',
      config: Prisma.JsonNull,
      schema: {
        type: 'function',
        function: {
          name: 'web_search',
          description: 'Search the web for current information',
          parameters: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'The search query',
              },
            },
            required: ['query'],
          },
        },
      },
    },
    {
      name: 'calculator',
      displayName: 'Calculator',
      description: 'Perform mathematical calculations',
      category: 'math',
      type: 'built-in',
      config: Prisma.JsonNull,
      schema: {
        type: 'function',
        function: {
          name: 'calculator',
          description: 'Evaluate a mathematical expression',
          parameters: {
            type: 'object',
            properties: {
              expression: {
                type: 'string',
                description: 'The mathematical expression to evaluate (e.g., "2 + 2", "sqrt(16)")',
              },
            },
            required: ['expression'],
          },
        },
      },
    },
    {
      name: 'get_current_datetime',
      displayName: 'Current Date & Time',
      description: 'Get the current date and time',
      category: 'datetime',
      type: 'built-in',
      config: Prisma.JsonNull,
      schema: {
        type: 'function',
        function: {
          name: 'get_current_datetime',
          description: 'Get the current date and time',
          parameters: {
            type: 'object',
            properties: {
              timezone: {
                type: 'string',
                description: 'The timezone (e.g., "America/New_York", "UTC")',
              },
            },
          },
        },
      },
    },
  ]

  console.log('Seeding built-in tools...')
  for (const tool of tools) {
    await prisma.builtInTool.upsert({
      where: { name: tool.name },
      update: tool,
      create: tool,
    })
  }

  console.log('Seed completed!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
