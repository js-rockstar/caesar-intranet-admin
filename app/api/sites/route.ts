import { type NextRequest, NextResponse } from "next/server"
import { requireAuth, createAuthResponse } from "@/lib/auth-middleware"
import { prisma } from "@/lib/prisma"
import { siteSchema } from "@/lib/validations/site"

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth()

    if ("error" in authResult) {
      return createAuthResponse(authResult)
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '25')
    const search = searchParams.get('search') || ''
    const statusFilter = searchParams.get('statusFilter') || 'all'
    const clientFilter = searchParams.get('clientFilter') || 'all'
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}

    // Search filter
    if (search) {
      where.OR = [
        { domain: { contains: search, mode: 'insensitive' } },
        { client: { name: { contains: search, mode: 'insensitive' } } },
        { project: { name: { contains: search, mode: 'insensitive' } } },
      ]
    }

    // Status filter
    if (statusFilter !== 'all') {
      where.status = statusFilter
    }

    // Client filter
    if (clientFilter !== 'all') {
      where.clientId = parseInt(clientFilter)
    }

    // Get total count for pagination
    const totalCount = await prisma.site.count({ where })

    // Get sites with pagination
    const sites = await prisma.site.findMany({
      where,
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
        project: true,
        steps: {
          select: {
            id: true,
            status: true,
          },
        },
      },
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    })

    const totalPages = Math.ceil(totalCount / limit)

    return NextResponse.json({
      data: sites,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth()

    if ("error" in authResult) {
      return createAuthResponse(authResult)
    }

    const body = await request.json()
    const validatedData = siteSchema.parse(body)

    const site = await prisma.site.create({
      data: {
        clientId: validatedData.clientId,
        projectId: validatedData.projectId,
        domain: validatedData.domain,
        status: "PENDING",
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
        project: true,
      },
    })

    return NextResponse.json(site, { status: 201 })
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
