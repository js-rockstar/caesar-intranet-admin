import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import https from 'https'

export async function POST(
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
    const body = await request.json()
    const { apiEndpoint, token } = body

    // Validate required fields
    if (!apiEndpoint || !token) {
      return NextResponse.json(
        { error: "Missing required fields: apiEndpoint, token" },
        { status: 400 }
      )
    }

    // Test the installer configuration
    const result = await testInstallerConfiguration(apiEndpoint, token)

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: "Installer configuration test successful",
        data: result.data
      })
    } else {
      return NextResponse.json({
        success: false,
        message: result.message || "Installer configuration test failed"
      }, { status: 400 })
    }
  } catch (error) {
    console.error("Error testing installer configuration:", error)
    return NextResponse.json(
      { 
        success: false,
        message: "Internal server error while testing installer configuration" 
      }, 
      { status: 500 }
    )
  }
}

/**
 * Test installer configuration by making a test API call
 */
async function testInstallerConfiguration(apiEndpoint: string, token: string) {
  try {
    // Validate URL format
    if (!apiEndpoint.startsWith('http://') && !apiEndpoint.startsWith('https://')) {
      return {
        success: false,
        message: "API endpoint must start with http:// or https://"
      }
    }

    // Make a test request to the installer API
    const testUrl = `${apiEndpoint.replace(/\/$/, '')}/test`
    
    // Temporarily disable SSL certificate verification for self-signed certificates
    const originalRejectUnauthorized = process.env.NODE_TLS_REJECT_UNAUTHORIZED
    if (testUrl.startsWith('https:')) {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
    }
    
    let response
    try {
      response = await fetch(testUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Caesar-Intranet/1.0'
        },
        // Add timeout to prevent hanging requests
        signal: AbortSignal.timeout(30000) // 30 second timeout
      })
    } finally {
      // Restore original SSL certificate verification setting
      if (originalRejectUnauthorized !== undefined) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = originalRejectUnauthorized
      } else {
        delete process.env.NODE_TLS_REJECT_UNAUTHORIZED
      }
    }

    // Try to parse the response first
    let responseData
    try {
      responseData = await response.json()
    } catch (parseError) {
      return {
        success: false,
        message: "Installer API returned invalid JSON response"
      }
    }

    // Handle the specific response format
    if (responseData.success === false) {
      // Handle token error specifically
      if (responseData.token_error === true) {
        return {
          success: false,
          message: "Authentication failed: Missing or invalid JWT token"
        }
      }
      
      // Handle other error cases
      return {
        success: false,
        message: responseData.message || "Installer API returned failure status"
      }
    }

    // Check for success response format
    if (responseData.success === true) {
      return {
        success: true,
        message: responseData.result?.message || "Installer configuration test successful",
        data: {
          status: response.status,
          response: responseData
        }
      }
    }

    // If response doesn't match expected format, check HTTP status
    if (!response.ok) {
      return {
        success: false,
        message: `Installer API test failed: HTTP ${response.status}: ${response.statusText}`
      }
    }

    // Fallback for unexpected response format
    return {
      success: false,
      message: "Installer API returned unexpected response format"
    }

  } catch (error) {
    console.error("Installer configuration test error:", error)
    
    // Handle specific error types
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return {
        success: false,
        message: "Unable to connect to installer API. Please check the endpoint URL."
      }
    }
    
    if (error.name === 'AbortError') {
      return {
        success: false,
        message: "Installer API test timed out. Please check the endpoint URL and network connection."
      }
    }

    return {
      success: false,
      message: `Installer configuration test failed: ${error.message}`
    }
  }
}
