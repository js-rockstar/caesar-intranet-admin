import { type NextRequest, NextResponse } from "next/server"
import { requireAuth, requireAdminAuth, createAuthResponse } from "@/lib/auth-middleware"
import { prisma } from "@/lib/prisma"
import { deleteAllSiteSettings } from "@/lib/utils/entity-meta/site-settings"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireAuth()

    if ("error" in authResult) {
      return createAuthResponse(authResult)
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
    const authResult = await requireAdminAuth()

    if ("error" in authResult) {
      return createAuthResponse(authResult)
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
