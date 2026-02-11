import { NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { z } from "zod"
import { requireAdmin } from "@/lib/auth/role-middleware"

const updateModelSchema = z.object({
  displayName: z.string().min(1).optional(),
  contextWindow: z.number().min(1).optional(),
  maxOutputTokens: z.number().optional().nullable(),
  inputPricePerM: z.number().min(0).optional(),
  outputPricePerM: z.number().min(0).optional(),
  capabilities: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
})

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { session, error } = await requireAdmin()

    if (error) {
      return error
    }

    const body = await req.json()
    const validatedData = updateModelSchema.parse(body)

    const model = await prisma.model.update({
      where: { id },
      data: validatedData,
      include: {
        provider: true,
      },
    })

    return NextResponse.json(model)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "Invalid model data" },
        { status: 400 }
      )
    }

    console.error("Error updating model:", error)
    return NextResponse.json(
      { error: "Failed to update model" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { session, error } = await requireAdmin()

    if (error) {
      return error
    }

    // Check if any agents are using this model
    const agentCount = await prisma.agent.count({
      where: { modelId: id },
    })

    if (agentCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete model. ${agentCount} agent(s) are using it.` },
        { status: 400 }
      )
    }

    await prisma.model.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting model:", error)
    return NextResponse.json(
      { error: "Failed to delete model" },
      { status: 500 }
    )
  }
}
