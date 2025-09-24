import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { storeInstallationCredentials } from "@/lib/utils/entity-meta/site-settings"

export const runtime = 'nodejs'
export const maxDuration = 300 // 5 minutes in seconds

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const body = await request.json()
    const { domain, adminEmail, adminPassword } = body
    
    const result = await prisma.$transaction(async (tx: any) => {
      const preInstallationStep = await tx.installStep.findFirst({
        where: {
          siteId: siteId,
          stepType: "PRE_INSTALLATION"
        }
      })


      const updatedSite = await tx.site.update({
        where: { id: siteId },
        data: { status: "COMPLETED" },
        include: {
          client: true,
          project: true,
          steps: true
        }
      })

      await tx.installStep.deleteMany({
        where: {
          siteId: siteId,
          stepType: "PRE_INSTALLATION"
        }
      })

      return { updatedSite, preInstallationStep }
    })

    let credentialsToStore = null
    
    if (result.preInstallationStep?.data) {
      try {
        const stepData = typeof result.preInstallationStep.data === 'string' 
          ? JSON.parse(result.preInstallationStep.data) 
          : result.preInstallationStep.data
        
        
        credentialsToStore = {
          domain: stepData.domain || domain || '',
          adminEmail: stepData.adminEmail || adminEmail || '',
          adminPassword: stepData.adminPassword || adminPassword || ''
        }
      } catch (error) {
        credentialsToStore = {
          domain: domain || '',
          adminEmail: adminEmail || '',
          adminPassword: adminPassword || ''
        }
      }
    } else {
      credentialsToStore = {
        domain: domain || '',
        adminEmail: adminEmail || '',
        adminPassword: adminPassword || ''
      }
    }

    if (credentialsToStore.domain && credentialsToStore.adminEmail && credentialsToStore.adminPassword) {
      try {
        await storeInstallationCredentials(siteId, credentialsToStore)
      } catch (error) {
      }
    }

    return NextResponse.json({
      message: "Installation completed successfully",
      site: result.updatedSite
    })

  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
