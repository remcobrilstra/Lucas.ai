import { NextResponse } from "next/server"
import { auth } from "@/lib/auth/config"
import { prisma } from "@/lib/db/prisma"
import { agentSchema } from "@/lib/validators"

export async function GET() {
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
      return NextResponse.json([])
    }

    const agents = await prisma.agent.findMany({
      where: {
        organizationId: orgMember.organizationId,
      },
      include: {
        model: {
          include: {
            provider: true,
          },
        },
        _count: {
          select: {
            dataSources: true,
            tools: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    return NextResponse.json(agents)
  } catch (error) {
    console.error("Error fetching agents:", error)
    return NextResponse.json(
      { error: "Failed to fetch agents" },
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

    const body = await req.json()
    const validatedData = agentSchema.parse(body)

    // Get or create organization
    let orgMember = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
    })

    if (!orgMember) {
      const org = await prisma.organization.create({
        data: {
          name: `${session.user.name}'s Organization`,
          slug: `${session.user.id}-org`,
          members: {
            create: {
              userId: session.user.id,
              role: "admin",
            },
          },
        },
      })

      orgMember = await prisma.organizationMember.findFirst({
        where: { userId: session.user.id, organizationId: org.id },
      })
    }

    // Create agent
    const agent = await prisma.agent.create({
      data: {
        ...validatedData,
        organizationId: orgMember!.organizationId,
        userId: session.user.id,
      },
      include: {
        model: {
          include: {
            provider: true,
          },
        },
      },
    })

    return NextResponse.json(agent, { status: 201 })
  } catch (error) {
    console.error("Error creating agent:", error)
    return NextResponse.json(
      { error: "Failed to create agent" },
      { status: 500 }
    )
  }
}
