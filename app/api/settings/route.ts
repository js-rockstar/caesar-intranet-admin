import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import {
  getAllSettings,
  getSettingsGrouped,
  getAllSettingsAsObject,
  updateSettingsFromObject,
  validateSettings
} from "@/lib/utils/settings"

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
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check user role - only admins can update settings
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
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
