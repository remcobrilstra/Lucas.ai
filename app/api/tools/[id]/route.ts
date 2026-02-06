import { NextResponse } from "next/server"
import { auth } from "@/lib/auth/config"
import { prisma } from "@/lib/db/prisma"
import { z } from "zod"

const updateToolSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  description: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  type: z.enum(["built-in", "mcp-local", "mcp-remote", "custom"]).optional(),
  config: z.any().optional(),
  schema: z.any().optional(),
  isActive: z.boolean().optional(),
})

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const { id } = await params

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const tool = await prisma.builtInTool.findUnique({
      where: { id },
      include: {
        agents: {
          include: {
            agent: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    })

    if (!tool) {
      return NextResponse.json({ error: "Tool not found" }, { status: 404 })
    }

    return NextResponse.json(tool)
  } catch (error) {
    console.error("Error fetching tool:", error)
    return NextResponse.json(
      { error: "Failed to fetch tool" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const { id } = await params

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const validatedData = updateToolSchema.parse(body)

    const tool = await prisma.builtInTool.update({
      where: { id },
      data: validatedData,
    })

    return NextResponse.json(tool)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid tool data", details: error.issues },
        { status: 400 }
      )
    }
    console.error("Error updating tool:", error)
    return NextResponse.json(
      { error: "Failed to update tool" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const { id } = await params

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if any agents are using this tool
    const agentToolCount = await prisma.agentTool.count({
      where: { builtInToolId: id },
    })

    if (agentToolCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete tool: ${agentToolCount} agent(s) are using it`,
          agentCount: agentToolCount,
        },
        { status: 400 }
      )
    }

    await prisma.builtInTool.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting tool:", error)
    return NextResponse.json(
      { error: "Failed to delete tool" },
      { status: 500 }
    )
  }
}
