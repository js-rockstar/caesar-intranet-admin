"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  ArrowRight, 
  ArrowLeft,
  Search,
  Building2,
  Mail,
  MapPin,
  Plus,
  CheckCircle,
  Loader2,
  Download
} from "lucide-react"
import { ClientModal } from "@/components/clients/client-modal"
import { ImportCrmModal } from "@/components/clients/import-crm-modal"

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

export default function ClientSelectionPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get("sessionId")
  const projectId = searchParams.get("projectId")
  
  const [clients, setClients] = useState<Client[]>([])
  const [filteredClients, setFilteredClients] = useState<Client[]>([])
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isAutoSelecting, setIsAutoSelecting] = useState(false)
  const [hasClientToPreSelect, setHasClientToPreSelect] = useState(false)
  const [project, setProject] = useState<Project | null>(null)
  const [clientModal, setClientModal] = useState<{
    open: boolean
    client: Client | null
  }>({
    open: false,
    client: null,
  })
  const [importCrmModal, setImportCrmModal] = useState(false)

  useEffect(() => {
    if (projectId) {
      fetchProject()
      fetchClients()
    } else {
      router.push("/admin/installations/new")
    }
  }, [projectId, router])

  const fetchProject = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}`)
      if (response.ok) {
        const data = await response.json()
        setProject(data)
      }
    } catch (error) {
    }
  }

  const fetchClients = async () => {
    try {
      const response = await fetch("/api/clients?activeFilter=active&limit=1000")
      if (response.ok) {
        const responseData = await response.json()
        // Handle paginated response
        const clientsData = responseData.data || responseData
        setClients(clientsData)
        setFilteredClients(clientsData)
        
        // After clients are loaded, fetch session data if sessionId exists
        if (sessionId) {
          await fetchSessionData(clientsData)
        }
      }
    } catch (error) {
    } finally {
      setIsLoading(false)
    }
  }

  const fetchSessionData = async (clientsList?: Client[]) => {
    try {
      const response = await fetch(`/api/installations/session?sessionId=${sessionId}`)
      if (response.ok) {
        const sessionData = await response.json()
        
        // Check if there's a client to pre-select
        const hasClient = sessionData.stepData?.clientId && sessionData.stepData.clientId > 0
        setHasClientToPreSelect(hasClient)
        
        if (hasClient) {
          setIsAutoSelecting(true)
          // Use the provided clients list or the current state
          const clientsToSearch = clientsList || clients
          const previouslySelectedClient = clientsToSearch.find(client => client.id === sessionData.stepData.clientId)
          if (previouslySelectedClient) {
            setSelectedClient(previouslySelectedClient)
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

  const handleSearch = (term: string) => {
    setSearchTerm(term)
    if (term.trim() === "") {
      setFilteredClients(clients)
    } else {
      const filtered = clients.filter(client => {
        const primaryContact = client.contacts?.find(contact => contact.isPrimary)
        const primaryEmail = primaryContact?.email || ""
        
        return (
          client.name.toLowerCase().includes(term.toLowerCase()) ||
          primaryEmail.toLowerCase().includes(term.toLowerCase()) ||
          (client.city && client.city.toLowerCase().includes(term.toLowerCase()))
        )
      })
      setFilteredClients(filtered)
    }
  }

  const handleClientSelect = async (client: Client) => {
    setSelectedClient(client)
    
    // Update session data immediately when client is selected
    if (sessionId) {
      try {
        setIsSaving(true)
        // First, get the current session data to preserve existing values
        const currentSessionResponse = await fetch(`/api/installations/session?sessionId=${sessionId}`)
        let currentSessionData = {
          projectId: parseInt(projectId!),
          clientId: client.id,
          domain: "",
          adminEmail: "",
          adminPassword: "",
          currentStep: 'client_selection'
        }
        
        if (currentSessionResponse.ok) {
          const currentSession = await currentSessionResponse.json()
          // Preserve existing data and only update clientId and currentStep
          currentSessionData = {
            ...currentSession.stepData,
            clientId: client.id,
            currentStep: 'client_selection'
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
    if (selectedClient && sessionId) {
      try {
        setIsSaving(true)
        // First, get the current session data to preserve existing values
        const currentSessionResponse = await fetch(`/api/installations/session?sessionId=${sessionId}`)
        let currentSessionData = {
          projectId: parseInt(projectId!),
          clientId: selectedClient.id,
          domain: "",
          adminEmail: "",
          adminPassword: "",
          currentStep: 'config'
        }
        
        if (currentSessionResponse.ok) {
          const currentSession = await currentSessionResponse.json()
          // Preserve existing data and only update clientId and currentStep
          currentSessionData = {
            ...currentSession.stepData,
            clientId: selectedClient.id,
            currentStep: 'config'
          }
        }

        // Update session with selected client
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
          // Navigate to config step with session ID
          router.push(`/admin/installations/new/config?sessionId=${sessionId}&projectId=${projectId}&clientId=${selectedClient.id}`)
        } else {
          const error = await response.json()
          alert(error.error || "Failed to update session")
        }
      } catch (error) {
        alert("Failed to update session")
      } finally {
        setIsSaving(false)
      }
    }
  }

  const handleBack = async () => {
    if (sessionId) {
      try {
        setIsSaving(true)
        // First, get the current session data to preserve existing values
        const currentSessionResponse = await fetch(`/api/installations/session?sessionId=${sessionId}`)
        let currentSessionData = {
          projectId: parseInt(projectId!),
          clientId: selectedClient?.id || 0,
          domain: "",
          adminEmail: "",
          adminPassword: "",
          currentStep: 'project_selection'
        }
        
        if (currentSessionResponse.ok) {
          const currentSession = await currentSessionResponse.json()
          // Preserve existing data and only update clientId and currentStep
          currentSessionData = {
            ...currentSession.stepData,
            clientId: selectedClient?.id || 0,
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

        router.push(`/admin/installations/new?sessionId=${sessionId}`)
      } catch (error) {
        router.push(`/admin/installations/new?sessionId=${sessionId}`)
      } finally {
        setIsSaving(false)
      }
    } else {
      router.push("/admin/installations/new")
    }
  }

  const handleClientModalSuccess = () => {
    // Refresh clients list after successful creation
    fetchClients()
  }

  const handleClientImported = () => {
    // Refresh clients list after successful import
    fetchClients()
    // Auto-close the import modal after successful import
    setImportCrmModal(false)
  }


  if (isLoading || (sessionId && hasClientToPreSelect && isAutoSelecting)) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        
        <div className="flex items-center space-x-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center space-x-2">
              <Skeleton className="w-8 h-8 rounded-full" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-4 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        
        {isAutoSelecting && hasClientToPreSelect && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span className="text-muted-foreground">Loading previous client selection...</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Select Client</h1>
        <p className="text-muted-foreground">
          Choose the client for this installation. You can also create a new client if needed.
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
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground">
            <span className="text-sm font-medium">2</span>
          </div>
          <span className="text-sm font-medium">Client Selection</span>
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

      {/* Project Summary */}
      {project && (
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-lg">Selected Project</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">{project.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {project.sites.length} existing installations • Created {new Date(project.createdAt).toLocaleDateString()}
                </p>
              </div>
              <Badge variant={project.status ? "default" : "secondary"}>
                {project.status ? "Active" : "Inactive"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline"
            onClick={() => setImportCrmModal(true)}
          >
            <Download className="mr-2 h-4 w-4" />
            Import from CRM
          </Button>
          <Button 
            variant="outline"
            onClick={() => setClientModal({ open: true, client: null })}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create New Client
          </Button>
        </div>
      </div>

      {/* Client List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredClients.length === 0 ? (
          <div className="col-span-full text-center py-8">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">No clients found</h3>
            <p className="text-muted-foreground">
              {searchTerm 
                ? "No clients match your search criteria." 
                : "You don't have any clients yet."}
            </p>
          </div>
        ) : (
          filteredClients.map((client) => (
            <Card 
              key={client.id} 
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedClient?.id === client.id 
                  ? "ring-2 ring-primary border-primary" 
                  : "hover:border-primary/50"
              } ${isSaving ? "opacity-50 pointer-events-none" : ""}`}
              onClick={() => handleClientSelect(client)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{client.name}</CardTitle>
                  {selectedClient?.id === client.id && (
                    <CheckCircle className="h-5 w-5 text-primary" />
                  )}
                </div>
                <CardDescription className="flex items-center space-x-1">
                  <Mail className="h-3 w-3" />
                  <span>
                    {client.contacts?.find(contact => contact.isPrimary)?.email || "No email available"}
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Location */}
                {(client.city || client.state || client.country) && (
                  <div className="flex items-center space-x-1 text-sm text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span>
                      {[client.city, client.state, client.country]
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                  </div>
                )}

                {/* Stats */}
                <div className="flex items-center space-x-4 text-sm">
                  <div className="flex items-center space-x-1">
                    <Building2 className="h-3 w-3 text-muted-foreground" />
                    <span>{client._count?.sites || 0} sites</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Mail className="h-3 w-3 text-muted-foreground" />
                    <span>{client._count?.contacts || 0} contacts</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={handleBack} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <ArrowLeft className="mr-2 h-4 w-4" />
          )}
          {isSaving ? "Saving..." : "Back to Project Selection"}
        </Button>
        
        <Button 
          onClick={handleContinue} 
          disabled={!selectedClient || isSaving}
          size="lg"
        >
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <ArrowRight className="ml-2 h-4 w-4" />
          )}
          {isSaving ? "Saving..." : "Continue to Review"}
        </Button>
      </div>

      {/* Selected Client Summary */}
      {selectedClient && (
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="text-lg">Selected Client</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">{selectedClient.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {selectedClient.contacts?.find(contact => contact.isPrimary)?.email || "No email available"}
                </p>
                {(selectedClient.city || selectedClient.state) && (
                  <p className="text-sm text-muted-foreground">
                    {[selectedClient.city, selectedClient.state]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                )}
              </div>
              <div className="text-right">
                <div className="text-sm text-muted-foreground">
                  {selectedClient._count?.sites || 0} existing sites
                </div>
                <div className="text-sm text-muted-foreground">
                  {selectedClient._count?.contacts || 0} contacts
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Client Modal */}
      <ClientModal
        open={clientModal.open}
        onOpenChange={(open) => setClientModal(prev => ({ ...prev, open }))}
        client={clientModal.client}
        onSuccess={handleClientModalSuccess}
      />

      {/* Import CRM Modal */}
      <ImportCrmModal
        isOpen={importCrmModal}
        onClose={() => setImportCrmModal(false)}
        onClientImported={handleClientImported}
      />
    </div>
  )
}
