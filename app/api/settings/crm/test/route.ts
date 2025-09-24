import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { testCrmConnection } from "@/lib/utils/settings/crm-settings"

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
