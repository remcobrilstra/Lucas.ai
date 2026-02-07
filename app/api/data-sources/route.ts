import { NextResponse } from "next/server"
import { auth } from "@/lib/auth/config"
import { prisma } from "@/lib/db/prisma"
import { localStorage } from "@/lib/data-sources/storage/local-storage"
import { processorRegistry } from "@/lib/data-sources/processors/registry"

export const runtime = "nodejs"

export async function GET(req: Request) {
  try {
    const session = await auth()

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
    const status = searchParams.get("status")

    const dataSources = await prisma.dataSource.findMany({
      where: {
        organizationId: orgMember.organizationId,
        ...(status && { status }),
      },
      include: {
        _count: {
          select: { documents: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(dataSources)
  } catch (error) {
    console.error("Error fetching data sources:", error)
    return NextResponse.json(
      { error: "Failed to fetch data sources" },
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

    // Get user's organization
    const orgMember = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
    })

    if (!orgMember) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 })
    }

    const formData = await req.formData()
    const type = (formData.get("type") as string) || "files"
    const name = formData.get("name") as string
    const description = formData.get("description") as string | null

    // Shared ingestion settings
    const chunkingStrategy = (formData.get("chunkingStrategy") as string) || "fixed-size"
    const chunkSize = parseInt(formData.get("chunkSize") as string) || 1000
    const chunkOverlap = parseInt(formData.get("chunkOverlap") as string) || 200
    const indexingStrategy = (formData.get("indexingStrategy") as string) || "vector"
    const embeddingModel = (formData.get("embeddingModel") as string) || "text-embedding-3-small"

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    // Handle website type
    if (type === "website") {
      const websiteUrl = formData.get("websiteUrl") as string
      const crawlDepth = parseInt(formData.get("crawlDepth") as string) || 1
      const maxPages = parseInt(formData.get("maxPages") as string) || 100
      const crawlFrequency = (formData.get("crawlFrequency") as string) || null

      if (!websiteUrl) {
        return NextResponse.json({ error: "Website URL is required" }, { status: 400 })
      }

      // Validate URL format
      try {
        new URL(websiteUrl)
      } catch {
        return NextResponse.json({ error: "Invalid URL format" }, { status: 400 })
      }

      // Create website data source
      const dataSource = await prisma.dataSource.create({
        data: {
          organizationId: orgMember.organizationId,
          name,
          description,
          type: "website",
          websiteUrl,
          crawlDepth,
          maxPages,
          crawlFrequency,
          status: "pending",
          chunkingStrategy,
          chunkSize,
          chunkOverlap,
          indexingStrategy,
          embeddingModel,
        },
      })

      return NextResponse.json(dataSource)
    }

    // Handle files type (multiple files)
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

    // Create data source record
    const dataSource = await prisma.dataSource.create({
      data: {
        organizationId: orgMember.organizationId,
        name,
        description,
        type: "files",
        status: "pending",
        chunkingStrategy,
        chunkSize,
        chunkOverlap,
        indexingStrategy,
        embeddingModel,
      },
    })

    // Create document records for each file
    const documents = []
    for (const file of files) {
      const fileExt = file.name.split(".").pop()?.toLowerCase() || "txt"

      // Validate file type
      if (!processorRegistry.isSupported(fileExt as "pdf" | "docx" | "txt" | "md")) {
        await prisma.dataSource.delete({ where: { id: dataSource.id } })
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

    return NextResponse.json({ dataSource, documents })
  } catch (error) {
    console.error("Error creating data source:", error)
    return NextResponse.json(
      { error: "Failed to create data source" },
      { status: 500 }
    )
  }
}
