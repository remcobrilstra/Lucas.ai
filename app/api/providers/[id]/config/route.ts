import { NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { encrypt } from "@/lib/utils/crypto"
import { requireAdmin } from "@/lib/auth/role-middleware"
import { Role } from "@/lib/types/roles"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { session, error } = await requireAdmin()

    if (error) {
      return error
    }

    // Get user's organization (for now, we'll create one if it doesn't exist)
    const orgMember = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      include: { organization: true },
    })

    if (!orgMember) {
      return NextResponse.json({ configured: false })
    }

    // Check if provider is configured for the organization
    const config = await prisma.organizationProvider.findUnique({
      where: {
        organizationId_providerId: {
          organizationId: orgMember.organizationId,
          providerId: id,
        },
      },
    })

    if (!config) {
      return NextResponse.json({ configured: false })
    }

    return NextResponse.json({
      configured: true,
      isActive: config.isActive,
    })
  } catch (error) {
    console.error("Error fetching provider config:", error)
    return NextResponse.json(
      { error: "Failed to fetch provider configuration" },
      { status: 500 }
    )
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { session, error } = await requireAdmin()

    if (error) {
      return error
    }

    const body = await req.json()
    const { apiKey } = body

    if (!apiKey) {
      return NextResponse.json({ error: "API key is required" }, { status: 400 })
    }

    // Get or create organization for user
    let orgMember = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      include: { organization: true },
    })

    if (!orgMember) {
      // Create default organization for user
      const org = await prisma.organization.create({
        data: {
          name: `${session.user.name}'s Organization`,
          slug: `${session.user.id}-org`,
          members: {
            create: {
              userId: session.user.id,
              role: Role.ADMIN,
            },
          },
        },
      })

      orgMember = await prisma.organizationMember.findFirst({
        where: { userId: session.user.id, organizationId: org.id },
        include: { organization: true },
      })
    }

    // Encrypt API key
    const encryptedApiKey = encrypt(apiKey)

    // Create or update provider configuration
    const config = await prisma.organizationProvider.upsert({
      where: {
        organizationId_providerId: {
          organizationId: orgMember!.organizationId,
          providerId: id,
        },
      },
      update: {
        apiKey: encryptedApiKey,
        isActive: true,
      },
      create: {
        organizationId: orgMember!.organizationId,
        providerId: id,
        apiKey: encryptedApiKey,
        isActive: true,
      },
    })

    return NextResponse.json({ success: true, config: { id: config.id, isActive: config.isActive } })
  } catch (error) {
    console.error("Error configuring provider:", error)
    return NextResponse.json(
      { error: "Failed to configure provider" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { session, error } = await requireAdmin()

    if (error) {
      return error
    }

    // Get user's organization
    const orgMember = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
    })

    if (!orgMember) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    // Delete provider configuration
    await prisma.organizationProvider.delete({
      where: {
        organizationId_providerId: {
          organizationId: orgMember.organizationId,
          providerId: id,
        },
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting provider config:", error)
    return NextResponse.json(
      { error: "Failed to delete provider configuration" },
      { status: 500 }
    )
  }
}
