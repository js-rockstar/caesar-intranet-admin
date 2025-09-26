import { type NextRequest, NextResponse } from "next/server"
import { requireAuth, requireAdminAuth, createAuthResponse } from "@/lib/auth-middleware"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireAuth()

    if ("error" in authResult) {
      return createAuthResponse(authResult)
    }

    const { id } = await params
    const installation = await prisma.site.findUnique({
      where: { id: parseInt(id) },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            type: true,
            address: true,
            apartment: true,
            city: true,
            state: true,
            zipCode: true,
            country: true,
            active: true,
            centralCrmClientId: true,
            lastSyncedAt: true,
            createdAt: true,
            updatedAt: true,
          }
        },
        project: true,
        steps: {
          orderBy: { stepOrder: "asc" },
        },
      },
    })

    if (!installation) {
      return NextResponse.json({ error: "Installation not found" }, { status: 404 })
    }

    return NextResponse.json(installation)
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireAdminAuth()

    if ("error" in authResult) {
      return createAuthResponse(authResult)
    }

    const { id } = await params
    await prisma.site.delete({
      where: { id: parseInt(id) },
    })

    return NextResponse.json({ message: "Installation deleted successfully" })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
