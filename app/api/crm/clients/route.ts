import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
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
import https from "https"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "ADMIN" && session.user.role !== "STAFF") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
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

    // Get pagination parameters
    const { searchParams } = new URL(request.url)
    const offset = parseInt(searchParams.get("offset") || "0", 10)
    const limit = parseInt(searchParams.get("limit") || "25", 10)

    // Make request to CRM API
    const crmUrl = `${crmEndpoint.value}clients?offset=${offset}&limit=${limit}`
    
    // Create a custom fetch function that handles SSL certificates
    const customFetch = async (url: string, options: RequestInit) => {
      // For development, temporarily disable SSL verification
      const originalRejectUnauthorized = process.env.NODE_TLS_REJECT_UNAUTHORIZED
      if (process.env.NODE_ENV === 'development') {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
      }
      
      try {
        const response = await fetch(url, options)
        return response
      } finally {
        // Restore original setting
        if (originalRejectUnauthorized !== undefined) {
          process.env.NODE_TLS_REJECT_UNAUTHORIZED = originalRejectUnauthorized
        } else {
          delete process.env.NODE_TLS_REJECT_UNAUTHORIZED
        }
      }
    }
    
    const crmResponse = await customFetch(crmUrl, {
      method: "GET",
      headers: {
        "authtoken": crmToken.value,
        "Content-Type": "application/json"
      }
    })

    if (!crmResponse.ok) {
      const errorText = await crmResponse.text()
      return NextResponse.json({ 
        error: "Failed to fetch clients from CRM",
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

    // Transform CRM data to our format
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
      totalRecords: parseInt(crmData.recordsTotal || "0", 10),
      filteredRecords: parseInt(crmData.recordsFiltered || "0", 10),
      offset,
      limit
    })

  } catch (error) {
    
    // Provide more specific error messages for common issues
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
