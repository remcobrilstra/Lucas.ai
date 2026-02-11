import { NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { requireAdmin } from "@/lib/auth/role-middleware"

export async function GET() {
  try {
    const { session, error } = await requireAdmin()
    if (error) {
      return error
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        organizations: {
          include: {
            organization: {
              include: {
                playgroundSettings: true,
              },
            },
          },
        },
      },
    })

    if (!user || user.organizations.length === 0) {
      console.log("No organization found for user:", session.user.email)
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    const organization = user.organizations[0].organization
    const settings = organization.playgroundSettings

    console.log("Fetched settings for org:", organization.id, settings)

    // If no settings exist, return empty state
    if (!settings) {
      console.log("No settings found, returning defaults")
      return NextResponse.json({
        defaultModelId: null,
        availableModelIds: [],
      })
    }

    const response = {
      defaultModelId: settings.defaultModelId,
      availableModelIds: settings.availableModelIds,
    }
    console.log("Returning settings:", response)

    return NextResponse.json(response)
  } catch (error) {
    console.error("Failed to fetch playground settings:", error)
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const { session, error } = await requireAdmin()
    if (error) {
      return error
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        organizations: true,
      },
    })

    if (!user || user.organizations.length === 0) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    const organizationId = user.organizations[0].organizationId
    const body = await request.json()
    const { defaultModelId, availableModelIds } = body

    console.log("Saving settings for org:", organizationId, { defaultModelId, availableModelIds })

    // Validate that all model IDs exist
    if (availableModelIds && availableModelIds.length > 0) {
      const models = await prisma.model.findMany({
        where: {
          id: {
            in: availableModelIds,
          },
        },
      })

      if (models.length !== availableModelIds.length) {
        console.log("Invalid model IDs:", availableModelIds, "Found:", models.length)
        return NextResponse.json(
          { error: "Some model IDs are invalid" },
          { status: 400 }
        )
      }
    }

    // Validate default model is in available models
    if (defaultModelId && availableModelIds && !availableModelIds.includes(defaultModelId)) {
      console.log("Default model not in available list:", defaultModelId, availableModelIds)
      return NextResponse.json(
        { error: "Default model must be in available models" },
        { status: 400 }
      )
    }

    // Upsert settings
    const settings = await prisma.playgroundSettings.upsert({
      where: {
        organizationId,
      },
      update: {
        defaultModelId,
        availableModelIds,
      },
      create: {
        organizationId,
        defaultModelId,
        availableModelIds,
      },
    })

    console.log("Settings saved successfully:", settings)

    return NextResponse.json({
      defaultModelId: settings.defaultModelId,
      availableModelIds: settings.availableModelIds,
    })
  } catch (error) {
    console.error("Failed to update playground settings:", error)
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    )
  }
}
