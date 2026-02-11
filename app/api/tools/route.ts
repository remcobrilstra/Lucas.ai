import { NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { z } from "zod"
import { requireDeveloper } from "@/lib/auth/role-middleware"

const toolSchema = z.object({
  name: z.string().min(1).max(100),
  displayName: z.string().min(1).max(100),
  description: z.string().min(1),
  category: z.string().min(1),
  type: z.enum(["built-in", "mcp-local", "mcp-remote", "custom"]),
  config: z.any().optional(),
  schema: z.any().optional(),
})

const buildPlaceholderSchema = (name: string, description: string) => ({
  type: "function",
  function: {
    name,
    description,
    parameters: {
      type: "object",
      properties: {},
    },
  },
})

export async function GET(req: Request) {
  try {
    const { session, error } = await requireDeveloper()

    if (error) {
      return error
    }

    const { searchParams } = new URL(req.url)
    const includeInactive = searchParams.get("includeInactive") === "true"

    const tools = await prisma.builtInTool.findMany({
      where: includeInactive ? undefined : { isActive: true },
      orderBy: { displayName: "asc" },
    })

    return NextResponse.json(tools)
  } catch (error) {
    console.error("Error fetching tools:", error)
    return NextResponse.json(
      { error: "Failed to fetch tools" },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  try {
    const { session, error } = await requireDeveloper()

    if (error) {
      return error
    }

    const body = await req.json()
    const validatedData = toolSchema.parse(body)

    if (!validatedData.schema) {
      if (validatedData.type === "mcp-remote") {
        validatedData.schema = buildPlaceholderSchema(
          validatedData.name,
          validatedData.description
        )
      } else {
        return NextResponse.json(
          { error: "Schema is required for this tool type" },
          { status: 400 }
        )
      }
    }

    // Check if tool name already exists
    const existingTool = await prisma.builtInTool.findUnique({
      where: { name: validatedData.name },
    })

    if (existingTool) {
      return NextResponse.json(
        { error: "Tool with this name already exists" },
        { status: 400 }
      )
    }

    const tool = await prisma.builtInTool.create({
      data: validatedData,
    })

    return NextResponse.json(tool)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid tool data", details: error.issues },
        { status: 400 }
      )
    }
    console.error("Error creating tool:", error)
    return NextResponse.json(
      { error: "Failed to create tool" },
      { status: 500 }
    )
  }
}
