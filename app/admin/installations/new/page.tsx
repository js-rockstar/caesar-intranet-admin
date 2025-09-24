"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  ArrowRight, 
  Globe, 
  Building2, 
  Settings, 
  CheckCircle,
  Clock,
  Users,
  Loader2
} from "lucide-react"

interface Project {
  id: number
  name: string
  domain: string
  status: boolean
  sites: Array<{
    id: number
    domain: string
    status: string
  }>
  createdAt: string
  updatedAt: string
}

export default function NewInstallationPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get("sessionId")
  const clientId = searchParams.get("clientId")
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isAutoSelecting, setIsAutoSelecting] = useState(false)
  const [hasProjectToPreSelect, setHasProjectToPreSelect] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch("/api/projects")
      
      if (!response.ok) {
        throw new Error("Failed to fetch projects")
      }
      
      const data = await response.json()
      setProjects(data)
      
        // After projects are loaded, fetch session data if sessionId exists
        if (sessionId) {
          await fetchSessionData(data)
        }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load projects")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchSessionData = async (projectsList?: Project[]) => {
    try {
      const response = await fetch(`/api/installations/session?sessionId=${sessionId}`)
      if (response.ok) {
        const sessionData = await response.json()
        
        // Check if there's a project to pre-select
        const hasProject = sessionData.stepData?.projectId && sessionData.stepData.projectId > 0
        setHasProjectToPreSelect(hasProject)
        
        if (hasProject) {
          setIsAutoSelecting(true)
          // Use the provided projects list or the current state
          const projectsToSearch = projectsList || projects
          const previouslySelectedProject = projectsToSearch.find(project => project.id === sessionData.stepData.projectId)
          if (previouslySelectedProject) {
            setSelectedProject(previouslySelectedProject)
          } else {
          }
        } else {
        }
      }
    } catch (error) {
    } finally {
      setIsAutoSelecting(false)
    }
  }

  const handleProjectSelect = async (project: Project) => {
    setSelectedProject(project)
    
    // If we have a sessionId, update the session data immediately
    if (sessionId) {
      try {
        setIsSaving(true)
        // First, get the current session data to preserve existing values
        const currentSessionResponse = await fetch(`/api/installations/session?sessionId=${sessionId}`)
        let currentSessionData = {
          projectId: project.id,
          clientId: 0,
          domain: "",
          adminEmail: "",
          adminPassword: "",
          currentStep: 'project_selection'
        }
        
        if (currentSessionResponse.ok) {
          const currentSession = await currentSessionResponse.json()
          // Preserve existing data and only update projectId and currentStep
          currentSessionData = {
            ...currentSession.stepData,
            projectId: project.id,
            currentStep: 'project_selection'
          }
        }

        await fetch(`/api/installations/session?sessionId=${sessionId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            stepData: currentSessionData
          })
        })
      } catch (error) {
      } finally {
        setIsSaving(false)
      }
    }
  }

  const handleContinue = async () => {
    if (selectedProject) {
      try {
        setIsSaving(true)
        
        if (sessionId) {
          // First, get the current session data to preserve existing values
          const currentSessionResponse = await fetch(`/api/installations/session?sessionId=${sessionId}`)
          let currentSessionData = {
            projectId: selectedProject.id,
            clientId: clientId ? parseInt(clientId) : 0,
            domain: "",
            adminEmail: "",
            adminPassword: "",
            currentStep: 'client_selection'
          }
          
          if (currentSessionResponse.ok) {
            const currentSession = await currentSessionResponse.json()
            // Preserve existing data and only update projectId and currentStep
            currentSessionData = {
              ...currentSession.stepData,
              projectId: selectedProject.id,
              currentStep: 'client_selection'
            }
          }

          const response = await fetch(`/api/installations/session?sessionId=${sessionId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              stepData: currentSessionData
            })
          })

          if (response.ok) {
            // Navigate to client selection with existing session ID
            const clientParam = clientId ? `&clientId=${clientId}` : ''
            router.push(`/admin/installations/new/client?sessionId=${sessionId}&projectId=${selectedProject.id}${clientParam}`)
          } else {
            const error = await response.json()
            alert(error.error || "Failed to update installation session")
          }
        } else {
          // Create new session
          const sessionData = {
            projectId: selectedProject.id,
            clientId: clientId ? parseInt(clientId) : 0, // Pre-select client if provided
            domain: "", // Will be updated when domain is configured
            adminEmail: "", // Will be updated when admin credentials are set
            adminPassword: "", // Will be updated when admin credentials are set
            currentStep: 'project_selection'
          }

          const response = await fetch('/api/installations/session', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              stepData: sessionData
            })
          })

          if (response.ok) {
            const result = await response.json()
            // Navigate to client selection with session ID
            const clientParam = clientId ? `&clientId=${clientId}` : ''
            router.push(`/admin/installations/new/client?sessionId=${result.sessionId}&projectId=${selectedProject.id}${clientParam}`)
          } else {
            const error = await response.json()
            alert(error.error || "Failed to create installation session")
          }
        }
      } catch (error) {
        alert("Failed to create/update installation session")
      } finally {
        setIsSaving(false)
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Create New Installation</h1>
        <p className="text-muted-foreground">
          Set up a new website installation for your client. Choose a project template to get started.
        </p>
      </div>

      {/* Progress Indicator */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground">
            <span className="text-sm font-medium">1</span>
          </div>
          <span className="text-sm font-medium">Project Selection</span>
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
          <span className="text-sm text-muted-foreground">Review & Confirm</span>
        </div>
        <div className="flex-1 h-px bg-border"></div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-muted-foreground">
            <span className="text-sm font-medium">4</span>
          </div>
          <span className="text-sm text-muted-foreground">Installation</span>
        </div>
      </div>

      {/* Project Selection */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Choose a Project</h2>
        <p className="text-muted-foreground">
          Select the type of website installation you want to create for your client.
        </p>
        
        {isLoading || (sessionId && hasProjectToPreSelect && isAutoSelecting) ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">
              {isLoading ? "Loading projects..." : "Loading previous selections..."}
            </span>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={fetchProjects} variant="outline">
              Try Again
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
                <Card 
                  key={project.id} 
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedProject?.id === project.id 
                      ? "ring-2 ring-primary border-primary" 
                      : "hover:border-primary/50"
                  } ${isSaving ? "opacity-50 pointer-events-none" : ""}`}
                  onClick={() => handleProjectSelect(project)}
                >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{project.name}</CardTitle>
                    <Badge variant={project.status ? "default" : "secondary"}>
                      {project.status ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <CardDescription>
                    Complete website setup with all necessary components
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Project Info */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Domain:</span>
                      <span className="font-medium text-blue-600">{project.domain}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Existing Installations:</span>
                      <span className="font-medium">{project.sites.length}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Created:</span>
                      <span className="font-medium">{new Date(project.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <Globe className="h-3 w-3" />
                      <span>Domain Setup</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Settings className="h-3 w-3" />
                      <span>Auto Config</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Users className="h-3 w-3" />
                      <span>User Access</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Continue Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleContinue} 
          disabled={!selectedProject || isSaving}
          size="lg"
        >
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <ArrowRight className="ml-2 h-4 w-4" />
          )}
          {isSaving ? "Saving..." : "Continue to Client Selection"}
        </Button>
      </div>

      {/* Selected Project Summary */}
      {selectedProject && (
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-lg">Selected Project</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">{selectedProject.name}</h3>
                <p className="text-sm text-muted-foreground">
                  Domain: <span className="font-medium text-blue-600">{selectedProject.domain}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  {selectedProject.sites.length} existing installations
                </p>
                <p className="text-sm text-muted-foreground">
                  Created: {new Date(selectedProject.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="text-right">
                <Badge variant={selectedProject.status ? "default" : "secondary"}>
                  {selectedProject.status ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
