import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth/config"
import { prisma } from "@/lib/db/prisma"
import { getAIProviderForModel } from "@/lib/ai/provider-factory"
import { calculateCost } from "@/lib/utils/cost-calculator"
import type { Message } from "@/lib/ai/types"

const playgroundChatSchema = z.object({
  modelId: z.string().min(1, "Model is required"),
  systemPrompt: z.string().min(1, "System prompt is required"),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1),
      })
    )
    .min(1, "At least one message is required"),
  temperature: z.number().min(0).max(2).optional(),
})

type PlaygroundChatRequest = z.infer<typeof playgroundChatSchema>

export async function POST(req: Request) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = (await req.json()) as PlaygroundChatRequest
    const { modelId, systemPrompt, messages, temperature } = playgroundChatSchema.parse(body)

    const orgMember = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
    })

    if (!orgMember) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    const model = await prisma.model.findUnique({
      where: { id: modelId },
      include: { provider: true },
    })

    if (!model) {
      return NextResponse.json({ error: "Model not found" }, { status: 404 })
    }

    const aiProvider = await getAIProviderForModel(modelId, orgMember.organizationId)

    const chatMessages: Message[] = [
      { role: "system", content: systemPrompt },
      ...messages.map((message) => ({
        role: message.role,
        content: message.content,
      })),
    ]

    const startTime = Date.now()
    const response = await aiProvider.chatCompletion({
      model: model.modelKey,
      messages: chatMessages,
      temperature: typeof temperature === "number" ? temperature : 0.7,
    })

    const responseTime = Date.now() - startTime
    const cost = calculateCost(response.usage.inputTokens, response.usage.outputTokens, model)

    return NextResponse.json({
      response: response.content,
      usage: response.usage,
      cost,
      responseTime,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "Invalid request" },
        { status: 400 }
      )
    }

    console.error("Error running playground chat:", error)
    return NextResponse.json(
      { error: "Failed to run playground chat" },
      { status: 500 }
    )
  }
}
