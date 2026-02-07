import { NextResponse } from "next/server"
import { auth } from "@/lib/auth/config"
import { prisma } from "@/lib/db/prisma"
import { dataSourcePipeline } from "@/lib/data-sources/pipeline"

export const runtime = "nodejs"

/**
 * GET /api/data-sources/[id]/documents/[documentId]
 * Get document details
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: dataSourceId, documentId } = await params

    // Verify user has access to this data source
    const dataSource = await prisma.dataSource.findFirst({
      where: {
        id: dataSourceId,
        organization: {
          members: {
            some: {
              userId: session.user.id,
            },
          },
        },
      },
    })

    if (!dataSource) {
      return NextResponse.json({ error: "Data source not found" }, { status: 404 })
    }

    // Get document
    const document = await prisma.document.findUnique({
      where: {
        id: documentId,
        dataSourceId,
      },
    })

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    return NextResponse.json(document)
  } catch (error) {
    console.error("Error fetching document:", error)
    return NextResponse.json(
      { error: "Failed to fetch document" },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/data-sources/[id]/documents/[documentId]
 * Update document settings (triggers reprocess)
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: dataSourceId, documentId } = await params

    // Verify user has access to this data source
    const dataSource = await prisma.dataSource.findFirst({
      where: {
        id: dataSourceId,
        organization: {
          members: {
            some: {
              userId: session.user.id,
            },
          },
        },
      },
    })

    if (!dataSource) {
      return NextResponse.json({ error: "Data source not found" }, { status: 404 })
    }

    const body = await req.json()
    const { chunkingStrategy, chunkSize, chunkOverlap, embeddingModel } = body

    // Update document with new settings
    const document = await prisma.document.update({
      where: {
        id: documentId,
        dataSourceId,
      },
      data: {
        chunkingStrategy: chunkingStrategy || null,
        chunkSize: chunkSize ? parseInt(chunkSize) : null,
        chunkOverlap: chunkOverlap ? parseInt(chunkOverlap) : null,
        embeddingModel: embeddingModel || null,
        status: "pending",
      },
    })

    // Trigger reprocessing if document has a file path
    if (document.filePath) {
      const options = {
        chunkingStrategy: (document.chunkingStrategy || dataSource.chunkingStrategy) as "fixed-size" | "sentence" | "recursive" | "semantic",
        chunkSize: document.chunkSize || dataSource.chunkSize,
        chunkOverlap: document.chunkOverlap || dataSource.chunkOverlap,
        indexingStrategy: dataSource.indexingStrategy as "vector" | "bm25" | "hybrid",
        embeddingModel: document.embeddingModel || dataSource.embeddingModel,
      }

      // Trigger processing in background
      dataSourcePipeline
        .processDocument(
          document.id,
          document.filePath,
          document.fileType || "txt",
          options,
          dataSource.organizationId
        )
        .catch((error) => {
          console.error(`Error reprocessing document ${documentId}:`, error)
        })
    }

    return NextResponse.json(document)
  } catch (error) {
    console.error("Error updating document:", error)
    return NextResponse.json(
      { error: "Failed to update document" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/data-sources/[id]/documents/[documentId]
 * Remove document from DataSource
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: dataSourceId, documentId } = await params

    // Verify user has access to this data source
    const dataSource = await prisma.dataSource.findFirst({
      where: {
        id: dataSourceId,
        organization: {
          members: {
            some: {
              userId: session.user.id,
            },
          },
        },
      },
    })

    if (!dataSource) {
      return NextResponse.json({ error: "Data source not found" }, { status: 404 })
    }

    // Get document
    const document = await prisma.document.findUnique({
      where: {
        id: documentId,
        dataSourceId,
      },
    })

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    // Delete document (cascades to chunks)
    await prisma.document.delete({
      where: { id: documentId },
    })

    // Update data source total chunks count
    const totalChunks = await prisma.chunk.count({
      where: { dataSourceId },
    })

    await prisma.dataSource.update({
      where: { id: dataSourceId },
      data: { totalChunks },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting document:", error)
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 }
    )
  }
}
