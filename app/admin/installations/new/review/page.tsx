"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { 
  ArrowRight, 
  ArrowLeft,
  Globe,
  Building2,
  Mail,
  MapPin,
  CheckCircle,
  Settings,
  CreditCard,
  AlertCircle,
  User,
  Database,
  Server,
  Cloud,
  FolderOpen,
  Loader2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ExternalLink
} from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Progress } from "@/components/ui/progress"
import InstallationTracker from "@/components/installations/installation-tracker"

interface Client {
  id: number
  name: string
  city?: string
  state?: string
  country?: string
  contacts?: Array<{
    id: number
    firstName: string
    lastName: string
    email?: string | null
    isPrimary: boolean
  }>
  _count?: {
    sites: number
    contacts: number
  }
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

export default function ReviewPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get("sessionId")
  
  const [client, setClient] = useState<Client | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [sessionData, setSessionData] = useState<{
    projectId: number
    clientId: number
    domain: string
    adminEmail: string
    adminPassword: string
    currentStep?: string
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [showInstallationTracker, setShowInstallationTracker] = useState(false)
  const [installationId, setInstallationId] = useState<number | null>(null)

  useEffect(() => {
    if (sessionId) {
      fetchSessionData()
    } else {
      router.push("/admin/installations/new")
    }
  }, [sessionId, router])

  const fetchSessionData = async () => {
    try {
      const response = await fetch(`/api/installations/session?sessionId=${sessionId}`)
      
      if (response.ok) {
        const sessionResponse = await response.json()
        setSessionData(sessionResponse.stepData)
        
        // Fetch client and project data
        const [clientResponse, projectResponse] = await Promise.all([
          fetch(`/api/clients/${sessionResponse.stepData.clientId}`),
          fetch(`/api/projects/${sessionResponse.stepData.projectId}`)
        ])

        if (clientResponse.ok && projectResponse.ok) {
          const [clientData, projectData] = await Promise.all([
            clientResponse.json(),
            projectResponse.json()
          ])
          setClient(clientData)
          setProject(projectData)
        }
      } else {
        router.push("/admin/installations/new")
      }
    } catch (error) {
      router.push("/admin/installations/new")
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack = async () => {
    if (sessionData) {
      try {
        
        const stepData = {
          ...sessionData,
          currentStep: "config"
        }
        
        // Update session data before navigating back
        const response = await fetch(`/api/installations/session?sessionId=${sessionId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            stepData: {
              ...sessionData,
              currentStep: "config"
            }
          })
        })
        
        if (response.ok) {
        } else {
          const error = await response.json()
        }
        
        const params = new URLSearchParams({
          projectId: sessionData.projectId.toString(),
          clientId: sessionData.clientId.toString(),
          sessionId: sessionId!
        })
        router.push(`/admin/installations/new/config?${params.toString()}`)
      } catch (error) {
        // Still navigate back even if session update fails
        const params = new URLSearchParams({
          projectId: sessionData.projectId.toString(),
          clientId: sessionData.clientId.toString(),
          sessionId: sessionId!
        })
        router.push(`/admin/installations/new/config?${params.toString()}`)
      }
    }
  }

  const handleCreateInstallation = async () => {
    if (!client || !project || !sessionData) {
      return
    }

    setIsCreating(true)
    try {
      const response = await fetch("/api/installations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientId: sessionData.clientId.toString(),
          projectId: sessionData.projectId.toString(),
          domain: sessionData.domain.trim(),
          adminEmail: sessionData.adminEmail.trim(),
          adminPassword: sessionData.adminPassword.trim(),
          sessionId: sessionId, // Pass the sessionId to update the existing temporary site
        }),
      })

      if (response.ok) {
        const installation = await response.json()
        
        // Set the installation ID and show the installation tracker
        setInstallationId(installation.id)
        setShowInstallationTracker(true)
        setIsCreating(false)
      } else {
        const error = await response.json()
        alert(error.error || "Failed to create installation")
        setIsCreating(false)
      }
    } catch (error) {
      alert("Failed to create installation")
      setIsCreating(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    )
  }


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Review Installation</h1>
        <p className="text-muted-foreground">
          Please review your installation details before proceeding.
        </p>
      </div>

      {/* Progress Indicator */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-muted-foreground">
            <span className="text-sm font-medium">1</span>
          </div>
          <span className="text-sm text-muted-foreground">Project Selection</span>
        </div>
        <div className="flex-1 h-px bg-border"></div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-muted-foreground">
            <span className="text-sm font-medium">2</span>
          </div>
          <span className="text-sm text-muted-foreground">Client Selection</span>
        </div>
        <div className="flex-1 h-px bg-border"></div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-muted-foreground">
            <span className="text-sm font-medium">3</span>
          </div>
          <span className="text-sm text-muted-foreground">Configuration</span>
        </div>
        <div className="flex-1 h-px bg-border"></div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground">
            <span className="text-sm font-medium">4</span>
          </div>
          <span className="text-sm font-medium">Review & Install</span>
        </div>
      </div>

      {/* Review Cards - Hide when installation is in progress */}
      {!showInstallationTracker && (
        <div className="grid gap-6">
          {/* Project Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Building2 className="h-5 w-5" />
                <span>Project Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Project Name</Label>
                  <p className="text-lg font-semibold">{project?.name || 'N/A'}</p>
                </div>
                <div className="flex flex-col space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                  <div>
                    <Badge variant={project?.status ? "default" : "secondary"}>
                      {project?.status ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Client Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>Client Information</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Client Name</Label>
                  <p className="text-lg font-semibold">{client?.name || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                  <p className="text-lg">
                    {client?.contacts?.find(contact => contact.isPrimary)?.email || 'N/A'}
                  </p>
                </div>
              </div>
              {client?.city && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Location</Label>
                  <p className="text-lg flex items-center space-x-1">
                    <MapPin className="h-4 w-4" />
                    <span>{client.city}{client.state && `, ${client.state}`}{client.country && `, ${client.country}`}</span>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Domain Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Globe className="h-5 w-5" />
                <span>Domain Configuration</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Website Domain</Label>
                  <p className="text-lg font-semibold">{sessionData?.domain || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Admin Email</Label>
                  <p className="text-lg">{sessionData?.adminEmail || 'N/A'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Installation Tracker - Show when installation is in progress */}
      {showInstallationTracker && installationId && (
        <InstallationTracker 
          installationId={installationId}
          sessionData={sessionData}
          onInstallationComplete={() => {
            // Optionally redirect or show success message
          }}
        />
      )}

      {/* Action Buttons - Hide when installation is in progress */}
      {!showInstallationTracker && (
      <div className="flex items-center justify-between pt-6">
        <Button variant="outline" onClick={handleBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Configuration
        </Button>
        
          <Button 
            onClick={handleCreateInstallation} 
            disabled={!sessionData?.domain?.trim() || !sessionData?.adminEmail?.trim() || isCreating}
            size="lg"
          >
          {isCreating ? (
            <>
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Starting Installation...
            </>
            ) : (
              <>
                Start Installation
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
        </Button>
      </div>
      )}
    </div>
  )
}
