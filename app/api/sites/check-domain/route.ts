import { type NextRequest, NextResponse } from "next/server"
import { requireAuth, createAuthResponse } from "@/lib/auth-middleware"
import { prisma } from "@/lib/prisma"
import { z } from "zod"

const checkDomainSchema = z.object({
  domain: z.string().min(1, "Domain is required"),
  excludeSiteId: z.number().optional(), // For editing existing sites
})

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth()

    if ("error" in authResult) {
      return createAuthResponse(authResult)
    }

    const body = await request.json()
    const validatedData = checkDomainSchema.parse(body)
    

    // Check if domain already exists
    const existingSite = await prisma.site.findFirst({
      where: {
        domain: validatedData.domain,
        ...(validatedData.excludeSiteId && {
          id: { not: validatedData.excludeSiteId }
        })
      },
      include: {
        client: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    if (existingSite) {
      return NextResponse.json({
        available: false,
        message: `Domain is already in use by ${existingSite.client?.name || 'another client'}`,
        existingSite: {
          id: existingSite.id,
          domain: existingSite.domain,
          client: existingSite.client
        }
      })
    }

    return NextResponse.json({
      available: true,
      message: "Domain is available"
    })

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
