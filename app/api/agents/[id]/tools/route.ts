import { NextResponse } from "next/server"
import { auth } from "@/lib/auth/config"
import { prisma } from "@/lib/db/prisma"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { toolId } = body

    if (!toolId) {
      return NextResponse.json({ error: "Tool ID is required" }, { status: 400 })
    }

    // Verify agent exists and user has access
    const agent = await prisma.agent.findUnique({
      where: { id },
    })

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 })
    }

    const orgMember = await prisma.organizationMember.findFirst({
      where: {
        userId: session.user.id,
        organizationId: agent.organizationId,
      },
    })

    if (!orgMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Add tool to agent
    const agentTool = await prisma.agentTool.create({
      data: {
        agentId: id,
        builtInToolId: toolId,
      },
    })

    return NextResponse.json(agentTool, { status: 201 })
  } catch (error) {
    console.error("Error adding tool to agent:", error)
    return NextResponse.json(
      { error: "Failed to add tool to agent" },
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
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify agent exists and user has access
    const agent = await prisma.agent.findUnique({
      where: { id },
    })

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 })
    }

    const orgMember = await prisma.organizationMember.findFirst({
      where: {
        userId: session.user.id,
        organizationId: agent.organizationId,
      },
    })

    if (!orgMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Delete all tools from agent
    await prisma.agentTool.deleteMany({
      where: { agentId: id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting tools from agent:", error)
    return NextResponse.json(
      { error: "Failed to delete tools from agent" },
      { status: 500 }
    )
  }
}
