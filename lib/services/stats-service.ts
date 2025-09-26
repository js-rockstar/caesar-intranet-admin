import { prisma } from "@/lib/prisma"

export interface DashboardStats {
  activeClients: number
  activeSites: number
  activeLicenses: number
  recentSites: Array<{
    id: number
    domain: string
    status: string
    client: {
      id: number
      name: string
    }
    project: {
      name: string
    }
    createdAt: string
  }>
  recentClients: Array<{
    id: number
    name: string
    email: string
    createdAt: string
  }>
}

export interface ClientStats {
  totalClients: number
  activeClients: number
  inactiveClients: number
  activeSites: number
  totalContacts: number
}

export interface SiteStats {
  totalSites: number
  completedSites: number
  inProgressSites: number
  pendingSites: number
}

export class StatsService {
  static async getDashboardStats(): Promise<DashboardStats> {
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

    return {
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
  }

  static async getClientStats(): Promise<ClientStats> {
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

    return {
      totalClients,
      activeClients,
      inactiveClients,
      activeSites,
      totalContacts
    }
  }

  static async getSiteStats(): Promise<SiteStats> {
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

    return {
      totalSites,
      completedSites,
      inProgressSites,
      pendingSites
    }
  }
}
