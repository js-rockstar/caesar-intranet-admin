import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { z } from "zod"
import { formatPhoneNumber, isValidPhoneNumber } from "@/lib/utils/phone"

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

// Helper function to make CRM API requests
async function makeCrmRequest(endpoint: string, crmEndpoint: string, crmToken: string) {
  const url = `${crmEndpoint}${endpoint}`
  
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
  
  const response = await customFetch(url, {
    method: "GET",
    headers: {
      "authtoken": crmToken,
      "Content-Type": "application/json"
    }
  })

  if (!response.ok) {
    if (response.status === 404) {
      return null // No data found
    }
    const errorText = await response.text()
    throw new Error(`CRM API Error: ${errorText}`)
  }

  return await response.json()
}

// Helper function to fetch contacts from CRM
async function fetchContactsFromCrm(centralCrmClientId: string, crmEndpoint: string, crmToken: string) {
  try {
    const contactsData = await makeCrmRequest(`clients/${centralCrmClientId}/userList`, crmEndpoint, crmToken)
    
    if (!contactsData || !Array.isArray(contactsData)) {
      return []
    }

    return contactsData.map((contact: any) => ({
      centralCrmContactId: contact.id,
      firstName: contact.first_name || '',
      lastName: contact.last_name || '',
      email: (() => {
        if (!contact.email || contact.email.trim() === "") return null
        const decodedEmail = decodeHtmlEntities(contact.email)
        // Check if the decoded email is valid, if not return null
        const emailValidation = z.string().email().safeParse(decodedEmail)
        return emailValidation.success ? decodedEmail : null
      })(),
      gender: contact.gender && contact.gender.trim() !== "" ? contact.gender : null,
      language: contact.language && contact.language.trim() !== "" ? contact.language : null, // Store null if empty
      isPrimary: contact.is_primary_contact === "1" || contact.is_primary_contact === 1,
      lastSyncedAt: new Date()
    }))
  } catch (error) {
    return []
  }
}

// Helper function to fetch phone numbers from CRM
async function fetchPhoneNumbersFromCrm(centralCrmContactId: string, crmEndpoint: string, crmToken: string) {
  try {
    const phoneData = await makeCrmRequest(`clients/user/${centralCrmContactId}/phoneList`, crmEndpoint, crmToken)
    
    if (!phoneData || !Array.isArray(phoneData)) {
      return []
    }

    return phoneData.map((phone: any) => ({
      type: phone.phone_type === "Phone" ? "PHONE" :
            phone.phone_type === "Business" ? "BUSINESS" :
            phone.phone_type === "Work" ? "WORK" :
            phone.phone_type === "Home" ? "HOME" :
            phone.phone_type === "Cell_phone" ? "MOBILE" :
            "PHONE", // Default fallback
      number: phone.phone_no || '',
      isPrimary: phone.is_primary === "1" || phone.is_primary === 1,
      isVerified: phone.is_verified === "1" || phone.is_verified === 1
    }))
  } catch (error) {
    return []
  }
}

// Helper function to parse names and generate first/last names
function parseName(fullName: string, fallbackCompanyName?: string): { firstName: string; lastName: string } {
  const name = fullName.trim()
  
  if (!name) {
    // If no name provided, use company name or defaults
    if (fallbackCompanyName) {
      const companyParts = fallbackCompanyName.trim().split(' ')
      return {
        firstName: companyParts[0] || 'Company',
        lastName: companyParts.slice(1).join(' ') || 'Contact'
      }
    }
    return { firstName: 'Unknown', lastName: 'Contact' }
  }

  const nameParts = name.split(' ').filter(part => part.length > 0)
  
  if (nameParts.length === 1) {
    // Single name - use as first name, generate last name
    return {
      firstName: nameParts[0],
      lastName: fallbackCompanyName ? fallbackCompanyName.split(' ')[0] + ' Contact' : 'Contact'
    }
  } else if (nameParts.length === 2) {
    // Two names - first and last
    return {
      firstName: nameParts[0],
      lastName: nameParts[1]
    }
  } else {
    // Multiple names - first name is first part, rest is last name
    return {
      firstName: nameParts[0],
      lastName: nameParts.slice(1).join(' ')
    }
  }
}

const importClientSchema = z.object({
  crmClientId: z.string(),
  companyName: z.string(),
  type: z.string(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  zip: z.string().nullable().optional(),
  country: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  primaryContact: z.string().nullable().optional(),
  primaryEmail: z.string().nullable().optional().transform((email) => {
    if (!email || email === "" || email.trim() === "") return null
    const decodedEmail = decodeHtmlEntities(email)
    // Check if the decoded email is valid, if not return null
    const emailValidation = z.string().email().safeParse(decodedEmail)
    return emailValidation.success ? decodedEmail : null
  }),
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (session.user.role !== "ADMIN" && session.user.role !== "STAFF") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    
    const validatedData = importClientSchema.parse(body)

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

    // Check if client with this CRM ID is already imported
    const existingClient = await prisma.client.findUnique({
      where: { centralCrmClientId: validatedData.crmClientId }
    })

    if (existingClient) {
      return NextResponse.json({ 
        error: "Client with this CRM ID is already imported" 
      }, { status: 400 })
    }


    const client = await prisma.client.create({
      data: {
        name: validatedData.companyName,
        type: validatedData.type === "organization" ? "ORGANIZATION" : "PERSON",
        address: validatedData.address && validatedData.address.trim() !== "" ? validatedData.address : null,
        city: validatedData.city && validatedData.city.trim() !== "" ? validatedData.city : null,
        state: validatedData.state && validatedData.state.trim() !== "" ? validatedData.state : null,
        zipCode: validatedData.zip && validatedData.zip.trim() !== "" ? validatedData.zip : null,
        country: validatedData.country && validatedData.country.trim() !== "" ? validatedData.country : null,
        centralCrmClientId: validatedData.crmClientId,
        lastSyncedAt: new Date(),
        active: true
      }
    })


    // Fetch and import contacts from CRM
    const crmContacts = await fetchContactsFromCrm(validatedData.crmClientId, crmEndpoint.value, crmToken.value)

    const importedContacts = []
    for (const crmContact of crmContacts) {
      try {
        // Only create contact if we have valid first and last names
        if (crmContact.firstName && crmContact.firstName.trim() !== "" && 
            crmContact.lastName && crmContact.lastName.trim() !== "") {
          
          // Use the contact email (could be null if invalid or empty)
          const contactEmail = crmContact.email

          const contact = await prisma.contact.create({
            data: {
              clientId: client.id,
              firstName: crmContact.firstName,
              lastName: crmContact.lastName,
              email: contactEmail,
              gender: crmContact.gender,
              language: crmContact.language,
              isPrimary: crmContact.isPrimary,
              centralCrmContactId: crmContact.centralCrmContactId,
              lastSyncedAt: crmContact.lastSyncedAt
            }
          })
          importedContacts.push(contact)

          // Fetch and import phone numbers for this contact
          const crmPhones = await fetchPhoneNumbersFromCrm(crmContact.centralCrmContactId, crmEndpoint.value, crmToken.value)

          // Only create phone numbers if they have valid numbers
          for (const crmPhone of crmPhones) {
            if (crmPhone.number && crmPhone.number.trim() !== "" && isValidPhoneNumber(crmPhone.number)) {
              try {
                // Format the phone number before inserting
                const formattedNumber = formatPhoneNumber(crmPhone.number)
                
                const phone = await prisma.phoneNumber.create({
                  data: {
                    clientId: client.id,
                    contactId: contact.id,
                    type: crmPhone.type,
                    number: formattedNumber,
                    isPrimary: crmPhone.isPrimary,
                    isVerified: crmPhone.isVerified
                  }
                })
              } catch (phoneError) {
              }
            } else {
            }
          }
        } else {
        }
      } catch (contactError) {
      }
    }

    // If no contacts were imported from CRM, create a default contact
    if (importedContacts.length === 0) {
      const { firstName, lastName } = parseName(
        validatedData.primaryContact || '', 
        validatedData.companyName
      )


      await prisma.contact.create({
        data: {
          clientId: client.id,
          firstName: firstName,
          lastName: lastName,
          email: validatedData.primaryEmail, // This will be null if invalid
          isPrimary: true,
          lastSyncedAt: new Date()
        }
      })
    }

    // Note: Phone numbers are only imported from separate API requests for each contact
    // We do not use phone numbers from client or contact data directly

    // Get final counts for response
    const finalContacts = await prisma.contact.findMany({
      where: { clientId: client.id }
    })
    
    const finalPhones = await prisma.phoneNumber.findMany({
      where: { clientId: client.id }
    })

    return NextResponse.json({
      message: "Client imported successfully",
      client: {
        id: client.id,
        name: client.name,
        centralCrmClientId: client.centralCrmClientId
      },
      importedData: {
        contactsCount: finalContacts.length,
        phoneNumbersCount: finalPhones.length,
        contacts: finalContacts.map((contact: any) => ({
          id: contact.id,
          firstName: contact.firstName,
          lastName: contact.lastName,
          email: contact.email,
          isPrimary: contact.isPrimary,
          centralCrmContactId: contact.centralCrmContactId
        })),
        phoneNumbers: finalPhones.map((phone: any) => ({
          id: phone.id,
          number: phone.number,
          type: phone.type,
          isPrimary: phone.isPrimary,
          contactId: phone.contactId
        }))
      }
    })

  } catch (error) {
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: "Invalid data provided",
        details: error.errors
      }, { status: 400 })
    }

    return NextResponse.json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
