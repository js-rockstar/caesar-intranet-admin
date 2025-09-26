import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, createAuthResponse } from '@/lib/auth-middleware'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
    try {
        const authResult = await requireAuth()
        
        if ("error" in authResult) {
            return createAuthResponse(authResult)
        }

        const { id } = await params
        const siteId = parseInt(id)

        if (isNaN(siteId)) {
            return NextResponse.json({ error: 'Invalid site ID' }, { status: 400 })
        }

        const body = await request.json()
        const { status } = body

        if (!status || !['PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED'].includes(status)) {
            return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
        }

        // Update the site status
        const updatedSite = await prisma.site.update({
            where: { id: siteId },
            data: { status },
            select: {
                id: true,
                status: true,
                domain: true
            }
        })


        return NextResponse.json({
            success: true,
            site: updatedSite
        })

    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to update site status' },
            { status: 500 }
        )
    }
}
