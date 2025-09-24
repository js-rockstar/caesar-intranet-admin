"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { PageLoader, TabLoader } from "@/components/ui/loader"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  Globe, 
  Users, 
  Plus,
  Edit,
  Trash2,
  MoreHorizontal,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  RefreshCw,
  Key
} from "lucide-react"
import { getCountryName } from "@/components/ui/countries-select"
import { ClientInfoDisplay } from "@/components/clients/client-info-display"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { LoadingLink } from "@/components/ui/loading-link"
import { PageBreadcrumb } from "@/components/ui/page-breadcrumb"
import { ClientModal } from "@/components/clients/client-modal"
import { CredentialsModal } from "@/components/installations/credentials-modal"
import Link from "next/link"

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
  phones: Array<{
    id: number
    type: string
    number: string
    isPrimary: boolean
    isVerified: boolean
    contactId?: number
  }>
  contacts: Array<{
    id: number
    firstName: string
    lastName: string
    email?: string | null
    phone?: string
    isPrimary: boolean
    gender?: string
    language?: string
  }>
  sites: Array<{
    id: number
    domain?: string
    status: string
    project: {
      id: number
      name: string
    }
    createdAt: string
  }>
  createdAt: string
  updatedAt: string
}

export default function ClientDetailPage() {
  const params = useParams()
  const clientId = params.id as string
  const [client, setClient] = useState<Client | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [clientModal, setClientModal] = useState<{
    open: boolean
    client: Client | null
  }>({
    open: false,
    client: null,
  })
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; siteId: number | null; siteDomain: string | null }>({ open: false, siteId: null, siteDomain: null })
  const [credentialsModal, setCredentialsModal] = useState<{ open: boolean; siteId: number | null }>({ open: false, siteId: null })
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (clientId) {
      fetchClient()
    }
  }, [clientId])

  const fetchClient = async () => {
    try {
      const response = await fetch(`/api/clients/${clientId}`)
      if (response.ok) {
        const data = await response.json()
        setClient(data)
      }
    } catch (error) {
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "default"
      case "IN_PROGRESS":
        return "secondary"
      case "FAILED":
        return "destructive"
      default:
        return "outline"
    }
  }

  const handleDeleteClick = (siteId: number, siteDomain: string) => {
    setDeleteDialog({
      open: true,
      siteId,
      siteDomain
    })
  }

  const handleViewCredentials = (siteId: number) => {
    setCredentialsModal({
      open: true,
      siteId: siteId
    })
  }

  const handleDeleteConfirm = async () => {
    if (!deleteDialog.siteId) return

    try {
      setDeleting(true)
      const response = await fetch(`/api/sites/${deleteDialog.siteId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        // Refresh client data to update sites list
        fetchClient()
        setDeleteDialog({ open: false, siteId: null, siteDomain: null })
      } else {
        const error = await response.json()
        alert(error.error || "Failed to delete site")
      }
    } catch (error) {
      alert("Failed to delete site")
    } finally {
      setDeleting(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "IN_PROGRESS":
        return <Clock className="h-4 w-4 text-blue-500" />
      case "FAILED":
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
    }
  }

  if (isLoading) {
    return <PageLoader message="Loading client details..." />
  }

  if (!client) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <h1 className="text-2xl font-bold text-muted-foreground">Client not found</h1>
          <p className="text-muted-foreground">The client you're looking for doesn't exist.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageBreadcrumb />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{client.name}</h1>
          <p className="text-muted-foreground">Client organization details and management</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setClientModal({ open: true, client: client })}
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit Client
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/admin/installations/new?clientId=${client.id}`}>
              <Plus className="mr-2 h-4 w-4" />
              Add Site
            </Link>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="details" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 bg-muted/30 p-1 rounded-lg border-b-2 border-border/60">
          <TabsTrigger 
            value="details" 
            className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:-mb-0.5 transition-all duration-200 font-medium"
          >
            <Building2 className="h-4 w-4" />
            Details
          </TabsTrigger>
          <TabsTrigger 
            value="contacts" 
            className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:-mb-0.5 transition-all duration-200 font-medium"
          >
            <Users className="h-4 w-4" />
            Contacts
            {client.contacts && client.contacts.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center">
                {client.contacts.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger 
            value="sites" 
            className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:-mb-0.5 transition-all duration-200 font-medium"
          >
            <Globe className="h-4 w-4" />
            Sites
            {client.sites && client.sites.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center">
                {client.sites.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Details Tab */}
        <TabsContent value="details" className="space-y-6 mt-6">
          <ClientInfoDisplay 
            client={client}
            showEditButton={true}
            onEditClick={() => setClientModal({ open: true, client: client })}
          />

          {/* Statistics */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{client.contacts?.length || 0}</div>
                <p className="text-xs text-muted-foreground">Contact persons</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Sites</CardTitle>
                <Globe className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{client.sites?.length || 0}</div>
                <p className="text-xs text-muted-foreground">Active sites</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Member Since</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {new Date(client.createdAt).toLocaleDateString()}
                </div>
                <p className="text-xs text-muted-foreground">Client since</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Contacts Tab */}
        <TabsContent value="contacts" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Contacts
              </CardTitle>
              <CardDescription>
                Contact persons associated with this client
              </CardDescription>
            </CardHeader>
            <CardContent>
              {client.contacts && client.contacts.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Gender</TableHead>
                      <TableHead>Language</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {client.contacts.map((contact) => (
                      <TableRow key={contact.id}>
                        <TableCell className="font-medium">
                          {contact.firstName} {contact.lastName}
                          {contact.isPrimary && (
                            <Badge variant="secondary" className="ml-2 text-xs">Primary</Badge>
                          )}
                        </TableCell>
                        <TableCell>{contact.email}</TableCell>
                        <TableCell>
                          {client.phones && client.phones.length > 0 
                            ? client.phones.find(p => p.contactId === contact.id)?.number || "—"
                            : "—"
                          }
                        </TableCell>
                        <TableCell>
                          {contact.gender 
                            ? contact.gender.charAt(0).toUpperCase() + contact.gender.slice(1).toLowerCase()
                            : "—"
                          }
                        </TableCell>
                        <TableCell>
                          {contact.language && contact.language.trim() !== ""
                            ? contact.language.charAt(0).toUpperCase() + contact.language.slice(1).toLowerCase()
                            : "—"
                          }
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium">No contacts</h3>
                  <p className="text-muted-foreground">This client has no contact persons yet.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sites Tab */}
        <TabsContent value="sites" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Sites
              </CardTitle>
              <CardDescription>
                Websites and installations associated with this client
              </CardDescription>
            </CardHeader>
            <CardContent>
              {client.sites && client.sites.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Domain</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="w-[70px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {client.sites.map((site) => (
                      <TableRow key={site.id}>
                        <TableCell className="font-medium">
                          <Link 
                            href={`/admin/sites/${site.id}`}
                            className="text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {site.domain || "No domain"}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{site.project.name}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(site.status)}
                            <Badge variant={getStatusColor(site.status) as any}>
                              {site.status}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>{new Date(site.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/admin/sites/${site.id}`}>
                                  <Globe className="mr-2 h-4 w-4" />
                                  View
                                </Link>
                              </DropdownMenuItem>
                              {site.status === "COMPLETED" && (
                                <DropdownMenuItem onClick={() => handleViewCredentials(site.id)}>
                                  <Key className="mr-2 h-4 w-4" />
                                  View Credentials
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem 
                                onClick={() => handleDeleteClick(site.id, site.domain || '')}
                                className="text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium">No sites</h3>
                  <p className="text-muted-foreground">This client has no sites yet.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ClientModal
        open={clientModal.open}
        onOpenChange={(open) => setClientModal(prev => ({ ...prev, open }))}
        client={clientModal.client}
        onSuccess={async () => {
          // Close the modal first
          setClientModal({ open: false, client: null })
          
          // Refresh client data after successful edit
          if (clientId) {
            await fetchClient()
          }
        }}
      />

      {/* Credentials Modal */}
      <CredentialsModal
        isOpen={credentialsModal.open}
        onClose={() => setCredentialsModal({ open: false, siteId: null })}
        siteId={credentialsModal.siteId || 0}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog(prev => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Site</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the site "{deleteDialog.siteDomain}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {deleting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Site
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}