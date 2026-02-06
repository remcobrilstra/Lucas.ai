import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth/config"
import { prisma } from "@/lib/db/prisma"
import { getAIProviderForModel } from "@/lib/ai/provider-factory"
import { calculateCost } from "@/lib/utils/cost-calculator"
import type { Message } from "@/lib/ai/types"

const playgroundSchema = z.object({
  modelIds: z.array(z.string().min(1)).min(1, "Select at least one model"),
  systemPrompt: z.string().min(1, "System prompt is required"),
  userPrompt: z.string().min(1, "User prompt is required"),
  temperature: z.number().min(0).max(2).optional(),
})

type PlaygroundRequest = z.infer<typeof playgroundSchema>

type PlaygroundResult = {
  modelId: string
  modelDisplayName: string
  providerDisplayName: string
  response?: string
  usage?: {
    inputTokens: number
    outputTokens: number
  }
  cost?: number
  responseTime?: number
  error?: string
}

export async function POST(req: Request) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = (await req.json()) as PlaygroundRequest
    const { modelIds, systemPrompt, userPrompt, temperature } = playgroundSchema.parse(body)

    const orgMember = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
    })

    if (!orgMember) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    const models = await prisma.model.findMany({
      where: {
        id: { in: modelIds },
      },
      include: {
        provider: true,
      },
    })

    const modelMap = new Map(models.map((model) => [model.id, model]))

    const results = await Promise.all(
      modelIds.map(async (modelId): Promise<PlaygroundResult> => {
        const model = modelMap.get(modelId)

        if (!model) {
          return {
            modelId,
            modelDisplayName: "Unknown model",
            providerDisplayName: "Unknown provider",
            error: "Model not found",
          }
        }

        const messages: Message[] = [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ]

        try {
          const startTime = Date.now()
          const aiProvider = await getAIProviderForModel(modelId, orgMember.organizationId)
          const response = await aiProvider.chatCompletion({
            model: model.modelKey,
            messages,
            temperature: typeof temperature === "number" ? temperature : 0.7,
          })

          const responseTime = Date.now() - startTime
          const cost = calculateCost(response.usage.inputTokens, response.usage.outputTokens, model)

          return {
            modelId: model.id,
            modelDisplayName: model.displayName,
            providerDisplayName: model.provider.displayName,
            response: response.content,
            usage: response.usage,
            cost,
            responseTime,
          }
        } catch (error) {
          return {
            modelId: model.id,
            modelDisplayName: model.displayName,
            providerDisplayName: model.provider.displayName,
            error: (error as Error).message,
          }
        }
      })
    )

    return NextResponse.json({ results })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "Invalid request" },
        { status: 400 }
      )
    }

    console.error("Error running playground:", error)
    return NextResponse.json(
      { error: "Failed to run playground" },
      { status: 500 }
    )
  }
}
