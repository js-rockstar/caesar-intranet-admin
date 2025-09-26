import { type NextRequest, NextResponse } from "next/server"
import { requireAuth, createAuthResponse } from "@/lib/auth-middleware"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const sessionDataSchema = z.object({
  projectId: z.number(),
  clientId: z.number().optional(), // Optional for initial project selection
  domain: z.string().optional(), // Optional for initial project selection
  adminEmail: z.string().optional().refine((email) => {
    // Only validate email format if the string is not empty
    if (!email || email.trim() === "") return true
    return z.string().email().safeParse(email).success
  }, {
    message: "Invalid email format"
  }),
  adminPassword: z.string().optional(), // Optional for initial project selection
  currentStep: z.string().optional(),
})

const updateSessionSchema = z.object({
  stepData: sessionDataSchema,
})

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth()

    if ("error" in authResult) {
      return createAuthResponse(authResult)
    }


    const body = await request.json()
    const validatedData = updateSessionSchema.parse(body)

    // Create a temporary site for the installation session
    // Only set clientId if provided (for project selection step, clientId might not be available yet)
    const siteData: any = {
      projectId: validatedData.stepData.projectId,
      domain: validatedData.stepData.domain || "UNNAMED",
      status: "PENDING",
    }
    
    // Only add clientId if it's provided and valid
    if (validatedData.stepData.clientId) {
      siteData.clientId = validatedData.stepData.clientId
    }
    
    const tempSite = await prisma.site.create({
      data: siteData,
    })

    // Create the PRE_INSTALLATION step with session data
    const installationStep = await prisma.installStep.create({
      data: {
        siteId: tempSite.id,
        stepType: "PRE_INSTALLATION",
        status: "IN_PROGRESS",
        stepData: validatedData.stepData,
      },
    })

    return NextResponse.json({
      sessionId: tempSite.id,
      stepId: installationStep.id,
      message: "Installation session created successfully"
    }, { status: 201 })

  } catch (error) {
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: "Invalid request data",
        details: error.errors 
      }, { status: 400 })
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth()

    if ("error" in authResult) {
      return createAuthResponse(authResult)
    }


    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get("sessionId")

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 })
    }

    // Find the PRE_INSTALLATION step for this session
    const installationStep = await prisma.installStep.findFirst({
      where: {
        siteId: parseInt(sessionId),
        stepType: "PRE_INSTALLATION",
      },
      include: {
        site: {
          include: {
            client: true,
            project: true,
          },
        },
      },
    })

    if (!installationStep) {
      return NextResponse.json({ error: "Installation session not found" }, { status: 404 })
    }

    return NextResponse.json({
      sessionId: installationStep.siteId,
      stepId: installationStep.id,
      stepData: installationStep.stepData,
      site: installationStep.site,
    })

  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireAuth()

    if ("error" in authResult) {
      return createAuthResponse(authResult)
    }


    const body = await request.json()
    const validatedData = updateSessionSchema.parse(body)

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get("sessionId")

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 })
    }

    // Update both the site's clientId and the PRE_INSTALLATION step with new session data
    await prisma.$transaction(async (tx: any) => {
      // Update the site's clientId if provided
      if (validatedData.stepData.clientId) {
        await tx.site.update({
          where: { id: parseInt(sessionId) },
          data: { clientId: validatedData.stepData.clientId },
        })
      }

      // Update the PRE_INSTALLATION step with new session data
      const updatedStep = await tx.installStep.updateMany({
        where: {
          siteId: parseInt(sessionId),
          stepType: "PRE_INSTALLATION",
        },
        data: {
          stepData: validatedData.stepData,
          updatedAt: new Date(),
        },
      })

      if (updatedStep.count === 0) {
        throw new Error("Installation session not found")
      }
    })

    return NextResponse.json({
      message: "Installation session updated successfully"
    })

  } catch (error) {
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: "Invalid request data",
        details: error.errors 
      }, { status: 400 })
    }

    if (error instanceof Error && error.message === "Installation session not found") {
      return NextResponse.json({ error: "Installation session not found" }, { status: 404 })
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authResult = await requireAuth()

    if ("error" in authResult) {
      return createAuthResponse(authResult)
    }


    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get("sessionId")

    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required" }, { status: 400 })
    }

    // Delete the installation session (site and all its steps)
    await prisma.$transaction(async (tx: any) => {
      // Delete all steps first
      await tx.installStep.deleteMany({
        where: { siteId: parseInt(sessionId) },
      })
      
      // Then delete the site
      await tx.site.delete({
        where: { id: parseInt(sessionId) },
      })
    })

    return NextResponse.json({
      message: "Installation session deleted successfully"
    })

  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
