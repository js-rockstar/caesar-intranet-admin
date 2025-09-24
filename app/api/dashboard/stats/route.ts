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

    const [
      activeClients,
      activeSites,
      recentSites,
      recentClients,
    ] = await Promise.all([
      prisma.client.count({ where: { active: true } }),
      prisma.site.count({ where: { status: { in: ["PENDING", "IN_PROGRESS", "COMPLETED"] } } }),
      prisma.site.findMany({
        include: {
          client: true,
          project: true,
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.client.findMany({
        where: { active: true },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          name: true,
          createdAt: true,
        },
      }),
    ])

    const stats = {
      activeClients,
      activeSites,
      activeLicenses: 0, // This would need to be calculated based on your business logic
      recentSites: recentSites.map((site) => ({
        id: site.id,
        domain: site.domain,
        status: site.status,
        client: {
          id: site.client.id,
          name: site.client.name,
        },
        project: {
          name: site.project.name,
        },
        createdAt: site.createdAt,
      })),
      recentClients,
    }

    return NextResponse.json(stats)
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
