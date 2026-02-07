import { NextResponse } from "next/server"
import { auth } from "@/lib/auth/config"
import { prisma } from "@/lib/db/prisma"
import { localStorage } from "@/lib/data-sources/storage/local-storage"
import { processorRegistry } from "@/lib/data-sources/processors/registry"

export const runtime = "nodejs"

/**
 * GET /api/data-sources/[id]/documents
 * List all documents in a DataSource
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: dataSourceId } = await params

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

    // Get all documents for this data source
    const documents = await prisma.document.findMany({
      where: { dataSourceId },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(documents)
  } catch (error) {
    console.error("Error fetching documents:", error)
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/data-sources/[id]/documents
 * Add more files to an existing "files" type DataSource
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: dataSourceId } = await params

    // Verify user has access and it's a files-type data source
    const dataSource = await prisma.dataSource.findFirst({
      where: {
        id: dataSourceId,
        type: "files",
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
      return NextResponse.json(
        { error: "Data source not found or not a files type" },
        { status: 404 }
      )
    }

    const formData = await req.formData()
    const files = formData.getAll("files") as File[]

    if (!files || files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 })
    }

    // Validate file size limit (max 50MB per file)
    const maxSize = 50 * 1024 * 1024
    for (const file of files) {
      if (file.size > maxSize) {
        return NextResponse.json(
          { error: `File ${file.name} is too large. Maximum size is 50MB` },
          { status: 400 }
        )
      }
    }

    // Create document records for each file
    const documents = []
    for (const file of files) {
      const fileExt = file.name.split(".").pop()?.toLowerCase() || "txt"

      // Validate file type
      if (!processorRegistry.isSupported(fileExt as "pdf" | "docx" | "txt" | "md")) {
        return NextResponse.json(
          {
            error: `Unsupported file type: ${fileExt}`,
            supportedTypes: processorRegistry.getSupportedTypes(),
          },
          { status: 400 }
        )
      }

      // Save file to local storage
      const { filePath, fileSize } = await localStorage.saveFile(file)

      // Create document record
      const document = await prisma.document.create({
        data: {
          dataSourceId: dataSource.id,
          name: file.name,
          type: "file",
          fileType: fileExt,
          filePath,
          fileSize,
          status: "pending",
        },
      })

      documents.push(document)
    }

    return NextResponse.json(documents)
  } catch (error) {
    console.error("Error adding documents:", error)
    return NextResponse.json(
      { error: "Failed to add documents" },
      { status: 500 }
    )
  }
}
