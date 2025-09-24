import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import {
  getAllCrmSettings,
  updateCrmSettings,
  validateCrmSettings,
  testCrmConnection,
  isCrmConfigured
} from "@/lib/utils/settings/crm-settings"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check user role
    if (session.user.role !== "ADMIN" && session.user.role !== "STAFF") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const testConnection = searchParams.get('test') === 'true'

    // Get CRM settings
    const settings = await getAllCrmSettings()
    const validation = await validateCrmSettings()
    const isConfigured = await isCrmConfigured()

    let connectionTest = null
    if (testConnection && isConfigured) {
      connectionTest = await testCrmConnection()
    }

    return NextResponse.json({
      settings,
      validation,
      isConfigured,
      connectionTest
    })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check user role - only admins can update CRM settings
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { apiEndpoint, token } = body

    // Validate input
    if (apiEndpoint !== undefined && typeof apiEndpoint !== 'string') {
      return NextResponse.json({ error: "Invalid API endpoint" }, { status: 400 })
    }
    if (token !== undefined && typeof token !== 'string') {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 })
    }

    // Update CRM settings
    const success = await updateCrmSettings({
      apiEndpoint,
      token
    })

    if (!success) {
      return NextResponse.json({ error: "Failed to update CRM settings" }, { status: 500 })
    }

    // Get updated settings and validation
    const updatedSettings = await getAllCrmSettings()
    const validation = await validateCrmSettings()
    const isConfigured = await isCrmConfigured()

    return NextResponse.json({
      message: "CRM settings updated successfully",
      settings: updatedSettings,
      validation,
      isConfigured
    })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check user role
    if (session.user.role !== "ADMIN" && session.user.role !== "STAFF") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { action } = body

    if (action === 'test-connection') {
      const isConfigured = await isCrmConfigured()
      
      if (!isConfigured) {
        return NextResponse.json({ 
          error: "CRM is not properly configured" 
        }, { status: 400 })
      }

      const connectionTest = await testCrmConnection()
      
      return NextResponse.json({
        message: "Connection test completed",
        result: connectionTest
      })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
