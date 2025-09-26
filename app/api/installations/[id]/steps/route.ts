import { type NextRequest, NextResponse } from "next/server"
import { requireAuth, createAuthResponse } from "@/lib/auth-middleware"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireAuth()

    if ("error" in authResult) {
      return createAuthResponse(authResult)
    }

    const { id } = await params
    const siteId = parseInt(id)

    const steps = await prisma.installStep.findMany({
      where: {
        siteId: siteId,
        stepType: {
          not: "PRE_INSTALLATION" // Exclude PRE_INSTALLATION steps
        }
      },
      orderBy: {
        id: "asc"
      }
    })

    return NextResponse.json(steps)
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireAuth()

    if ("error" in authResult) {
      return createAuthResponse(authResult)
    }

    const { id } = await params
    const siteId = parseInt(id)
    const body = await request.json()
    const { stepType, stepOrder } = body

    if (!stepType) {
      return NextResponse.json({ error: "Step type is required" }, { status: 400 })
    }

    const existingStep = await prisma.installStep.findFirst({
      where: {
        siteId: siteId,
        stepType: stepType
      }
    })

    if (existingStep) {
      const updatedStep = await prisma.installStep.update({
        where: { id: existingStep.id },
        data: {
          status: "IN_PROGRESS",
          updatedAt: new Date()
        }
      })

      setTimeout(async () => {
        try {
          await prisma.installStep.update({
            where: { id: existingStep.id },
            data: {
              status: "SUCCESS",
              updatedAt: new Date()
            }
          })
        } catch (error) {
        }
      }, 2000 + Math.random() * 1000) // 2-3 second delay

      return NextResponse.json(updatedStep)
    } else {
      return NextResponse.json({ error: "Step not found" }, { status: 404 })
    }
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
