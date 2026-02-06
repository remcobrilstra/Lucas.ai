import { NextResponse } from "next/server"
import { auth } from "@/lib/auth/config"
import { prisma } from "@/lib/db/prisma"
import { dataSourcePipeline } from "@/lib/data-sources/pipeline"

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

    const dataSource = await prisma.dataSource.findFirst({
      where: {
        id,
        organizationId: orgMember.organizationId,
      },
    })

    if (!dataSource) {
      return NextResponse.json({ error: "Data source not found" }, { status: 404 })
    }

    if (!dataSource.filePath) {
      return NextResponse.json(
        { error: "No file associated with data source" },
        { status: 400 }
      )
    }

    // Process in background (non-blocking)
    // In production, you'd use a job queue like BullMQ
    dataSourcePipeline
      .process(
        id,
        dataSource.filePath,
        dataSource.fileType || "txt",
        {
          chunkingStrategy: dataSource.chunkingStrategy as any,
          chunkSize: dataSource.chunkSize,
          chunkOverlap: dataSource.chunkOverlap,
          indexingStrategy: dataSource.indexingStrategy as any,
          embeddingModel: dataSource.embeddingModel,
        },
        orgMember.organizationId
      )
      .catch((error) => {
        console.error(`Processing failed for ${id}:`, error)
      })

    return NextResponse.json({
      success: true,
      message: "Processing started",
    })
  } catch (error) {
    console.error("Error starting processing:", error)
    return NextResponse.json(
      { error: "Failed to start processing" },
      { status: 500 }
    )
  }
}
