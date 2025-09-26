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
    const credentials = await prisma.entityMeta.findFirst({
      where: {
        relId: siteId,
        relType: 'site',
        name: 'PROJECT_SETUP_ADMIN_CREDENTIALS'
      }
    })

    if (!credentials) {
      return NextResponse.json({ error: "No credentials found for this site" }, { status: 404 })
    }

    try {
      const credentialsData = JSON.parse(credentials.value)
      return NextResponse.json(credentialsData)
    } catch (error) {
      return NextResponse.json({ error: "Invalid credentials format" }, { status: 500 })
    }

  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
