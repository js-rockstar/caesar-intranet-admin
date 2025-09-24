import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { installationSchema } from "@/lib/validations/site"

// Configure runtime for longer timeout (5 minutes)
export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes in seconds

// Constants
const AUTHORIZED_ROLES = ["ADMIN", "STAFF"] as const
const DEFAULT_INSTALLATION_STEPS = [
  { stepType: "DB_CREATION", status: "PENDING" },
  { stepType: "CPANEL_ENTRY", status: "PENDING" },
  { stepType: "CLOUDFLARE_ENTRY", status: "PENDING" },
  { stepType: "DIRECTORY_SETUP", status: "PENDING" },
] as const

// Types
interface ValidationData {
  sessionId?: string
  clientId: string
  projectId: string
  domain: string
}

interface SiteWithSteps {
  id: number
  steps: Array<{
    stepType: string
    status: string
  }>
}

// Helper functions
function validateUserAuthorization(session: any): void {
  if (!session?.user) {
    throw new Error("User not authenticated")
  }

  if (!AUTHORIZED_ROLES.includes(session.user.role)) {
    throw new Error("User not authorized for this operation")
  }
}

function shouldResetSteps(existingSite: SiteWithSteps): boolean {
  const hasSuccessfulSteps = existingSite.steps.some(
    step => step.status === "SUCCESS"
  )
  const hasInProgressSteps = existingSite.steps.some(
    step => step.status === "IN_PROGRESS"
  )
  
  return !hasSuccessfulSteps && !hasInProgressSteps
}

function getStepsToCreate(existingStepTypes: string[]) {
  return DEFAULT_INSTALLATION_STEPS.filter(
    step => !existingStepTypes.includes(step.stepType)
  )
}

async function resetExistingSteps(tx: any, siteId: number): Promise<void> {
  const updateResult = await tx.installStep.updateMany({
    where: { 
      siteId,
      stepType: { not: "PRE_INSTALLATION" },
      status: { not: "SUCCESS" }
    },
    data: {
      status: "PENDING",
      errorMsg: null,
      updatedAt: new Date()
    }
  })
  
}

async function createMissingSteps(tx: any, siteId: number, newSteps: any[]): Promise<void> {
  if (newSteps.length > 0) {
    await tx.installStep.createMany({
      data: newSteps.map(step => ({
        ...step,
        siteId,
      })),
    })
  }
}

async function handleSessionSite(tx: any, validatedData: ValidationData) {
  const sessionId = parseInt(validatedData.sessionId!)
  
  // Get existing site with steps
  const existingSite = await tx.site.findUnique({
    where: { id: sessionId },
    include: { steps: true }
  })
  
  if (!existingSite) {
    throw new Error("Session site not found")
  }
  
  // Update the existing temporary site
  const site = await tx.site.update({
    where: { id: sessionId },
    data: {
      clientId: parseInt(validatedData.clientId),
      projectId: parseInt(validatedData.projectId),
      domain: validatedData.domain,
      status: "IN_PROGRESS",
    },
  })
  
  // Reset installation steps (excluding PRE_INSTALLATION and SUCCESS steps)
  await tx.installStep.updateMany({
    where: { 
      siteId: site.id,
      stepType: { not: "PRE_INSTALLATION" },
      status: { not: "SUCCESS" }
    },
    data: {
      status: "PENDING",
      errorMsg: null,
      updatedAt: new Date()
    }
  })
  
  // Create missing steps
  const existingStepTypes = existingSite.steps
    .filter(step => step.stepType !== "PRE_INSTALLATION")
    .map(step => step.stepType)
  
  const newSteps = getStepsToCreate(existingStepTypes)
  await createMissingSteps(tx, site.id, newSteps)
  
  return site
}

async function handleExistingSite(tx: any, existingSite: SiteWithSteps) {
    const steps = existingSite.steps.map(step => ({
      stepType: step.stepType,
      status: step.status
    }))
  
  if (shouldResetSteps(existingSite)) {
    await resetExistingSteps(tx, existingSite.id)
  } else {
  }
  
  // Create missing steps
  const existingStepTypes = existingSite.steps.map(step => step.stepType)
  const newSteps = getStepsToCreate(existingStepTypes)
  await createMissingSteps(tx, existingSite.id, newSteps)
  
  return existingSite
}

async function createNewSite(tx: any, validatedData: ValidationData) {
  // Create new site
  const site = await tx.site.create({
    data: {
      clientId: parseInt(validatedData.clientId),
      projectId: parseInt(validatedData.projectId),
      domain: validatedData.domain,
      status: "IN_PROGRESS",
    },
  })
  
  // Create all default installation steps
  await tx.installStep.createMany({
    data: DEFAULT_INSTALLATION_STEPS.map(step => ({
      ...step,
      siteId: site.id,
    })),
  })
  
  return site
}

async function getSiteWithRelations(tx: any, siteId: number) {
  return await tx.site.findUnique({
    where: { id: siteId },
    include: {
      client: {
        select: {
          id: true,
          name: true,
        },
      },
      project: true,
      steps: true,
    },
  })
}

export async function POST(request: NextRequest) {
  try {
    // Authentication and authorization
    const session = await getServerSession(authOptions)
    validateUserAuthorization(session)
    
    // Input validation
    const body = await request.json()
    const validatedData = installationSchema.parse(body)
    
    // Create installation with steps in a transaction
    const installation = await prisma.$transaction(async (tx: any) => {
      let site: any
      
      if (validatedData.sessionId) {
        // Handle existing session site
        site = await handleSessionSite(tx, validatedData)
      } else {
        // Check if site with this domain already exists
        const existingSite = await tx.site.findFirst({
          where: { domain: validatedData.domain },
          include: { steps: true }
        })
        
        if (existingSite) {
          // Handle existing site
          site = await handleExistingSite(tx, existingSite)
        } else {
          // Create new site
          site = await createNewSite(tx, validatedData)
        }
      }
      
      // Return site with full relations
      return await getSiteWithRelations(tx, site.id)
    })
    
    return NextResponse.json(installation, { status: 201 })
    
  } catch (error) {
    
    if (error instanceof Error) {
      const statusCode = error.message.includes("not authenticated") || 
                        error.message.includes("not authorized") ? 401 : 400
      return NextResponse.json({ error: error.message }, { status: statusCode })
    }
    
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
