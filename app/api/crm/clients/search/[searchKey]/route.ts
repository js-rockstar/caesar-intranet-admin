import { NextRequest, NextResponse } from "next/server"
import { requireAuth, createAuthResponse } from "@/lib/auth-middleware"
import { prisma } from "@/lib/prisma"

// Helper function to decode HTML entities
function decodeHtmlEntities(text: string): string {
  if (!text) return text
  
  // Common HTML entities mapping
  const htmlEntities: { [key: string]: string } = {
    '&#160;': ' ', // non-breaking space
    '&nbsp;': ' ', // non-breaking space
    '&amp;': '&', // ampersand
    '&lt;': '<', // less than
    '&gt;': '>', // greater than
    '&quot;': '"', // double quote
    '&#39;': "'", // single quote
    '&apos;': "'", // apostrophe
  }
  
  let decoded = text
  for (const [entity, replacement] of Object.entries(htmlEntities)) {
    decoded = decoded.replace(new RegExp(entity, 'g'), replacement)
  }
  
  return decoded
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ searchKey: string }> }
) {
  try {
    const authResult = await requireAuth()

    if ("error" in authResult) {
      return createAuthResponse(authResult)
    }

    // Get CRM settings from database
    const crmEndpoint = await prisma.setting.findUnique({
      where: { key: "CENTRAL_CRM_API_ENDPOINT" }
    })
    
    const crmToken = await prisma.setting.findUnique({
      where: { key: "CENTRAL_CRM_TOKEN" }
    })

    if (!crmEndpoint?.value || !crmToken?.value) {
      return NextResponse.json({ 
        error: "CRM configuration not found. Please configure CENTRAL_CRM_API_ENDPOINT and CENTRAL_CRM_TOKEN in settings." 
      }, { status: 400 })
    }

    const { searchKey } = await params

    if (!searchKey || searchKey.trim().length === 0) {
      return NextResponse.json({ 
        error: "Search key is required" 
      }, { status: 400 })
    }

    // Make request to CRM search API
    const crmUrl = `${crmEndpoint.value}clients/search/${encodeURIComponent(searchKey.trim())}`
    
    // Set SSL handling for development mode
    const originalRejectUnauthorized = process.env.NODE_TLS_REJECT_UNAUTHORIZED
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
    
    let crmResponse
    try {
      crmResponse = await fetch(crmUrl, {
        method: "GET",
        headers: {
          "authtoken": crmToken.value,
          "Content-Type": "application/json"
        }
      })
    } finally {
      if (originalRejectUnauthorized !== undefined) {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = originalRejectUnauthorized
      } else {
        delete process.env.NODE_TLS_REJECT_UNAUTHORIZED
      }
    }

    if (!crmResponse.ok) {
      const errorText = await crmResponse.text()
      return NextResponse.json({ 
        error: "Failed to search clients in CRM",
        details: errorText
      }, { status: crmResponse.status })
    }

    const crmData = await crmResponse.json()

    // Check if response has error structure
    if (crmData.status === false) {
      return NextResponse.json({ 
        error: crmData.message || "CRM API returned an error"
      }, { status: 400 })
    }

    // Transform CRM search data to our format
    const clientsData = Array.isArray(crmData) ? crmData : (crmData.data || [])
    const transformedClients = clientsData.map((client: any) => ({
      id: client.id,
      companyName: client.company_name,
      type: client.type,
      address: client.address,
      city: client.city,
      state: client.state,
      zip: client.zip,
      country: client.country,
      createdDate: client.created_date,
      website: client.website,
      phone: client.primary_phone_number,
      primaryContact: client.primary_contact,
      primaryEmail: (() => {
        if (!client.primary_email || client.primary_email.trim() === "") return null
        const decodedEmail = decodeHtmlEntities(client.primary_email)
        // Check if the decoded email is valid, if not return null
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        return emailRegex.test(decodedEmail) ? decodedEmail : null
      })(),
      totalProjects: client.total_projects,
      clientGroups: client.client_groups,
      isImported: false // We'll check this later
    }))

    // Check which clients are already imported
    const existingCrmClientIds = await prisma.client.findMany({
      where: {
        centralCrmClientId: {
          in: transformedClients.map((client: any) => client.id)
        }
      },
      select: { centralCrmClientId: true }
    })

    const importedIds = new Set(existingCrmClientIds.map((c: { centralCrmClientId: string | null }) => c.centralCrmClientId))

    // Mark imported clients
    const clientsWithImportStatus = transformedClients.map((client: any) => ({
      ...client,
      isImported: importedIds.has(client.id)
    }))

    return NextResponse.json({
      clients: clientsWithImportStatus,
      searchKey: searchKey.trim(),
      totalResults: transformedClients.length,
      totalRecords: transformedClients.length
    })

  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('self-signed certificate')) {
        return NextResponse.json({ 
          error: "SSL Certificate Error",
          details: "The CRM server is using a self-signed certificate. Please contact your system administrator."
        }, { status: 500 })
      }
      
      if (error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
        return NextResponse.json({ 
          error: "Connection Error",
          details: "Unable to connect to the CRM server. Please check the API endpoint configuration."
        }, { status: 500 })
      }
    }
    
    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
