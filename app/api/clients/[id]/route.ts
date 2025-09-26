import { type NextRequest, NextResponse } from "next/server"
import { requireAuth, createAuthResponse } from "@/lib/auth-middleware"
import { prisma } from "@/lib/prisma"
import { clientSchema } from "@/lib/validations/client"

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireAuth()

    if ("error" in authResult) {
      return createAuthResponse(authResult)
    }

    const { id } = await params
    const client = await prisma.client.findUnique({
      where: { id: parseInt(id) },
      include: {
        phones: {
          include: {
            contact: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              }
            }
          }
        },
        contacts: true,
        sites: {
          include: {
            project: {
              select: {
                id: true,
                name: true,
              },
            },
            steps: {
              orderBy: { createdAt: "asc" },
            },
          },
        },
      },
    })

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 })
    }

    return NextResponse.json(client)
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireAuth()

    if ("error" in authResult) {
      return createAuthResponse(authResult)
    }

    const { id } = await params
    const body = await request.json()
    const validatedData = clientSchema.parse(body)

    let clientName = validatedData.name
    if (validatedData.type === "PERSON" && validatedData.contacts.length > 0) {
      const primaryContact = validatedData.contacts.find(c => c.isPrimary) || validatedData.contacts[0]
      clientName = `${primaryContact.firstName} ${primaryContact.lastName}`
    }

    const result = await prisma.$transaction(async (tx: any) => {

      const client = await tx.client.update({
        where: { id: parseInt(id) },
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

      const existingContacts = await tx.contact.findMany({
        where: { clientId: parseInt(id) }
      })
      const existingPhones = await tx.phoneNumber.findMany({
        where: { clientId: parseInt(id) }
      })

      const updatedContacts = await Promise.all(
        validatedData.contacts.map(async (contactData, index) => {
          const isPrimary = contactData.isPrimary // Use the actual isPrimary value from form data
          const existingContact = existingContacts.find((c: any) => c.id === contactData.id)
          
          if (existingContact) {

            return await tx.contact.update({
              where: { id: existingContact.id },
              data: {
                firstName: contactData.firstName,
                lastName: contactData.lastName,
                email: contactData.email,
                isPrimary,
                gender: contactData.gender,
                language: contactData.language === "not-specified" ? "" : contactData.language,
              },
            })
          } else {

            return await tx.contact.create({
              data: {
                clientId: parseInt(id),
                firstName: contactData.firstName,
                lastName: contactData.lastName,
                email: contactData.email,
                isPrimary,
                gender: contactData.gender,
                language: contactData.language === "not-specified" ? "" : contactData.language,
              },
            })
          }
        })
      )

      const primaryContactForUpdate = updatedContacts.find(c => c.isPrimary)
      if (primaryContactForUpdate) {
        await tx.contact.updateMany({
          where: {
            clientId: parseInt(id),
            id: { not: primaryContactForUpdate.id }
          },
          data: {
            isPrimary: false
          }
        })
      }

      const contactPhones = await Promise.all(
        validatedData.contacts
          .filter(contactData => !contactData.isPrimary && contactData.phone && contactData.phone.trim() !== "")
          .map(async (contactData) => {
            const contact = updatedContacts.find(c => c.firstName === contactData.firstName && c.lastName === contactData.lastName)
            if (contact) {

              const existingPhone = await tx.phoneNumber.findFirst({
                where: { contactId: contact.id }
              })
              
              if (existingPhone) {

                return await tx.phoneNumber.update({
                  where: { id: existingPhone.id },
                  data: {
                    number: contactData.phone,
                  },
                })
              } else {

                return await tx.phoneNumber.create({
                  data: {
                    clientId: parseInt(id),
                    contactId: contact.id,
                    type: "PHONE",
                    number: contactData.phone,
                    isPrimary: false,
                    isVerified: false,
                  },
                })
              }
            }
            return null
          })
      )

      const primaryContactForPhone = updatedContacts.find((c: any) => c.isPrimary)

      const currentPrimaryContact = existingContacts.find((c: any) => c.isPrimary)
      const primaryContactChanged = currentPrimaryContact && primaryContactForPhone && 
        currentPrimaryContact.id !== primaryContactForPhone.id

      const updatedPhones = await Promise.all(
        validatedData.phones
          .filter(phoneData => phoneData.number && phoneData.number.trim() !== "")
          .map(async (phoneData, index) => {
            const isPrimary = phoneData.isPrimary

            const existingPhone = phoneData.id ? existingPhones.find((p: any) => p.id === phoneData.id) : null
            
            if (existingPhone) {

              return await tx.phoneNumber.update({
                where: { id: existingPhone.id },
                data: {
                  type: phoneData.type,
                  number: phoneData.number,
                  isPrimary,
                  isVerified: phoneData.isVerified,

                  contactId: existingPhone.contactId,
                },
              })
            } else {

              return await tx.phoneNumber.create({
                data: {
                  clientId: parseInt(id),
                  contactId: primaryContactForPhone?.id, // New phone numbers belong to primary contact
                  type: phoneData.type,
                  number: phoneData.number,
                  isPrimary,
                  isVerified: phoneData.isVerified,
                },
              })
            }
          })
      )

      const primaryPhoneId = validatedData.phones.find(p => p.isPrimary)?.id
      if (primaryPhoneId) {

        await tx.phoneNumber.updateMany({
          where: {
            clientId: parseInt(id)
          },
          data: {
            isPrimary: false
          }
        })

        await tx.phoneNumber.updateMany({
          where: {
            clientId: parseInt(id),
            id: primaryPhoneId
          },
          data: {
            isPrimary: true
          }
        })
      }

      const contactIdsToKeep = validatedData.contacts
        .map(c => c.id)
        .filter(id => id !== undefined) as number[]
      
      if (contactIdsToKeep.length > 0) {

        await tx.phoneNumber.deleteMany({
          where: {
            contactId: { notIn: contactIdsToKeep }
          }
        })

        await tx.contact.deleteMany({
          where: {
            clientId: parseInt(id),
            id: { notIn: contactIdsToKeep }
          }
        })
      }

      const phoneIdsToKeep = validatedData.phones
        .map(p => p.id)
        .filter(id => id !== undefined) as number[]

      const primaryContactId = primaryContactForPhone?.id
      const primaryContactPhoneIds = existingPhones
        .filter((p: any) => p.contactId === primaryContactId)
        .map((p: any) => p.id)

      const phoneIdsToDelete = primaryContactPhoneIds.filter((id: number) => !phoneIdsToKeep.includes(id))
      
      if (phoneIdsToDelete.length > 0) {
        await tx.phoneNumber.deleteMany({
          where: {
            id: { in: phoneIdsToDelete }
          }
        })
      }

      return { client, contacts: updatedContacts, phones: updatedPhones }
    })

    return NextResponse.json(result.client)
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireAuth()

    if ("error" in authResult) {
      return createAuthResponse(authResult)
    }

    const { id } = await params
    const body = await request.json()
    const { active } = body

    if (typeof active !== "boolean") {
      return NextResponse.json({ error: "Active status must be a boolean" }, { status: 400 })
    }

    const client = await prisma.client.update({
      where: { id: parseInt(id) },
      data: { active },
    })

    return NextResponse.json(client)
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}