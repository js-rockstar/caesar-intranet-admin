import { type NextRequest, NextResponse } from "next/server"
import { requireAuth, createAuthResponse } from "@/lib/auth-middleware"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth()

    if ("error" in authResult) {
      return createAuthResponse(authResult)
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
    
    // Set SSL handling for development mode (always disable SSL verification)
    const originalRejectUnauthorized = process.env.NODE_TLS_REJECT_UNAUTHORIZED
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
    
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
    
    // Handle specific error types
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return {
        success: false,
        message: "Unable to connect to installer API. Please check the endpoint URL and ensure the server is running."
      }
    }
    
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        success: false,
        message: "Installer API test timed out. Please check the endpoint URL and network connection."
      }
    }

    // Handle connection refused errors
    if (error instanceof Error && (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND'))) {
      return {
        success: false,
        message: "Cannot connect to installer API server. Please verify the endpoint URL is correct and the server is accessible."
      }
    }

    return {
      success: false,
      message: `Installer configuration test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}
