import { NextResponse } from "next/server"
import { auth } from "@/lib/auth/config"
import { prisma } from "@/lib/db/prisma"
import { agentSchema } from "@/lib/validators"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const agent = await prisma.agent.findUnique({
      where: { id },
      include: {
        model: {
          include: {
            provider: true,
          },
        },
        dataSources: {
          include: {
            dataSource: true,
          },
        },
        tools: {
          include: {
            builtInTool: true,
            customTool: true,
          },
        },
      },
    })

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 })
    }

    // Check if user has access
    const orgMember = await prisma.organizationMember.findFirst({
      where: {
        userId: session.user.id,
        organizationId: agent.organizationId,
      },
    })

    if (!orgMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    return NextResponse.json(agent)
  } catch (error) {
    console.error("Error fetching agent:", error)
    return NextResponse.json(
      { error: "Failed to fetch agent" },
      { status: 500 }
    )
  }
}

export async function PATCH(
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
    const validatedData = agentSchema.partial().parse(body)

    // Check if user has access
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

    // Update agent
    const updatedAgent = await prisma.agent.update({
      where: { id },
      data: validatedData,
      include: {
        model: {
          include: {
            provider: true,
          },
        },
      },
    })

    return NextResponse.json(updatedAgent)
  } catch (error) {
    console.error("Error updating agent:", error)
    return NextResponse.json(
      { error: "Failed to update agent" },
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

    // Check if user has access
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

    // Delete agent
    await prisma.agent.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting agent:", error)
    return NextResponse.json(
      { error: "Failed to delete agent" },
      { status: 500 }
    )
  }
}
