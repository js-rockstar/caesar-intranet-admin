import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  getAllProjectSettings,
  updateProjectSettings,
  resetProjectSettings,
  validateProjectSettings,
  type ProjectSettings
} from "@/lib/utils/entity-meta/project-settings"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check user role
    if (session.user.role !== "ADMIN" && session.user.role !== "STAFF") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const projectId = parseInt(id)

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, name: true, key: true }
    })

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // Get all project settings
    const flatSettings = await getAllProjectSettings(projectId)
    const validation = await validateProjectSettings(projectId)

    // Transform flat settings to nested structure expected by frontend
    const settings = {
      cpanel: {
        domain: flatSettings.cpanelDomain || '',
        username: flatSettings.cpanelUsername || '',
        apiToken: flatSettings.cpanelApiToken || '',
        subdomainDirPath: flatSettings.cpanelSubdomainDirPath || ''
      },
      cloudflare: {
        username: flatSettings.cloudflareUsername || '',
        apiKey: flatSettings.cloudflareApiKey || '',
        zoneId: flatSettings.cloudflareZoneId || '',
        aRecordIp: flatSettings.cloudflareARecordIp || ''
      },
      installer: {
        apiEndpoint: flatSettings.installerApiEndpoint || '',
        token: flatSettings.installerToken || ''
      }
    }

    return NextResponse.json({
      project: {
        id: project.id,
        name: project.name,
        key: project.key
      },
      settings,
      validation
    })
  } catch (error) {
    console.error("Error fetching project settings:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check user role
    if (session.user.role !== "ADMIN" && session.user.role !== "STAFF") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const projectId = parseInt(id)
    const body = await request.json()
    
    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, name: true, key: true }
    })

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // Validate the settings data - handle nested object structure
    const settings: Partial<ProjectSettings> = {}
    
    // Handle cpanel settings
    if (body.cpanel) {
      if (body.cpanel.domain !== undefined) settings.cpanelDomain = body.cpanel.domain
      if (body.cpanel.username !== undefined) settings.cpanelUsername = body.cpanel.username
      if (body.cpanel.apiToken !== undefined) settings.cpanelApiToken = body.cpanel.apiToken
      if (body.cpanel.subdomainDirPath !== undefined) settings.cpanelSubdomainDirPath = body.cpanel.subdomainDirPath
    }
    
    // Handle cloudflare settings
    if (body.cloudflare) {
      if (body.cloudflare.username !== undefined) settings.cloudflareUsername = body.cloudflare.username
      if (body.cloudflare.apiKey !== undefined) settings.cloudflareApiKey = body.cloudflare.apiKey
      if (body.cloudflare.zoneId !== undefined) settings.cloudflareZoneId = body.cloudflare.zoneId
      if (body.cloudflare.aRecordIp !== undefined) settings.cloudflareARecordIp = body.cloudflare.aRecordIp
    }
    
    // Handle installer settings
    if (body.installer) {
      if (body.installer.apiEndpoint !== undefined) settings.installerApiEndpoint = body.installer.apiEndpoint
      if (body.installer.token !== undefined) settings.installerToken = body.installer.token
    }

    // Update the settings
    const success = await updateProjectSettings(projectId, settings)

    if (!success) {
      return NextResponse.json({ error: "Failed to update settings" }, { status: 500 })
    }

    // Get updated settings and validation
    const updatedSettings = await getAllProjectSettings(projectId)
    const validation = await validateProjectSettings(projectId)

    return NextResponse.json({
      message: "Settings updated successfully",
      project: {
        id: project.id,
        name: project.name,
        key: project.key
      },
      settings: updatedSettings,
      validation
    })
  } catch (error) {
    console.error("Error updating project settings:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check user role - only admins can reset settings
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const projectId = parseInt(id)

    // Verify project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, name: true, key: true }
    })

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 })
    }

    // Reset project settings
    const success = await resetProjectSettings(projectId)

    if (!success) {
      return NextResponse.json({ error: "Failed to reset settings" }, { status: 500 })
    }

    return NextResponse.json({
      message: "Settings reset successfully",
      project: {
        id: project.id,
        name: project.name,
        key: project.key
      }
    })
  } catch (error) {
    console.error("Error resetting project settings:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
