import { NextResponse } from "next/server"
import { auth } from "@/lib/auth/config"
import { prisma } from "@/lib/db/prisma"
import { localStorage } from "@/lib/data-sources/storage/local-storage"
import { processorRegistry } from "@/lib/data-sources/processors/registry"

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
    const file = formData.get("file") as File | null
    const name = formData.get("name") as string
    const description = formData.get("description") as string | null
    const chunkingStrategy = (formData.get("chunkingStrategy") as string) || "fixed-size"
    const chunkSize = parseInt(formData.get("chunkSize") as string) || 1000
    const chunkOverlap = parseInt(formData.get("chunkOverlap") as string) || 200
    const indexingStrategy = (formData.get("indexingStrategy") as string) || "vector"
    const embeddingModel = (formData.get("embeddingModel") as string) || "text-embedding-3-small"

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    // Get file extension
    const fileExt = file.name.split(".").pop()?.toLowerCase() || "txt"

    // Validate file type
    if (!processorRegistry.isSupported(fileExt as any)) {
      return NextResponse.json(
        {
          error: `Unsupported file type: ${fileExt}`,
          supportedTypes: processorRegistry.getSupportedTypes(),
        },
        { status: 400 }
      )
    }

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 50MB" },
        { status: 400 }
      )
    }

    // Save file to local storage
    const { filePath, fileSize } = await localStorage.saveFile(file)

    // Create data source record
    const dataSource = await prisma.dataSource.create({
      data: {
        organizationId: orgMember.organizationId,
        name,
        description,
        type: "file",
        fileType: fileExt,
        filePath,
        fileSize,
        status: "pending",
        chunkingStrategy,
        chunkSize,
        chunkOverlap,
        indexingStrategy,
        embeddingModel,
      },
    })

    return NextResponse.json(dataSource)
  } catch (error) {
    console.error("Error uploading file:", error)
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    )
  }
}
