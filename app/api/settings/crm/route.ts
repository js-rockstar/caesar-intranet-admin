import { type NextRequest, NextResponse } from "next/server"
import { requireAuth, requireAdminAuth, createAuthResponse } from "@/lib/auth-middleware"
import {
  getAllCrmSettings,
  updateCrmSettings,
  validateCrmSettings,
  testCrmConnection,
  isCrmConfigured
} from "@/lib/utils/settings/crm-settings"

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth()

    if ("error" in authResult) {
      return createAuthResponse(authResult)
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
    const authResult = await requireAdminAuth()

    if ("error" in authResult) {
      return createAuthResponse(authResult)
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
    const authResult = await requireAuth()

    if ("error" in authResult) {
      return createAuthResponse(authResult)
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
