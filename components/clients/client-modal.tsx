"use client"

import { useState, useEffect } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Plus, Trash2, Loader2, X, Phone, User, Building } from "lucide-react"
import { clientSchema, type ClientFormData } from "@/lib/validations/client"
import { z } from "zod"
import { formatCanadianPhone } from "@/lib/utils/phone"
import { ClientTypeSelector } from "@/components/clients/client-type-selector"
import { CountriesSelect } from "@/components/ui/countries-select"
import { toast } from "sonner"

interface Client {
  id: number
  name: string
  type?: "ORGANIZATION" | "PERSON"
  address?: string
  apartment?: string
  city?: string
  state?: string
  zipCode?: string
  country?: string
  active?: boolean
  phones?: Array<{
    id: number
    type: string
    number: string
    isPrimary: boolean
    isVerified: boolean
    contactId?: number
  }>
  contacts?: Array<{
    id: number
    firstName: string
    lastName: string
    email?: string | null
    phone?: string
    isPrimary: boolean
    gender?: string
    language?: string
  }>
  createdAt?: string
  updatedAt?: string
}

interface ClientModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  client?: Client | null
  onSuccess: () => void
}

export function ClientModal({ open, onOpenChange, client, onSuccess }: ClientModalProps) {
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<ClientFormData>({
    mode: "onChange",
    reValidateMode: "onChange",
    defaultValues: {
      type: "ORGANIZATION" as const,
      name: "",
      address: "",
      apartment: "",
      city: "",
      state: "",
      zipCode: "",
      country: "CA",
      active: true,
      phones: [{ type: "PHONE" as const, number: "", isPrimary: true, isVerified: false }],
      contacts: [{ firstName: "", lastName: "", email: "", phone: "", isPrimary: true, gender: "not-specified", language: "not-specified" }],
    },
  })

  const { fields: phoneFields, append: appendPhone, remove: removePhone } = useFieldArray({
    control: form.control,
    name: "phones",
  })

  const { fields: contactFields, append: appendContact, remove: removeContact } = useFieldArray({
    control: form.control,
    name: "contacts",
  })

  const clientType = form.watch("type")
  const isEditMode = !!client

  // Reset form when modal opens/closes or client changes
  useEffect(() => {
    if (open) {
      if (client) {
        // Edit mode - populate form with client data
        form.reset({
          type: (client as any).type || "ORGANIZATION",
          name: client.name || "",
          address: client.address || "",
          apartment: client.apartment || "",
          city: client.city || "",
          state: client.state || "",
          zipCode: client.zipCode || "",
          country: client.country || "CA",
          active: client.active ?? true,
          phones: (() => {
            if (!client.phones || client.phones.length === 0) {
              return [{ type: "PHONE" as const, number: "", isPrimary: true, isVerified: false }]
            }
            
            // Find the primary contact
            const primaryContact = client.contacts?.find(contact => contact.isPrimary)
            if (!primaryContact) {
              return [{ type: "PHONE" as const, number: "", isPrimary: true, isVerified: false }]
            }
            
            // Get phone numbers associated with the primary contact
            const primaryContactPhones = client.phones.filter(phone => phone.contactId === primaryContact.id)
            
            if (primaryContactPhones.length > 0) {
              return primaryContactPhones.map((phone) => ({ 
                id: phone.id,
                type: phone.type as "PHONE" | "BUSINESS" | "WORK" | "HOME" | "MOBILE" | "OTHER", 
                number: phone.number,
                isPrimary: phone.isPrimary, // Preserve the actual primary status from database
                isVerified: phone.isVerified
              }))
            } else {
              return [{ type: "PHONE" as const, number: "", isPrimary: true, isVerified: false }]
            }
          })(),
          contacts: client.contacts && client.contacts.length > 0
            ? client.contacts.map(contact => ({
                id: contact.id,
                firstName: contact.firstName || "",
                lastName: contact.lastName || "",
                email: contact.email || "",
                phone: (() => {
                  // Get phone number for this contact from client.phones
                  const contactPhone = client.phones?.find(phone => phone.contactId === contact.id)
                  return contactPhone?.number || ""
                })(),
                isPrimary: contact.isPrimary,
                gender: contact.gender || "not-specified",
                language: contact.language || "not-specified",
              }))
            : [{ firstName: "", lastName: "", email: "", phone: "", isPrimary: true, gender: "not-specified", language: "not-specified" }],
        })
      } else {
        // Add mode - reset to defaults
        form.reset({
          type: "ORGANIZATION" as const,
          name: "",
          address: "",
          apartment: "",
          city: "",
          state: "",
          zipCode: "",
          country: "CA",
          active: true,
          phones: [{ type: "PHONE" as const, number: "", isPrimary: true, isVerified: false }],
          contacts: [{ firstName: "", lastName: "", email: "", phone: "", isPrimary: true, gender: "not-specified", language: "not-specified" }],
        })
      }
      setError("")
    }
  }, [open, client, form])

  // Handle phone number formatting
  const handlePhoneChange = (index: number, value: string) => {
    const formatted = formatCanadianPhone(value)
    form.setValue(`phones.${index}.number`, formatted)
    // Trigger real-time validation
    validateField(`phones.${index}.number`, formatted)
  }

  // Handle primary contact/phone selection
  const handlePrimaryContactChange = (index: number) => {
    const currentContacts = form.getValues("contacts")
    const currentPhones = form.getValues("phones")
    const selectedContact = currentContacts[index]
    
    const updatedContacts = currentContacts.map((contact, i) => {
      // Only the selected contact becomes primary, all others become non-primary
      const isPrimary = i === index
      
      return {
        ...contact,
        isPrimary
      }
    })
    
    // If switching to a contact that has existing phone numbers, show them
    if (client && selectedContact.id) {
      const existingPhones = client.phones?.filter(phone => phone.contactId === selectedContact.id) || []
      if (existingPhones.length > 0) {
        // Replace current phones with existing phones from the selected contact
        const formattedPhones = existingPhones.map((phone, index) => {
          // Check if any phone is already marked as primary
          const hasAnyPrimary = existingPhones.some(p => p.isPrimary)
          
          // If no phone is primary, make the first one primary
          // If phones are already marked as primary, preserve their status
          const shouldBePrimary = !hasAnyPrimary && index === 0 ? true : phone.isPrimary
          
          return {
            id: phone.id,
            type: phone.type as "PHONE" | "BUSINESS" | "WORK" | "HOME" | "MOBILE" | "OTHER",
            number: phone.number,
            isPrimary: shouldBePrimary,
            isVerified: phone.isVerified
          }
        })
        
        form.setValue("phones", formattedPhones)
      } else {
        // If the new primary contact has no existing phones, reset to default empty phone
        form.setValue("phones", [{ type: "PHONE" as const, number: "", isPrimary: true, isVerified: false }])
      }
    }
    
    form.setValue("contacts", updatedContacts)
  }

  const handlePrimaryPhoneChange = (index: number) => {
    const currentPhones = form.getValues("phones")
    const updatedPhones = currentPhones.map((phone, i) => ({
      ...phone,
      isPrimary: i === index
    }))
    form.setValue("phones", updatedPhones)
  }

  // Handle client type change
  const handleClientTypeChange = (type: "ORGANIZATION" | "PERSON") => {
    form.setValue("type", type)
    
    if (type === "PERSON") {
      // For person type, ensure we have a basic contact entry
      const contacts = form.getValues("contacts")
      if (contacts.length === 0) {
        // Add a basic contact if none exists
        form.setValue("contacts", [{ 
          firstName: "", 
          lastName: "", 
          email: "", 
          isPrimary: true, 
          gender: "not-specified", 
          language: "not-specified" 
        }])
      }
    }
  }

  // Handle client name update for PERSON type
  const updateClientName = () => {
    if (clientType === "PERSON") {
      const contacts = form.getValues("contacts")
      if (contacts.length > 0 && contacts[0].firstName && contacts[0].lastName) {
        form.setValue("name", `${contacts[0].firstName} ${contacts[0].lastName}`)
      }
    }
  }

  const validateForm = (data: ClientFormData) => {
    const errors: Record<string, string> = {}
    
    // Validate required fields
    if (!data.name || data.name.trim() === "") {
      errors.name = "Name is required"
    }
    
    // Validate phones (optional)
    if (data.phones && data.phones.length > 0) {
      // Check if at least one phone is primary (only if phones exist)
      const hasPrimaryPhone = data.phones.some(phone => phone.isPrimary)
      if (!hasPrimaryPhone) {
        // Show error in general error area instead of alert
        errors.general = "At least one phone number must be marked as primary"
      }
      
      // Validate individual phone numbers (only if they have content)
      data.phones.forEach((phone, index) => {
        if (phone.number && phone.number.trim() !== "" && !/^\(\d{3}\) \d{3}-\d{4}$/.test(phone.number.trim()) && !/^\d{3}-\d{3}-\d{4}$/.test(phone.number.trim())) {
          errors[`phones.${index}.number`] = "Please enter a valid phone number"
        }
      })
    }
    
    // Validate contacts
    if (data.contacts && data.contacts.length > 0) {
      // Check if at least one contact is primary
      const hasPrimaryContact = data.contacts.some(contact => contact.isPrimary)
      if (!hasPrimaryContact) {
        // Show error in general error area instead of alert
        errors.general = "At least one contact must be marked as primary"
      }
      
      // Validate individual contacts
      data.contacts.forEach((contact, index) => {
        if (!contact.firstName || contact.firstName.trim() === "") {
          errors[`contacts.${index}.firstName`] = "First name is required"
        }
        if (!contact.lastName || contact.lastName.trim() === "") {
          errors[`contacts.${index}.lastName`] = "Last name is required"
        }
        // Email is optional, but if provided, must be valid
        if (contact.email && contact.email.trim() !== "" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) {
          errors[`contacts.${index}.email`] = "Invalid email address"
        }
      })
    }
    
    return errors
  }

  // Real-time validation functions

  const validateField = (fieldName: string, value: any) => {
    const formData = form.getValues()
    
    // Clear the specific field error first
    form.clearErrors(fieldName as any)
    
    // Validate specific field
    if (fieldName === 'name') {
      if (!value || value.trim() === "") {
        form.setError('name', { message: "Name is required" })
      }
    } else if (fieldName.startsWith('phones.') && fieldName.endsWith('.number')) {
      const index = parseInt(fieldName.split('.')[1])
      // Phone number is optional, but if provided, must be valid format
      if (value && value.trim() !== "" && !/^\(\d{3}\) \d{3}-\d{4}$/.test(value.trim()) && !/^\d{3}-\d{3}-\d{4}$/.test(value.trim())) {
        form.setError(fieldName as any, { message: "Please enter a valid phone number" })
      }
    } else if (fieldName.startsWith('contacts.') && fieldName.endsWith('.firstName')) {
      const index = parseInt(fieldName.split('.')[1])
      if (!value || value.trim() === "") {
        form.setError(fieldName as any, { message: "First name is required" })
      }
    } else if (fieldName.startsWith('contacts.') && fieldName.endsWith('.lastName')) {
      const index = parseInt(fieldName.split('.')[1])
      if (!value || value.trim() === "") {
        form.setError(fieldName as any, { message: "Last name is required" })
      }
    } else if (fieldName.startsWith('contacts.') && fieldName.endsWith('.email')) {
      // Email validation is handled by React Hook Form with onBlur mode
    } else if (fieldName.startsWith('contacts.') && fieldName.endsWith('.phone')) {
      const index = parseInt(fieldName.split('.')[1])
      // Phone is optional, but if provided, must be valid format
      if (value && value.trim() !== "" && !/^\(\d{3}\) \d{3}-\d{4}$/.test(value.trim()) && !/^\d{3}-\d{3}-\d{4}$/.test(value.trim())) {
        form.setError(fieldName as any, { message: "Please enter a valid phone number" })
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    
    // Clear all existing form errors
    form.clearErrors()
    
    // Get form data
    const formData = form.getValues()
    
    // Check for minimum requirements first
    if (!formData.contacts || formData.contacts.length === 0) {
      // Show error in the general error area instead of alert
      setError("At least one contact is required")
      setIsLoading(false)
      return
    }
    
    // Validate form
    const validationErrors = validateForm(formData)
    
    if (Object.keys(validationErrors).length > 0) {
      // Handle general errors
      if (validationErrors.general) {
        setError(validationErrors.general)
        setIsLoading(false)
        return
      }
      
      // Set form errors for field-specific errors
      Object.entries(validationErrors).forEach(([path, message]) => {
        if (path !== 'general') {
          form.setError(path as any, { message })
        }
      })
      setIsLoading(false)
      return
    }
    
    try {
      const url = client ? `/api/clients/${client.id}` : "/api/clients"
      const method = client ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Failed to ${client ? 'update' : 'create'} client`)
      }

      // Show success toast
      toast.success(client ? "Client updated successfully!" : "Client created successfully!")
      
      onSuccess()
      onOpenChange(false)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An error occurred"
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {clientType === "ORGANIZATION" ? (
              <Building className="h-5 w-5" />
            ) : (
              <User className="h-5 w-5" />
            )}
            {isEditMode ? "Edit Client" : "Add New Client"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode 
              ? `Update the ${clientType.toLowerCase()} information and contact details`
              : `Create a new ${clientType.toLowerCase()} with contact information`
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Client Type Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Client Type</CardTitle>
              <CardDescription>Select whether this is an organization or individual person</CardDescription>
            </CardHeader>
            <CardContent>
              <ClientTypeSelector
                value={form.watch("type")}
                onValueChange={handleClientTypeChange}
                disabled={isLoading}
              />
              {form.formState.errors.type && (
                <p className="text-sm text-destructive mt-2">{form.formState.errors.type.message}</p>
              )}
            </CardContent>
          </Card>

          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                {clientType === "ORGANIZATION" 
                  ? "Enter the organization's basic details"
                  : "Enter the person's basic details"
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {clientType === "ORGANIZATION" && (
                <div className="space-y-2">
                  <Label htmlFor="name">Organization Name *</Label>
                  <Input
                    id="name"
                    {...form.register("name", {
                      onChange: (e) => validateField('name', e.target.value)
                    })}
                    disabled={isLoading}
                    placeholder="Enter organization name"
                  />
                  {form.formState.errors.name && (
                    <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                  )}
                </div>
              )}

              {clientType === "PERSON" && (
                <div key={`person-${clientType}`} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>First Name *</Label>
                    <Input
                      key="firstName"
                      value={form.watch("contacts.0.firstName") || ""}
                      onChange={(e) => {
                        form.setValue("contacts.0.firstName", e.target.value)
                        validateField("contacts.0.firstName", e.target.value)
                        updateClientName()
                      }}
                      disabled={isLoading}
                      placeholder="Enter first name"
                    />
                    {form.formState.errors.contacts?.[0]?.firstName && (
                      <p className="text-sm text-destructive">{form.formState.errors.contacts[0]?.firstName?.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Last Name *</Label>
                    <Input
                      key="lastName"
                      value={form.watch("contacts.0.lastName") || ""}
                      onChange={(e) => {
                        form.setValue("contacts.0.lastName", e.target.value)
                        validateField("contacts.0.lastName", e.target.value)
                        updateClientName()
                      }}
                      disabled={isLoading}
                      placeholder="Enter last name"
                    />
                    {form.formState.errors.contacts?.[0]?.lastName && (
                      <p className="text-sm text-destructive">{form.formState.errors.contacts[0]?.lastName?.message}</p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Address Information */}
          <Card>
            <CardHeader>
              <CardTitle>Address Information</CardTitle>
              <CardDescription>Enter the address details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  {...form.register("address")}
                  disabled={isLoading}
                  placeholder="Enter street address"
                />
                {form.formState.errors.address && (
                  <p className="text-sm text-destructive">{form.formState.errors.address.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="apartment">Apartment/Suite</Label>
                  <Input
                    id="apartment"
                    {...form.register("apartment")}
                    disabled={isLoading}
                    placeholder="Apt, Suite, Unit, etc."
                  />
                  {form.formState.errors.apartment && (
                    <p className="text-sm text-destructive">{form.formState.errors.apartment.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    {...form.register("city")}
                    disabled={isLoading}
                    placeholder="Enter city"
                  />
                  {form.formState.errors.city && (
                    <p className="text-sm text-destructive">{form.formState.errors.city.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="state">State/Province</Label>
                  <Input
                    id="state"
                    {...form.register("state")}
                    disabled={isLoading}
                    placeholder="State or Province"
                  />
                  {form.formState.errors.state && (
                    <p className="text-sm text-destructive">{form.formState.errors.state.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="zipCode">Postal Code</Label>
                  <Input
                    id="zipCode"
                    {...form.register("zipCode")}
                    disabled={isLoading}
                    placeholder="Postal code"
                  />
                  {form.formState.errors.zipCode && (
                    <p className="text-sm text-destructive">{form.formState.errors.zipCode.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <CountriesSelect
                    value={form.watch("country")}
                    onValueChange={(value) => form.setValue("country", value)}
                  />
                  {form.formState.errors.country && (
                    <p className="text-sm text-destructive">{form.formState.errors.country.message}</p>
                  )}
                </div>
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
              <CardDescription>Add phone numbers for this {clientType.toLowerCase()}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {phoneFields.map((field, index) => (
                <div key={field.id} className="flex gap-4 items-end p-4 border rounded-lg">
                  <div className="flex-1 space-y-2">
                    <Label>Phone Number</Label>
                    <Input 
                      value={form.watch(`phones.${index}.number`)}
                      onChange={(e) => handlePhoneChange(index, e.target.value)}
                      disabled={isLoading}
                      placeholder="(555) 123-4567"
                    />
                    {form.formState.errors.phones?.[index]?.number && (
                      <p className="text-sm text-destructive">{form.formState.errors.phones[index]?.number?.message}</p>
                    )}
                  </div>

                  <div className="flex-1 space-y-2">
                    <Label>Type</Label>
                    <Select
                      value={form.watch(`phones.${index}.type`)}
                      onValueChange={(value) => form.setValue(`phones.${index}.type`, value as any)}
                      disabled={isLoading}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PHONE">Phone</SelectItem>
                        <SelectItem value="BUSINESS">Business</SelectItem>
                        <SelectItem value="WORK">Work</SelectItem>
                        <SelectItem value="HOME">Home</SelectItem>
                        <SelectItem value="MOBILE">Mobile</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-start space-x-2 pt-6">
                    <input
                      type="radio"
                      name="primaryPhone"
                      checked={form.watch(`phones.${index}.isPrimary`)}
                      onChange={() => handlePrimaryPhoneChange(index)}
                      disabled={isLoading}
                      className="h-4 w-4 mt-1"
                    />
                    <Label className="text-sm pt-1">Primary</Label>
                  </div>

                  {phoneFields.length > 1 && !form.watch(`phones.${index}.isPrimary`) && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => removePhone(index)}
                      disabled={isLoading}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={() => appendPhone({ type: "PHONE", number: "", isPrimary: false, isVerified: false })}
                disabled={isLoading}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Phone Number
              </Button>
            </CardContent>
          </Card>

          {/* Contacts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Contacts
              </CardTitle>
              <CardDescription>
                {clientType === "ORGANIZATION" 
                  ? "Add contact persons for this organization"
                  : "Add additional contacts for this person"
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {contactFields.map((field, index) => (
                <div key={field.id} className="space-y-4 p-4 border rounded-lg">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Contact {index + 1}
                      {form.watch(`contacts.${index}.isPrimary`) && (
                        <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">Primary</span>
                      )}
                    </h4>
                    {contactFields.length > 1 && !form.watch(`contacts.${index}.isPrimary`) && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => removeContact(index)}
                        disabled={isLoading}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>First Name *</Label>
                      <Input 
                        {...form.register(`contacts.${index}.firstName`, {
                          onChange: (e) => validateField(`contacts.${index}.firstName`, e.target.value)
                        })} 
                        disabled={isLoading || (clientType === "PERSON" && form.watch(`contacts.${index}.isPrimary`))}
                        placeholder={clientType === "PERSON" && form.watch(`contacts.${index}.isPrimary`) ? "Auto-filled from basic info" : "Enter first name"}
                      />
                      {form.formState.errors.contacts?.[index]?.firstName && (
                        <p className="text-sm text-destructive">{form.formState.errors.contacts[index]?.firstName?.message}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Last Name *</Label>
                      <Input 
                        {...form.register(`contacts.${index}.lastName`, {
                          onChange: (e) => validateField(`contacts.${index}.lastName`, e.target.value)
                        })} 
                        disabled={isLoading || (clientType === "PERSON" && form.watch(`contacts.${index}.isPrimary`))}
                        placeholder={clientType === "PERSON" && form.watch(`contacts.${index}.isPrimary`) ? "Auto-filled from basic info" : "Enter last name"}
                      />
                      {form.formState.errors.contacts?.[index]?.lastName && (
                        <p className="text-sm text-destructive">{form.formState.errors.contacts[index]?.lastName?.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input 
                      type="email"
                      {...form.register(`contacts.${index}.email`, {
                        pattern: {
                          value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                          message: "Invalid email address"
                        },
                        validate: (value) => {
                          // Don't validate empty values
                          if (!value || value.trim() === "") return true
                          
                          const trimmedValue = value.trim()
                          
                          // Only show error if email looks complete but invalid
                          // This prevents flickering while user is still typing
                          if (trimmedValue.includes('@') && trimmedValue.includes('.') && trimmedValue.length >= 5) {
                            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
                            return emailRegex.test(trimmedValue) || "Invalid email address"
                          }
                          
                          // Return true (valid) while user is still typing
                          return true
                        }
                      })} 
                      disabled={isLoading}
                      placeholder="contact@example.com"
                    />
                    {form.formState.errors.contacts?.[index]?.email && (
                      <p className="text-sm text-destructive">{form.formState.errors.contacts[index]?.email?.message}</p>
                    )}
                  </div>

                  {!form.watch(`contacts.${index}.isPrimary`) && (
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input 
                        {...form.register(`contacts.${index}.phone`, {
                          onChange: (e) => {
                            const formatted = formatCanadianPhone(e.target.value)
                            form.setValue(`contacts.${index}.phone`, formatted)
                            validateField(`contacts.${index}.phone`, formatted)
                          }
                        })} 
                        disabled={isLoading}
                        placeholder="(555) 123-4567"
                      />
                      {form.formState.errors.contacts?.[index]?.phone && (
                        <p className="text-sm text-destructive">{form.formState.errors.contacts[index]?.phone?.message}</p>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Gender</Label>
                      <Select
                        value={form.watch(`contacts.${index}.gender`) || "not-specified"}
                        onValueChange={(value) => form.setValue(`contacts.${index}.gender`, value === "not-specified" ? "" : value)}
                        disabled={isLoading}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="not-specified">Not specified</SelectItem>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                          <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Language</Label>
                      <Select
                        value={form.watch(`contacts.${index}.language`) || "not-specified"}
                        onValueChange={(value) => form.setValue(`contacts.${index}.language`, value === "not-specified" ? "" : value)}
                        disabled={isLoading}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="not-specified">Not specified</SelectItem>
                          <SelectItem value="English">English</SelectItem>
                          <SelectItem value="French">French</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-start space-x-2 pt-6">
                      <input
                        type="radio"
                        name="primaryContact"
                        checked={form.watch(`contacts.${index}.isPrimary`)}
                        onChange={() => handlePrimaryContactChange(index)}
                        disabled={isLoading}
                        className="h-4 w-4 mt-1"
                      />
                      <Label className="text-sm pt-1">Primary Contact</Label>
                    </div>
                  </div>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={() => appendContact({ firstName: "", lastName: "", email: "", phone: "", isPrimary: false, gender: "", language: "" })}
                disabled={isLoading}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Contact
              </Button>
            </CardContent>
          </Card>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditMode ? "Update Client" : "Create Client"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
