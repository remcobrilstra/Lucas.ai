import { NextResponse } from "next/server"
import { auth } from "@/lib/auth/config"
import { prisma } from "@/lib/db/prisma"
import { z } from "zod"

const modelSchema = z.object({
  providerId: z.string().min(1, "Provider is required"),
  modelKey: z.string().min(1, "Model key is required"),
  displayName: z.string().min(1, "Display name is required"),
  contextWindow: z.number().min(1, "Context window must be positive"),
  maxOutputTokens: z.number().optional().nullable(),
  inputPricePerM: z.number().min(0, "Input price must be non-negative"),
  outputPricePerM: z.number().min(0, "Output price must be non-negative"),
  capabilities: z.array(z.string()),
  isActive: z.boolean().default(true),
})

export async function GET(req: Request) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const providerId = searchParams.get("providerId")

    const where = {
      ...(providerId && { providerId }),
    }

    const models = await prisma.model.findMany({
      where,
      include: {
        provider: true,
      },
      orderBy: [
        { provider: { displayName: "asc" } },
        { displayName: "asc" },
      ],
    })

    return NextResponse.json(models)
  } catch (error) {
    console.error("Error fetching models:", error)
    return NextResponse.json(
      { error: "Failed to fetch models" },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const validatedData = modelSchema.parse(body)

    // Check if model already exists
    const existingModel = await prisma.model.findUnique({
      where: {
        providerId_modelKey: {
          providerId: validatedData.providerId,
          modelKey: validatedData.modelKey,
        },
      },
    })

    if (existingModel) {
      return NextResponse.json(
        { error: "Model with this key already exists for this provider" },
        { status: 400 }
      )
    }

    const model = await prisma.model.create({
      data: validatedData,
      include: {
        provider: true,
      },
    })

    return NextResponse.json(model, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "Invalid model data" },
        { status: 400 }
      )
    }

    console.error("Error creating model:", error)
    return NextResponse.json(
      { error: "Failed to create model" },
      { status: 500 }
    )
  }
}
