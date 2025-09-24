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
