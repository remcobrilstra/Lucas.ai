import { NextResponse } from "next/server"
import { auth } from "@/lib/auth/config"
import { prisma } from "@/lib/db/prisma"
import { localStorage } from "@/lib/data-sources/storage/local-storage"

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

    const dataSource = await prisma.dataSource.findFirst({
      where: {
        id,
        organizationId: orgMember.organizationId,
      },
      include: {
        chunks: {
          take: 10,
          orderBy: { position: "asc" },
        },
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

    if (!dataSource) {
      return NextResponse.json({ error: "Data source not found" }, { status: 404 })
    }

    return NextResponse.json(dataSource)
  } catch (error) {
    console.error("Error fetching data source:", error)
    return NextResponse.json(
      { error: "Failed to fetch data source" },
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

    // Get user's organization
    const orgMember = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
    })

    if (!orgMember) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 })
    }

    const body = await req.json()
    const {
      name,
      description,
      chunkingStrategy,
      chunkSize,
      chunkOverlap,
      websiteUrl,
      crawlDepth,
      maxPages,
      crawlFrequency,
    } = body

    const dataSource = await prisma.dataSource.updateMany({
      where: {
        id,
        organizationId: orgMember.organizationId,
      },
      data: {
        name,
        description,
        chunkingStrategy,
        chunkSize,
        chunkOverlap,
        websiteUrl,
        crawlDepth,
        maxPages,
        crawlFrequency,
      },
    })

    if (dataSource.count === 0) {
      return NextResponse.json({ error: "Data source not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error updating data source:", error)
    return NextResponse.json(
      { error: "Failed to update data source" },
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

    const dataSource = await prisma.dataSource.findFirst({
      where: {
        id,
        organizationId: orgMember.organizationId,
      },
    })

    if (!dataSource) {
      return NextResponse.json({ error: "Data source not found" }, { status: 404 })
    }

    // Check if any agents are using this data source
    const agentCount = await prisma.agentDataSource.count({
      where: { dataSourceId: id },
    })

    if (agentCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete data source: ${agentCount} agent(s) are using it`,
          agentCount,
        },
        { status: 400 }
      )
    }

    // Delete file from storage
    if (dataSource.filePath) {
      await localStorage.deleteFile(dataSource.filePath)
    }

    // Delete chunks first (cascade)
    await prisma.chunk.deleteMany({
      where: { dataSourceId: id },
    })

    // Delete data source
    await prisma.dataSource.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting data source:", error)
    return NextResponse.json(
      { error: "Failed to delete data source" },
      { status: 500 }
    )
  }
}
