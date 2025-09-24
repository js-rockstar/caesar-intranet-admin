import { z } from "zod"

export const siteSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  projectId: z.string().min(1, "Project is required"),
  domain: z.string().optional(),
})

export const installationSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  projectId: z.string().min(1, "Project is required"),
  domain: z.string().min(1, "Domain is required"),
  sessionId: z.string().optional(), // Optional sessionId to update existing temporary site
})

export type SiteFormData = z.infer<typeof siteSchema>
export type InstallationFormData = z.infer<typeof installationSchema>
