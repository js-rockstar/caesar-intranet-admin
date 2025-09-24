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
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check user role - only ADMIN can delete
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
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
