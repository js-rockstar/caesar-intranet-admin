import { type NextRequest, NextResponse } from "next/server"
import { requireAuth, requireAdminAuth, createAuthResponse } from "@/lib/auth-middleware"
import {
  getAllSettings,
  getSettingsGrouped,
  getAllSettingsAsObject,
  updateSettingsFromObject,
  validateSettings
} from "@/lib/utils/settings"

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth()

    if ("error" in authResult) {
      return createAuthResponse(authResult)
    }

    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'grouped' // 'grouped', 'flat', 'object'

    let responseData: any

    switch (format) {
      case 'flat':
        responseData = await getAllSettings()
        break
      case 'object':
        responseData = await getAllSettingsAsObject()
        break
      case 'grouped':
      default:
        responseData = await getSettingsGrouped()
        break
    }

    return NextResponse.json({
      format,
      settings: responseData
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
    const { settings, group } = body

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json({ error: "Invalid settings data" }, { status: 400 })
    }

    // Update the settings
    const success = await updateSettingsFromObject(settings, group)

    if (!success) {
      return NextResponse.json({ error: "Failed to update settings" }, { status: 500 })
    }

    // Get updated settings
    const updatedSettings = group 
      ? await getSettingsGrouped()
      : await getAllSettingsAsObject()

    return NextResponse.json({
      message: "Settings updated successfully",
      settings: updatedSettings
    })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
