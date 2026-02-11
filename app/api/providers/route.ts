import { NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { requireAdmin } from "@/lib/auth/role-middleware"

export async function GET() {
  try {
    const { session, error } = await requireAdmin()

    if (error) {
      return error
    }

    // Get all providers
    const providers = await prisma.provider.findMany({
      orderBy: { displayName: "asc" },
    })

    return NextResponse.json(providers)
  } catch (error) {
    console.error("Error fetching providers:", error)
    return NextResponse.json(
      { error: "Failed to fetch providers" },
      { status: 500 }
    )
  }
}
