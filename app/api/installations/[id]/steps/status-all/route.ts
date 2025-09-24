import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (session.user.role !== "ADMIN" && session.user.role !== "STAFF") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const siteId = parseInt(id)
    const steps = await prisma.installStep.findMany({
      where: {
        siteId: siteId,
        stepType: {
          not: "PRE_INSTALLATION"
        }
      },
      orderBy: {
        id: "asc"
      },
      select: {
        id: true,
        stepType: true,
        status: true,
        errorMsg: true,
        createdAt: true,
        updatedAt: true
      }
    })
    const totalSteps = steps.length
    const completedSteps = steps.filter(step => step.status === "SUCCESS").length
    const failedSteps = steps.filter(step => step.status === "FAILED").length
    const inProgressSteps = steps.filter(step => step.status === "IN_PROGRESS").length
    const pendingSteps = steps.filter(step => step.status === "PENDING").length

    let overallStatus: "PENDING" | "IN_PROGRESS" | "SUCCESS" | "FAILED" = "PENDING"
    
    if (failedSteps > 0) {
      overallStatus = "FAILED"
    } else if (inProgressSteps > 0) {
      overallStatus = "IN_PROGRESS"
    } else if (completedSteps === totalSteps && totalSteps > 0) {
      overallStatus = "SUCCESS"
    }

    // Check if installation is complete
    const isComplete = overallStatus === "SUCCESS"

    return NextResponse.json({
      success: true,
      siteId: siteId,
      overallStatus: overallStatus,
      isComplete: isComplete,
      progress: {
        total: totalSteps,
        completed: completedSteps,
        failed: failedSteps,
        inProgress: inProgressSteps,
        pending: pendingSteps,
        percentage: totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0
      },
      steps: steps
    })

  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
