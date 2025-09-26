import { type NextRequest, NextResponse } from "next/server"
import { requireAuth, createAuthResponse } from "@/lib/auth-middleware"
import { testCrmConnection } from "@/lib/utils/settings/crm-settings"

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth()
    
    if ("error" in authResult) {
      return createAuthResponse(authResult)
    }

    const body = await request.json()
    const { apiEndpoint, token } = body

    // Validate required fields
    if (!apiEndpoint || !token) {
      return NextResponse.json(
        { error: "Missing required fields: apiEndpoint, token" },
        { status: 400 }
      )
    }

    // Test the CRM connection
    const result = await testCrmConnection(apiEndpoint, token)

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: "CRM connection successful",
        data: result.data
      })
    } else {
      return NextResponse.json({
        success: false,
        message: result.message || "CRM connection failed"
      }, { status: 400 })
    }
  } catch (error) {
    return NextResponse.json(
      { 
        success: false,
        message: "Internal server error while testing CRM connection" 
      }, 
      { status: 500 }
    )
  }
}
