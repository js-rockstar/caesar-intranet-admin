import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

        console.log(`Site ${siteId} status updated to ${status}`)

        return NextResponse.json({
            success: true,
            site: updatedSite
        })

    } catch (error) {
        console.error('Error updating site status:', error)
        return NextResponse.json(
            { error: 'Failed to update site status' },
            { status: 500 }
        )
    }
}
