"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Building2, Mail, Phone, MapPin } from "lucide-react"
import Link from "next/link"
import { getCountryName } from "@/components/ui/countries-select"

interface Contact {
  id: number
  firstName: string
  lastName: string
  email?: string | null
  isPrimary: boolean
  gender?: string | null
  language?: string | null
}

interface Phone {
  id: number
  type: string
  number: string
  isPrimary: boolean
  isVerified: boolean
  contactId?: number
}

interface Client {
  id: number
  name: string
  type?: "ORGANIZATION" | "PERSON"
  address?: string | null
  apartment?: string | null
  city?: string | null
  state?: string | null
  zipCode?: string | null
  country?: string | null
  contacts?: Contact[]
  phones?: Phone[]
}

interface ClientInfoDisplayProps {
  client: Client | null
  showEditButton?: boolean
  onEditClick?: () => void
  showClientLink?: boolean
  className?: string
}

export function ClientInfoDisplay({ 
  client, 
  showEditButton = false, 
  onEditClick,
  showClientLink = false,
  className = ""
}: ClientInfoDisplayProps) {
  // Return null if client is not provided
  if (!client) {
    return null
  }

  // Get primary contact email
  const primaryContact = client.contacts?.find(contact => contact.isPrimary)
  const primaryEmail = primaryContact?.email

  // Get primary contact phone numbers
  const primaryContactPhones = primaryContact 
    ? client.phones?.filter(phone => phone.contactId === primaryContact.id) || []
    : []

  // Format address
  const formatAddress = () => {
    const addressParts = []
    if (client.address) addressParts.push(client.address)
    if (client.apartment) addressParts.push(client.apartment)
    if (client.city) addressParts.push(client.city)
    if (client.state) addressParts.push(client.state)
    if (client.zipCode) addressParts.push(client.zipCode)
    if (client.country) addressParts.push(getCountryName(client.country))
    
    return addressParts.length > 0 ? addressParts.join(", ") : "No address provided"
  }

  return (
    <div className={`grid gap-4 md:grid-cols-2 ${className}`}>
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Basic Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            {showClientLink ? (
              <Link 
                href={`/admin/clients/${client.id}`}
                className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
              >
                {client.name}
              </Link>
            ) : (
              <span>{client.name}</span>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span>
              {primaryEmail || "No email available"}
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>{formatAddress()}</span>
          </div>
        </CardContent>
      </Card>

      {/* Phone Numbers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Phone Numbers
          </CardTitle>
        </CardHeader>
        <CardContent>
          {primaryContactPhones.length > 0 ? (
            <div className="space-y-2">
              {primaryContactPhones.map((phone) => (
                <div key={phone.id} className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{phone.number}</span>
                  <Badge variant="outline" className="text-xs">
                    {phone.type}
                  </Badge>
                  {phone.isPrimary && (
                    <Badge variant="default" className="text-xs">
                      Primary
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">
              {primaryContact ? "No phone numbers for primary contact" : "No primary contact found"}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
