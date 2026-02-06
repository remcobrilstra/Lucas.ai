import { NextResponse } from "next/server"
import { auth } from "@/lib/auth/config"
import { prisma } from "@/lib/db/prisma"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const { id } = await params

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user's organization
    const orgMember = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
    })

    if (!orgMember) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 })
    }

    // Verify agent belongs to user's organization
    const agent = await prisma.agent.findFirst({
      where: {
        id,
        organizationId: orgMember.organizationId,
      },
    })

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 })
    }

    const body = await req.json()
    const { dataSourceId, topK = 5, similarityThreshold = 0.7 } = body

    // Verify data source belongs to organization
    const dataSource = await prisma.dataSource.findFirst({
      where: {
        id: dataSourceId,
        organizationId: orgMember.organizationId,
      },
    })

    if (!dataSource) {
      return NextResponse.json({ error: "Data source not found" }, { status: 404 })
    }

    // Check if already attached
    const existing = await prisma.agentDataSource.findFirst({
      where: {
        agentId: id,
        dataSourceId,
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: "Data source already attached to this agent" },
        { status: 400 }
      )
    }

    // Create relationship
    const agentDataSource = await prisma.agentDataSource.create({
      data: {
        agentId: id,
        dataSourceId,
        topK,
        similarityThreshold,
      },
    })

    return NextResponse.json(agentDataSource)
  } catch (error) {
    console.error("Error attaching data source:", error)
    return NextResponse.json(
      { error: "Failed to attach data source" },
      { status: 500 }
    )
  }
}

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

    // Get user's organization
    const orgMember = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
    })

    if (!orgMember) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 })
    }

    const agentDataSources = await prisma.agentDataSource.findMany({
      where: {
        agentId: id,
        agent: {
          organizationId: orgMember.organizationId,
        },
      },
      include: {
        dataSource: true,
      },
    })

    return NextResponse.json(agentDataSources)
  } catch (error) {
    console.error("Error fetching agent data sources:", error)
    return NextResponse.json(
      { error: "Failed to fetch data sources" },
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

    // Get user's organization
    const orgMember = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
    })

    if (!orgMember) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 })
    }

    const { searchParams } = new URL(req.url)
    const dataSourceId = searchParams.get("dataSourceId")

    if (!dataSourceId) {
      return NextResponse.json(
        { error: "dataSourceId query parameter is required" },
        { status: 400 }
      )
    }

    // Verify agent belongs to user's organization
    const agent = await prisma.agent.findFirst({
      where: {
        id,
        organizationId: orgMember.organizationId,
      },
    })

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 })
    }

    // Delete relationship
    await prisma.agentDataSource.deleteMany({
      where: {
        agentId: id,
        dataSourceId,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error removing data source:", error)
    return NextResponse.json(
      { error: "Failed to remove data source" },
      { status: 500 }
    )
  }
}
