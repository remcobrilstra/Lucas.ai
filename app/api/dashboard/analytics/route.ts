import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const days = parseInt(searchParams.get("days") || "30")

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Fetch all test messages with session and agent info
    const messages = await prisma.testMessage.findMany({
      where: {
        createdAt: {
          gte: startDate,
        },
      },
      include: {
        session: {
          include: {
            agent: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    })

    // Aggregate token usage per model
    const modelUsage = new Map<string, {
      modelId: string
      modelName: string
      inputTokens: number
      outputTokens: number
      totalTokens: number
      cost: number
      messageCount: number
    }>()

    // Aggregate usage by date
    const dailyUsage = new Map<string, {
      date: string
      inputTokens: number
      outputTokens: number
      totalTokens: number
      cost: number
    }>()

    let totalInputTokens = 0
    let totalOutputTokens = 0
    let totalCost = 0
    let totalMessages = 0

    for (const message of messages) {
      const inputTokens = message.inputTokens || 0
      const outputTokens = message.outputTokens || 0
      const cost = message.cost || 0

      totalInputTokens += inputTokens
      totalOutputTokens += outputTokens
      totalCost += cost
      totalMessages += 1

      // Aggregate by model (use agent's model info)
      const modelId = message.session?.agent?.modelId || "unknown"
      const modelName = message.session?.agent?.modelId || "Unknown Model"

      if (!modelUsage.has(modelId)) {
        modelUsage.set(modelId, {
          modelId,
          modelName,
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          cost: 0,
          messageCount: 0,
        })
      }

      const usage = modelUsage.get(modelId)!
      usage.inputTokens += inputTokens
      usage.outputTokens += outputTokens
      usage.totalTokens += inputTokens + outputTokens
      usage.cost += cost
      usage.messageCount += 1

      // Aggregate by date
      const dateKey = message.createdAt.toISOString().split("T")[0]
      if (!dailyUsage.has(dateKey)) {
        dailyUsage.set(dateKey, {
          date: dateKey,
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          cost: 0,
        })
      }

      const daily = dailyUsage.get(dateKey)!
      daily.inputTokens += inputTokens
      daily.outputTokens += outputTokens
      daily.totalTokens += inputTokens + outputTokens
      daily.cost += cost
    }

    // Get model details to enrich the data
    const modelIds = Array.from(modelUsage.keys()).filter(id => id !== "unknown")
    const models = await prisma.model.findMany({
      where: {
        id: {
          in: modelIds,
        },
      },
      include: {
        provider: true,
      },
    })

    const modelMap = new Map(models.map(m => [m.id, m]))

    // Enrich model usage with display names
    const enrichedModelUsage = Array.from(modelUsage.values()).map(usage => {
      const model = modelMap.get(usage.modelId)
      return {
        ...usage,
        modelName: model?.displayName || usage.modelName,
        providerName: model?.provider?.displayName || "Unknown",
      }
    }).sort((a, b) => b.totalTokens - a.totalTokens)

    // Get counts for dashboard metrics
    const [agentCount, dataSourceCount, builtInToolCount, customToolCount, sessionCount] = await Promise.all([
      prisma.agent.count(),
      prisma.dataSource.count(),
      prisma.builtInTool.count(),
      prisma.customTool.count(),
      prisma.testSession.count({
        where: {
          createdAt: {
            gte: startDate,
          },
        },
      }),
    ])

    const toolCount = builtInToolCount + customToolCount

    return NextResponse.json({
      summary: {
        totalInputTokens,
        totalOutputTokens,
        totalTokens: totalInputTokens + totalOutputTokens,
        totalCost,
        totalMessages,
        agentCount,
        dataSourceCount,
        toolCount,
        sessionCount,
      },
      modelUsage: enrichedModelUsage,
      dailyUsage: Array.from(dailyUsage.values()).sort((a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
      ),
    })
  } catch (error) {
    console.error("Error fetching dashboard analytics:", error)
    return NextResponse.json(
      { error: "Failed to fetch analytics data" },
      { status: 500 }
    )
  }
}
