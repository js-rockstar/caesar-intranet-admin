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

    // Get site statistics
    const [
      totalSites,
      completedSites,
      inProgressSites,
      pendingSites
    ] = await Promise.all([
      prisma.site.count(),
      prisma.site.count({ where: { status: "COMPLETED" } }),
      prisma.site.count({ where: { status: "IN_PROGRESS" } }),
      prisma.site.count({ where: { status: "PENDING" } })
    ])

    return NextResponse.json({
      totalSites,
      completedSites,
      inProgressSites,
      pendingSites
    })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
