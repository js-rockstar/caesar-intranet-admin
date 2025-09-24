import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createInstallationService } from "@/lib/services/installation"
import { getAllProjectSettings } from "@/lib/utils/entity-meta/project-settings"
import { z } from "zod"

const startStepSchema = z.object({
  stepType: z.enum(["CPANEL_ENTRY", "CLOUDFLARE_ENTRY", "DIRECTORY_SETUP", "DB_CREATION"])
})

// Configure runtime for longer timeout (5 minutes)
export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes in seconds

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let body: any = null
  
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
    body = await request.json()
    
    const validatedData = startStepSchema.parse(body)
    const { stepType } = validatedData
    const existingStep = await prisma.installStep.findFirst({
      where: {
        siteId: siteId,
        stepType: stepType
      },
      include: {
        site: {
          include: {
            project: true,
            client: {
              include: {
                contacts: true
              }
            }
          }
        }
      }
    })

    if (!existingStep) {
      return NextResponse.json({ error: "Step not found" }, { status: 404 })
    }

    if (!existingStep.site?.project?.id) {
      return NextResponse.json({ error: "Project not found for this installation" }, { status: 404 })
    }
    if (existingStep.status === "IN_PROGRESS") {
      return NextResponse.json({ 
        error: "Step is already in progress",
        step: existingStep 
      }, { status: 409 })
    }
    if (existingStep.status === "SUCCESS") {
      return NextResponse.json({ 
        error: "Step is already completed",
        step: existingStep 
      }, { status: 409 })
    }
    const updatedStep = await prisma.installStep.update({
      where: { id: existingStep.id },
      data: {
        status: "IN_PROGRESS",
        errorMsg: null, // Clear any previous error messages
        updatedAt: new Date()
      }
    })
    const projectId = existingStep.site.project.id
    startInstallationProcess(siteId, stepType, existingStep.id, projectId, existingStep.site)

    return NextResponse.json({
      success: true,
      message: `${stepType} process started`,
      step: updatedStep
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: "Invalid request data",
        details: error.errors,
        received: body
      }, { status: 400 })
    }

    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Async function to handle the actual installation process
async function startInstallationProcess(siteId: number, stepType: string, stepId: number, projectId: number, site: any) {
  try {
    const projectSettings = await getAllProjectSettings(projectId)
    const preInstallationStep = await prisma.installStep.findFirst({
      where: {
        siteId: siteId,
        stepType: 'PRE_INSTALLATION'
      },
      select: { stepData: true }
    })
    const stepData = await prisma.installStep.findUnique({
      where: { id: stepId },
      select: { stepData: true }
    })
    const preInstallationConfig = preInstallationStep?.stepData 
      ? (typeof preInstallationStep.stepData === 'string' 
          ? JSON.parse(preInstallationStep.stepData) 
          : preInstallationStep.stepData)
      : {}
    const currentStepConfig = stepData?.stepData 
      ? (typeof stepData.stepData === 'string' 
          ? JSON.parse(stepData.stepData) 
          : stepData.stepData)
      : {}
    const config = { ...preInstallationConfig, ...currentStepConfig }
    const installationService = createInstallationService(projectId)
    let subdomain = config.subdomain || site.subdomain
    let domain = config.domain || site.domain
    let fullDomain = config.fullDomain || site.fullDomain
    if (domain && !subdomain) {
      const domainParts = domain.split('.')
      if (domainParts.length > 2) {
        subdomain = domainParts[0]
        domain = domainParts.slice(1).join('.')
        fullDomain = `${subdomain}.${domain}`
      } else {
        subdomain = 'www' // or some other default
        fullDomain = `${subdomain}.${domain}`
      }
    } else if (subdomain && domain && !fullDomain) {
      fullDomain = `${subdomain}.${domain}`
    }
    const installationConfig = {
      projectId: projectId,
      subdomain: subdomain,
      domain: domain,
      fullDomain: fullDomain,
      clientId: site.clientId,
      clientName: site.client?.name || '',
      adminEmail: config.adminEmail || '',
      adminPassword: config.adminPassword || '',
      installerEndpoint: config.installerEndpoint || projectSettings.installerApiEndpoint || '',
      installerToken: config.installerToken || projectSettings.installerToken || '',
      ...config // Include any additional configuration
    }

    let result: any = { success: false, message: "Unknown step type" }
    switch (stepType) {
      case "CPANEL_ENTRY":
        result = await installationService.createSubdomain(installationConfig)
        break
      
      case "CLOUDFLARE_ENTRY":
        result = await installationService.addDnsRecord(installationConfig)
        break
      
      case "DIRECTORY_SETUP":
        result = await installationService.setupDirectory(installationConfig)
        break
      
      case "DB_CREATION":
        result = await installationService.setupDatabase(installationConfig)
        break
      
      default:
        result = {
          success: false,
          message: `Unknown step type: ${stepType}`,
          error: "Invalid step type"
        }
    }
    await prisma.installStep.update({
      where: { id: stepId },
      data: {
        status: result.success ? "SUCCESS" : "FAILED",
        errorMsg: result.error || null,
        updatedAt: new Date()
      }
    })
    if (stepType === "DIRECTORY_SETUP" && result.success && result.data?.siteId) {
      await prisma.site.update({
        where: { id: siteId },
        data: {
          installerSiteId: result.data.siteId.toString(),
          updatedAt: new Date()
        }
      })
    }
    if (stepType === "DB_CREATION" && result.success) {
      await prisma.site.update({
        where: { id: siteId },
        data: {
          status: "COMPLETED",
          updatedAt: new Date()
        }
      })
    }

  } catch (error) {
    try {
      await prisma.installStep.update({
        where: { id: stepId },
        data: {
          status: "FAILED",
          errorMsg: error instanceof Error ? error.message : "Unknown error during installation process",
          updatedAt: new Date()
        }
      })
    } catch (updateError) {
    }
  }
}
