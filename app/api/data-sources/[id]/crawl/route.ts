import { NextResponse } from "next/server"
import { auth } from "@/lib/auth/config"
import { prisma } from "@/lib/db/prisma"
import { crawlScheduler } from "@/lib/data-sources/scheduler/cron-scheduler"

export const runtime = "nodejs"

/**
 * POST /api/data-sources/[id]/crawl
 * Manually trigger website crawl/re-crawl
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

    // Verify user has access and it's a website-type data source
    const dataSource = await prisma.dataSource.findFirst({
      where: {
        id: dataSourceId,
        type: "website",
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
        { error: "Data source not found or not a website type" },
        { status: 404 }
      )
    }

    // Check if there's already a running crawl job
    const existingJob = await prisma.crawlJob.findFirst({
      where: {
        dataSourceId,
        status: {
          in: ["pending", "running"],
        },
      },
    })

    if (existingJob) {
      return NextResponse.json(
        { error: "A crawl is already in progress" },
        { status: 400 }
      )
    }

    // Trigger manual crawl
    await crawlScheduler.triggerManualCrawl(dataSourceId)

    return NextResponse.json({
      success: true,
      message: "Crawl started",
    })
  } catch (error) {
    console.error("Error triggering crawl:", error)
    return NextResponse.json(
      { error: "Failed to trigger crawl" },
      { status: 500 }
    )
  }
}
