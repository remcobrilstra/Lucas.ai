import { NextResponse } from "next/server"
import { auth } from "@/lib/auth/config"
import { prisma } from "@/lib/db/prisma"
import { vectorSearch } from "@/lib/data-sources/retrieval"

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

    const body = await req.json()
    const { query, topK = 5, threshold = 0.7 } = body

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 })
    }

    const results = await vectorSearch(query, {
      dataSourceIds: [id],
      topK,
      threshold,
      embeddingModel: dataSource.embeddingModel,
      organizationId: orgMember.organizationId,
    })

    return NextResponse.json({
      query,
      results,
      count: results.length,
    })
  } catch (error) {
    console.error("Error searching data source:", error)
    return NextResponse.json(
      { error: "Failed to search data source" },
      { status: 500 }
    )
  }
}
