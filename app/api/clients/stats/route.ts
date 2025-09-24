import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check user role
    if (session.user.role !== "ADMIN" && session.user.role !== "STAFF") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get client statistics
    const [
      totalClients,
      activeClients,
      inactiveClients,
      activeSites,
      totalContacts
    ] = await Promise.all([
      prisma.client.count(),
      prisma.client.count({ where: { active: true } }),
      prisma.client.count({ where: { active: false } }),
      prisma.site.count({
        where: {
          client: { active: true },
          status: { in: ["PENDING", "IN_PROGRESS", "COMPLETED"] }
        }
      }),
      prisma.contact.count({
        where: { client: { active: true } }
      })
    ])

    return NextResponse.json({
      totalClients,
      activeClients,
      inactiveClients,
      activeSites,
      totalContacts
    })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
