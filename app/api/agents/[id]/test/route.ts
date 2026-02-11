import { NextResponse } from "next/server"
import { auth } from "@/lib/auth/config"
import { prisma } from "@/lib/db/prisma"
import { executeAgent, executeAgentStream } from "@/lib/ai/agent-executor"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await req.json()
    const { message, stream = true } = body

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 })
    }

    // Get agent and verify access
    const agent = await prisma.agent.findUnique({
      where: { id },
    })

    if (!agent) {
      return NextResponse.json({ error: "Agent not found" }, { status: 404 })
    }

    // Get user's organization
    const orgMember = await prisma.organizationMember.findFirst({
      where: {
        userId: session.user.id,
        organizationId: agent.organizationId,
      },
    })

    if (!orgMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Handle streaming
    if (stream) {
      try {
        const streamIterator = await executeAgentStream({
          agentId: id,
          message,
          organizationId: orgMember.organizationId,
        })
        console.log("Starting agent response stream...")
        
        // Create unified stream response
        const encoder = new TextEncoder()
        const readableStream = new ReadableStream({
          async start(controller) {
            try {
              for await (const chunk of streamIterator) {
                if (chunk.content) {
                  controller.enqueue(encoder.encode(chunk.content))
                }
                if (chunk.done) {
                  break
                }
              }
              controller.close()
            } catch (error) {
              console.error("Streaming error:", error)
              controller.error(error)
            }
          },
        })

        return new Response(readableStream, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
          },
        })
      } catch (error) {
        console.error("Streaming error:", error)
        return NextResponse.json(
          {
            error: error instanceof Error ? error.message : "Failed to stream response",
            details: error instanceof Error ? error.stack : undefined
          },
          { status: 500 }
        )
      }
    }

    // Non-streaming execution
    try {
      const result = await executeAgent({
        agentId: id,
        message,
        organizationId: orgMember.organizationId,
      })

      return NextResponse.json(result)
    } catch (error) {
      console.error("Execution error:", error)
      return NextResponse.json(
        {
          error: error instanceof Error ? error.message : "Failed to execute agent",
          details: error instanceof Error ? error.stack : undefined
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error("Error in test endpoint:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to process request",
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
