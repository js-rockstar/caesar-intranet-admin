import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { deleteAllSiteSettings } from "@/lib/utils/entity-meta/site-settings"

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
    const site = await prisma.site.findUnique({
      where: { id: parseInt(id) },
      include: {
        client: {
          include: {
            contacts: true,
            phones: true,
          },
        },
        project: true,
        steps: true,
      },
    })

    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 })
    }

    return NextResponse.json(site)
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
    const siteId = parseInt(id)

    await prisma.$transaction(async (tx: any) => {

      await tx.installStep.deleteMany({
        where: { siteId: siteId },
      })

      await tx.site.delete({
        where: { id: siteId },
      })
    })

    try {
      await deleteAllSiteSettings(siteId)
    } catch (error) {
    }

    return NextResponse.json({ message: "Site deleted successfully" })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
