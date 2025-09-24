import { z } from "zod"

export const phoneSchema = z.object({
  id: z.number().optional(),
  type: z.enum(["PHONE", "BUSINESS", "WORK", "HOME", "MOBILE", "OTHER"]),
  number: z.string().optional().refine((val) => {
    if (!val || val.trim() === "") return true // Optional
    // Accept both formats: (555) 123-4567 and 555-123-4567
    return /^\(\d{3}\) \d{3}-\d{4}$/.test(val.trim()) || /^\d{3}-\d{3}-\d{4}$/.test(val.trim())
  }, "Please enter a valid phone number"),
  isPrimary: z.boolean().default(false),
  isVerified: z.boolean().default(false),
})

export const contactSchema = z.object({
  id: z.number().optional(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().optional().refine((val) => {
    if (!val || val.trim() === "") return true // Optional
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val)
  }, "Invalid email address"),
  phone: z.string().optional().refine((val) => {
    if (!val || val.trim() === "") return true // Optional
    // Accept both formats: (555) 123-4567 and 555-123-4567
    return /^\(\d{3}\) \d{3}-\d{4}$/.test(val.trim()) || /^\d{3}-\d{3}-\d{4}$/.test(val.trim())
  }, "Please enter a valid phone number"),
  isPrimary: z.boolean().default(false),
  gender: z.string().optional().transform(val => val === "not-specified" ? "" : val),
  language: z.string().optional().transform(val => val === "not-specified" ? "" : val),
})

export const clientSchema = z.object({
  type: z.enum(["ORGANIZATION", "PERSON"]).default("ORGANIZATION"),
  name: z.string().min(1, "Name is required"),
  address: z.string().optional(),
  apartment: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().default("Canada"),
  active: z.boolean().default(true),
  phones: z.array(phoneSchema)
    .optional()
    .default([])
    .refine(phones => {
      if (!phones || phones.length === 0) return true // Optional
      return phones.some(phone => phone.isPrimary)
    }, {
      message: "At least one phone number must be marked as primary"
    }),
  contacts: z.array(contactSchema)
    .min(1, "At least one contact is required")
    .refine(contacts => contacts.some(contact => contact.isPrimary), {
      message: "At least one contact must be marked as primary"
    }),
})

export type ClientFormData = z.infer<typeof clientSchema>
export type PhoneFormData = z.infer<typeof phoneSchema>
export type ContactFormData = z.infer<typeof contactSchema>
