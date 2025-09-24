"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, ArrowRight, Loader2, CheckCircle } from "lucide-react"
import { installationSchema, type InstallationFormData } from "@/lib/validations/site"

interface Client {
  id: string
  name: string
  email: string
}

interface Project {
  id: number
  name: string
  status: boolean
  sites: Array<{
    id: number
    domain: string
    status: string
  }>
  createdAt: string
  updatedAt: string
}

const steps = [
  { id: 1, title: "Select Project", description: "Choose the project to install" },
  { id: 2, title: "Select Client", description: "Choose the client for this installation" },
  { id: 3, title: "Review & Install", description: "Review details and start installation" },
]

export function InstallationWizard() {
  const [currentStep, setCurrentStep] = useState(1)
  const [clients, setClients] = useState<Client[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isDataLoading, setIsDataLoading] = useState(true)
  const [error, setError] = useState("")
  const router = useRouter()

  const form = useForm<InstallationFormData>({
    resolver: zodResolver(installationSchema),
    defaultValues: {
      clientId: "",
      projectId: "",
      domain: "",
    },
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setIsDataLoading(true)
      setError("")
      
      // Fetch clients with active filter to get all active clients
      const [clientsRes, projectsRes] = await Promise.all([
        fetch("/api/clients?activeFilter=active&limit=1000"), 
        fetch("/api/projects")
      ])

      if (clientsRes.ok && projectsRes.ok) {
        const [clientsResponse, projectsData] = await Promise.all([clientsRes.json(), projectsRes.json()])
        
        // Handle paginated clients response
        const clientsData = clientsResponse.data || clientsResponse
        setClients(clientsData)
        setProjects(projectsData)
      } else {
        throw new Error("Failed to fetch data")
      }
    } catch (error) {
      setError("Failed to load data. Please try again.")
    } finally {
      setIsDataLoading(false)
    }
  }

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleProjectSelect = (projectId: string) => {
    const project = projects.find((p) => p.id.toString() === projectId)
    setSelectedProject(project || null)
    form.setValue("projectId", projectId)
  }

  const handleClientSelect = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId)
    setSelectedClient(client || null)
    form.setValue("clientId", clientId)
  }

  const handleInstall = async (data: InstallationFormData) => {
    setIsLoading(true)
    setError("")

    try {
      const response = await fetch("/api/installations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to start installation")
      }

      const installation = await response.json()
      router.push(`/admin/installations/${installation.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                currentStep >= step.id
                  ? "bg-primary border-primary text-primary-foreground"
                  : "border-muted-foreground text-muted-foreground"
              }`}
            >
              {currentStep > step.id ? <CheckCircle className="h-4 w-4" /> : step.id}
            </div>
            <div className="ml-3">
              <p
                className={`text-sm font-medium ${
                  currentStep >= step.id ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {step.title}
              </p>
              <p className="text-xs text-muted-foreground">{step.description}</p>
            </div>
            {index < steps.length - 1 && (
              <div className={`w-16 h-0.5 mx-4 ${currentStep > step.id ? "bg-primary" : "bg-muted"}`} />
            )}
          </div>
        ))}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={form.handleSubmit(handleInstall)}>
        {/* Step 1: Select Project */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Select Project</CardTitle>
              <CardDescription>Choose which project you want to install</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isDataLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-2">Loading projects...</span>
                </div>
              ) : (
                <div className="grid gap-4">
                  {projects.map((project) => (
                  <div
                    key={project.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                      selectedProject?.id === project.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => handleProjectSelect(project.id.toString())}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">{project.name}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {project.status ? "Active" : "Inactive"} project
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Created: {new Date(project.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="outline">{project.sites.length} installations</Badge>
                    </div>
                  </div>
                ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 2: Select Client */}
        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Select Client</CardTitle>
              <CardDescription>Choose the client for this installation</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isDataLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="ml-2">Loading clients...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Client Organization</Label>
                    <Select onValueChange={handleClientSelect} value={form.watch("clientId")}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a client" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            <div>
                              <div className="font-medium">{client.name}</div>
                              <div className="text-sm text-muted-foreground">{client.email}</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedClient && (
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <h4 className="font-medium mb-2">Selected Client</h4>
                      <p className="text-sm">
                        <strong>Name:</strong> {selectedClient.name}
                      </p>
                      <p className="text-sm">
                        <strong>Email:</strong> {selectedClient.email}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 3: Review & Install */}
        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Review & Install</CardTitle>
              <CardDescription>Review the installation details and provide domain information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium mb-3">Project Details</h4>
                  {selectedProject && (
                    <div className="space-y-2">
                      <p className="text-sm">
                        <strong>Project:</strong> {selectedProject.name}
                      </p>
                      <p className="text-sm">
                        <strong>Status:</strong> {selectedProject.status ? "Active" : "Inactive"}
                      </p>
                      <p className="text-sm">
                        <strong>Existing Installations:</strong> {selectedProject.sites.length}
                      </p>
                      <p className="text-sm">
                        <strong>Created:</strong> {new Date(selectedProject.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="font-medium mb-3">Client Details</h4>
                  {selectedClient && (
                    <div className="space-y-2">
                      <p className="text-sm">
                        <strong>Organization:</strong> {selectedClient.name}
                      </p>
                      <p className="text-sm">
                        <strong>Email:</strong> {selectedClient.email}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="domain">Domain *</Label>
                <Input id="domain" {...form.register("domain")} placeholder="example.com" disabled={isLoading} />
                {form.formState.errors.domain && (
                  <p className="text-sm text-destructive">{form.formState.errors.domain.message}</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation */}
        <div className="flex justify-between">
          <Button type="button" variant="outline" onClick={handleBack} disabled={currentStep === 1 || isLoading || isDataLoading}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          {currentStep < 3 ? (
            <Button
              type="button"
              onClick={handleNext}
              disabled={isDataLoading || isLoading || (currentStep === 1 && !selectedProject) || (currentStep === 2 && !selectedClient)}
            >
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button type="submit" disabled={isLoading || isDataLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Starting Installation...
                </>
              ) : (
                "Start Installation"
              )}
            </Button>
          )}
        </div>
      </form>
    </div>
  )
}
