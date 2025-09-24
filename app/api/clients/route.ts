import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { clientSchema } from "@/lib/validations/client"

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
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '25')
    const search = searchParams.get('search') || ''
    const activeFilter = searchParams.get('activeFilter') || 'all'
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    const skip = (page - 1) * limit

    // Build where clause
    const where: any = {}

    // Search filter - now includes contact emails
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
        { state: { contains: search, mode: 'insensitive' } },
        { 
          contacts: {
            some: {
              email: { contains: search, mode: 'insensitive' }
            }
          }
        },
        {
          contacts: {
            some: {
              OR: [
                { firstName: { contains: search, mode: 'insensitive' } },
                { lastName: { contains: search, mode: 'insensitive' } }
              ]
            }
          }
        }
      ]
    }

    // Active filter
    if (activeFilter !== 'all') {
      where.active = activeFilter === 'active'
    }

    // Get total count for pagination
    const totalCount = await prisma.client.count({ where })

    // Get clients with pagination
    const clients = await prisma.client.findMany({
      where,
      include: {
        _count: {
          select: {
            sites: true,
            contacts: true,
            phones: true,
          },
        },
        contacts: {
          where: { isPrimary: true },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            isPrimary: true,
          }
        },
        phones: {
          where: { isPrimary: true },
          select: {
            id: true,
            number: true,
            type: true,
            isPrimary: true,
          }
        }
      },
      orderBy: { [sortBy]: sortOrder },
      skip,
      take: limit,
    })

    const totalPages = Math.ceil(totalCount / limit)

    return NextResponse.json({
      data: clients,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

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
    const validatedData = clientSchema.parse(body)

    // For PERSON type, combine first and last name for client name
    let clientName = validatedData.name
    if (validatedData.type === "PERSON" && validatedData.contacts.length > 0) {
      const primaryContact = validatedData.contacts.find(c => c.isPrimary) || validatedData.contacts[0]
      clientName = `${primaryContact.firstName} ${primaryContact.lastName}`
    }

    // Use transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Create client
      const client = await tx.client.create({
        data: {
          name: clientName,
          type: validatedData.type,
          address: validatedData.address,
          apartment: validatedData.apartment,
          city: validatedData.city,
          state: validatedData.state,
          zipCode: validatedData.zipCode,
          country: validatedData.country,
          active: validatedData.active,
        },
      })

      // Create contacts - ensure only one primary contact
      const contacts = await Promise.all(
        validatedData.contacts.map(async (contactData, index) => {
          const isPrimary = contactData.isPrimary // Use the actual isPrimary value from form data
          return await tx.contact.create({
            data: {
              clientId: client.id,
              firstName: contactData.firstName,
              lastName: contactData.lastName,
              email: contactData.email,
              isPrimary,
              gender: contactData.gender,
              language: contactData.language === "not-specified" ? "" : contactData.language,
            },
          })
        })
      )

      // Ensure only one contact is primary - update others to non-primary
      const primaryContactForUpdate = contacts.find(c => c.isPrimary)
      if (primaryContactForUpdate) {
        await tx.contact.updateMany({
          where: {
            clientId: client.id,
            id: { not: primaryContactForUpdate.id }
          },
          data: {
            isPrimary: false
          }
        })
      }

      // Create contact phone numbers for non-primary contacts
      const contactPhones = await Promise.all(
        validatedData.contacts
          .filter(contactData => !contactData.isPrimary && contactData.phone && contactData.phone.trim() !== "")
          .map(async (contactData) => {
            const contact = contacts.find(c => c.firstName === contactData.firstName && c.lastName === contactData.lastName)
            if (contact) {
              return await tx.phoneNumber.create({
                data: {
                  clientId: client.id,
                  contactId: contact.id,
                  type: "PHONE",
                  number: contactData.phone,
                  isPrimary: false,
                  isVerified: false,
                },
              })
            }
            return null
          })
      )

      // Create phone numbers (only if number is not empty) - associate with primary contact
      const primaryContactForPhone = contacts.find(c => c.isPrimary)
      const phones = await Promise.all(
        validatedData.phones
          .filter(phoneData => phoneData.number && phoneData.number.trim() !== "")
          .map(async (phoneData, index) => {
            const isPrimary = phoneData.isPrimary
            return await tx.phoneNumber.create({
              data: {
                clientId: client.id,
                contactId: primaryContactForPhone?.id, // All main phone numbers belong to primary contact
                type: phoneData.type,
                number: phoneData.number,
                isPrimary,
                isVerified: phoneData.isVerified,
              },
            })
          })
      )

      // Ensure only one phone number across the entire client is marked as primary
      const primaryPhoneId = validatedData.phones.find(p => p.isPrimary)?.id
      if (primaryPhoneId) {
        // First, set all phone numbers for this client to non-primary
        await tx.phoneNumber.updateMany({
          where: {
            clientId: client.id
          },
          data: {
            isPrimary: false
          }
        })
        
        // Then, set the selected phone as primary
        await tx.phoneNumber.updateMany({
          where: {
            clientId: client.id,
            id: primaryPhoneId
          },
          data: {
            isPrimary: true
          }
        })
      }

      return { client, contacts, phones }
    })

    return NextResponse.json(result.client, { status: 201 })
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
