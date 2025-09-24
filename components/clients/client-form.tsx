"use client"

import { useState } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Plus, Trash2, Loader2 } from "lucide-react"
import { clientSchema, type ClientFormData } from "@/lib/validations/client"
import { formatCanadianPhone } from "@/lib/utils/phone"
import { ClientTypeSelector } from "@/components/clients/client-type-selector"
import { CountriesSelect } from "@/components/ui/countries-select"

interface ClientFormProps {
  initialData?: Partial<ClientFormData>
  onSubmit: (data: ClientFormData) => Promise<void>
  isLoading?: boolean
}

export function ClientForm({ initialData, onSubmit, isLoading = false }: ClientFormProps) {
  const [error, setError] = useState("")

  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      clientType: initialData?.clientType || "organization",
      name: initialData?.name || "",
      email: initialData?.email || "",
      address: initialData?.address || "",
      apartment: initialData?.apartment || "",
      city: initialData?.city || "",
      state: initialData?.state || "",
      zipCode: initialData?.zipCode || "",
      country: initialData?.country || "Canada",
      phones: initialData?.phones || [{ type: "PHONE", number: "" }],
      contacts: initialData?.contacts || [{ firstName: "", lastName: "", email: "", phone: "" }],
    },
  })

  const {
    fields: phoneFields,
    append: appendPhone,
    remove: removePhone,
  } = useFieldArray({
    control: form.control,
    name: "phones",
  })

  const {
    fields: contactFields,
    append: appendContact,
    remove: removeContact,
  } = useFieldArray({
    control: form.control,
    name: "contacts",
  })

  const handleSubmit = async (data: ClientFormData) => {
    try {
      setError("")

      // Format phone numbers
      const formattedData = {
        ...data,
        phones: data.phones.map((phone) => ({
          ...phone,
          number: formatCanadianPhone(phone.number),
        })),
        contacts: data.contacts.map((contact) => ({
          ...contact,
          phone: contact.phone ? formatCanadianPhone(contact.phone) : "",
        })),
      }

      await onSubmit(formattedData)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    }
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Organization Information</CardTitle>
          <CardDescription>Basic company details and address</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Company Name *</Label>
              <Input id="name" {...form.register("name")} placeholder="Acme Corporation" disabled={isLoading} />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Company Email *</Label>
              <Input
                id="email"
                type="email"
                {...form.register("email")}
                placeholder="contact@acme.com"
                disabled={isLoading}
              />
              {form.formState.errors.email && (
                <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input id="address" {...form.register("address")} placeholder="123 Main Street" disabled={isLoading} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="apartment">Apartment/Suite</Label>
              <Input id="apartment" {...form.register("apartment")} placeholder="Suite 100" disabled={isLoading} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" {...form.register("city")} placeholder="Toronto" disabled={isLoading} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">Province/State</Label>
              <Input id="state" {...form.register("state")} placeholder="ON" disabled={isLoading} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="zipCode">Postal Code</Label>
              <Input id="zipCode" {...form.register("zipCode")} placeholder="M5V 3A8" disabled={isLoading} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Input id="country" {...form.register("country")} placeholder="Canada" disabled={isLoading} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Phone Numbers</CardTitle>
          <CardDescription>Add multiple phone numbers for the organization</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {phoneFields.map((field, index) => (
            <div key={field.id} className="flex gap-4 items-end">
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

              <div className="flex-2 space-y-2">
                <Label>Phone Number</Label>
                <Input {...form.register(`phones.${index}.number`)} placeholder="416-555-0123" disabled={isLoading} />
                {form.formState.errors.phones?.[index]?.number && (
                  <p className="text-sm text-destructive">{form.formState.errors.phones[index]?.number?.message}</p>
                )}
              </div>

              {phoneFields.length > 1 && (
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
            onClick={() => appendPhone({ type: "PHONE", number: "" })}
            disabled={isLoading}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Phone Number
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contacts</CardTitle>
          <CardDescription>Add contact persons for this organization</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {contactFields.map((field, index) => (
            <div key={field.id} className="space-y-4 p-4 border rounded-lg">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">Contact {index + 1}</h4>
                {contactFields.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
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
                  <Input {...form.register(`contacts.${index}.firstName`)} placeholder="John" disabled={isLoading} />
                  {form.formState.errors.contacts?.[index]?.firstName && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.contacts[index]?.firstName?.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Last Name *</Label>
                  <Input {...form.register(`contacts.${index}.lastName`)} placeholder="Doe" disabled={isLoading} />
                  {form.formState.errors.contacts?.[index]?.lastName && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.contacts[index]?.lastName?.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input
                    {...form.register(`contacts.${index}.email`)}
                    type="email"
                    placeholder="john.doe@acme.com"
                    disabled={isLoading}
                  />
                  {form.formState.errors.contacts?.[index]?.email && (
                    <p className="text-sm text-destructive">{form.formState.errors.contacts[index]?.email?.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    {...form.register(`contacts.${index}.phone`)}
                    placeholder="416-555-0123"
                    disabled={isLoading}
                  />
                </div>
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            onClick={() => appendContact({ firstName: "", lastName: "", email: "", phone: "" })}
            disabled={isLoading}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Contact
          </Button>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Client"
          )}
        </Button>
      </div>
    </form>
  )
}
