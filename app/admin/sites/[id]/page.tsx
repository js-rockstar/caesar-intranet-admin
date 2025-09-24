"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { PageLoader, TabLoader } from "@/components/ui/loader"
import { 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  Globe, 
  Users, 
  Plus,
  Trash2,
  MoreHorizontal,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Shield,
  Download,
  FileText,
  PlayCircle,
  AlertTriangle,
  Loader2,
  Folder,
  Archive,
  Key
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { PageBreadcrumb } from "@/components/ui/page-breadcrumb"
import { ClientInfoDisplay } from "@/components/clients/client-info-display"
import { CredentialsModal } from "@/components/installations/credentials-modal"
import Link from "next/link"

interface Site {
  id: number
  domain?: string
  status: string
  project: {
    id: number
    name: string
  }
  client: {
    id: number
    name: string
    type?: "ORGANIZATION" | "PERSON"
    address?: string
    apartment?: string
    city?: string
    state?: string
    zipCode?: string
    country?: string
    contacts?: Array<{
      id: number
      firstName: string
      lastName: string
      email?: string | null
      isPrimary: boolean
      gender?: string | null
      language?: string | null
    }>
    phones: Array<{
      id: number
      type: string
      number: string
      isPrimary: boolean
      isVerified: boolean
      contactId?: number
    }>
  }
  steps: Array<{
    id: number
    stepType: string
    status: string
    errorMsg?: string
    createdAt: string
  }>
  createdAt: string
  updatedAt: string
}

export default function SiteDetailPage() {
  const params = useParams()
  const router = useRouter()
  const siteId = params.id as string
  const [site, setSite] = useState<Site | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isResuming, setIsResuming] = useState(false)
  const [showCredentialsModal, setShowCredentialsModal] = useState(false)

  useEffect(() => {
    if (siteId) {
      fetchSite()
    }
  }, [siteId])

  const fetchSite = async () => {
    try {
      const response = await fetch(`/api/sites/${siteId}`)
      if (response.ok) {
        const data = await response.json()
        setSite(data)
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

  const handleResumeInstallation = async () => {
    setIsResuming(true)
    try {
      // First, fetch the session data to determine which step to resume from
      const response = await fetch(`/api/installations/session?sessionId=${siteId}`)
      if (response.ok) {
        const sessionData = await response.json()
        const currentStep = sessionData.stepData?.currentStep || 'project_selection'
        
        // Update the session to mark that we're resuming
        await fetch(`/api/installations/session?sessionId=${siteId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            stepData: {
              ...sessionData.stepData,
              currentStep: currentStep,
              resumedAt: new Date().toISOString()
            }
          })
        })
        
        // Navigate to the appropriate step based on currentStep
        switch (currentStep) {
          case 'project_selection':
            router.push(`/admin/installations/new?sessionId=${siteId}`)
            break
          case 'client_selection':
            router.push(`/admin/installations/new/client?sessionId=${siteId}&projectId=${sessionData.stepData.projectId}`)
            break
          case 'config':
            router.push(`/admin/installations/new/config?sessionId=${siteId}&projectId=${sessionData.stepData.projectId}&clientId=${sessionData.stepData.clientId}`)
            break
          case 'review':
          default:
            router.push(`/admin/installations/new/review?sessionId=${siteId}`)
            break
        }
      } else {
        router.push(`/admin/installations/new/review?sessionId=${siteId}`)
      }
    } catch (error) {
      router.push(`/admin/installations/new/review?sessionId=${siteId}`)
    } finally {
      setIsResuming(false)
    }
  }

  const isInstallationIncomplete = () => {
    return site?.status !== "COMPLETED"
  }

  if (isLoading) {
    return <PageLoader message="Loading site details..." />
  }

  if (!site) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <h1 className="text-2xl font-bold text-muted-foreground">Site not found</h1>
          <p className="text-muted-foreground">The site you're looking for doesn't exist.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageBreadcrumb />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">
            {site.domain || "No Domain"}
          </h1>
          <p className="text-muted-foreground">Site details and management</p>
        </div>
        
        {/* Action Buttons */}
        {isInstallationIncomplete() ? (
          <div className="flex flex-col items-end space-y-2">
            <Button 
              onClick={handleResumeInstallation}
              disabled={isResuming}
              className="bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-50"
            >
              {isResuming ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <PlayCircle className="mr-2 h-4 w-4" />
              )}
              {isResuming ? "Resuming..." : "Resume Installation"}
            </Button>
            <div className="flex items-center space-x-2 text-sm text-orange-600">
              <AlertTriangle className="h-4 w-4" />
              <span>Your installation is pending. Please click the button above to proceed.</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-end space-y-2">
            <Button 
              onClick={() => setShowCredentialsModal(true)}
              variant="outline"
            >
              <Key className="mr-2 h-4 w-4" />
              View Credentials
            </Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="client" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6 bg-muted/30 p-1 rounded-lg border-b-2 border-border/60">
          <TabsTrigger 
            value="client" 
            className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:-mb-0.5 transition-all duration-200 font-medium"
          >
            <Building2 className="h-4 w-4" />
            Client
          </TabsTrigger>
          <TabsTrigger 
            value="licenses" 
            className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:-mb-0.5 transition-all duration-200 font-medium"
          >
            <Shield className="h-4 w-4" />
            Licenses
          </TabsTrigger>
          <TabsTrigger 
            value="files" 
            className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:-mb-0.5 transition-all duration-200 font-medium"
          >
            <Folder className="h-4 w-4" />
            Files
          </TabsTrigger>
          <TabsTrigger 
            value="backups" 
            className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:-mb-0.5 transition-all duration-200 font-medium"
          >
            <Archive className="h-4 w-4" />
            Backups
          </TabsTrigger>
          <TabsTrigger 
            value="updates" 
            className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:-mb-0.5 transition-all duration-200 font-medium"
          >
            <Download className="h-4 w-4" />
            Updates
          </TabsTrigger>
          <TabsTrigger 
            value="logs" 
            className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:-mb-0.5 transition-all duration-200 font-medium"
          >
            <FileText className="h-4 w-4" />
            Logs
          </TabsTrigger>
        </TabsList>

        {/* Client Tab */}
        <TabsContent value="client" className="space-y-6 mt-6">
          <ClientInfoDisplay 
            client={site.client}
            showClientLink={true}
          />

          {/* Site Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Site Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Domain</label>
                  <p className="text-sm">{site.domain || "No domain set"}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Project</label>
                  <Badge variant="outline">{site.project.name}</Badge>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(site.status)}
                    <Badge variant={getStatusColor(site.status) as any}>
                      {site.status}
                    </Badge>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Created</label>
                  <p className="text-sm">{new Date(site.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
                  <p className="text-sm">{new Date(site.updatedAt).toLocaleDateString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Licenses Tab */}
        <TabsContent value="licenses" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Licenses
              </CardTitle>
              <CardDescription>
                Software licenses and certificates for this site
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">No licenses found</h3>
                <p className="text-muted-foreground">This site has no licenses or certificates yet.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Files Tab */}
        <TabsContent value="files" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Folder className="h-5 w-5" />
                Files
              </CardTitle>
              <CardDescription>
                File management and storage for this site
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Folder className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">No files found</h3>
                <p className="text-muted-foreground">This site has no files uploaded yet.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Backups Tab */}
        <TabsContent value="backups" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Archive className="h-5 w-5" />
                Backups
              </CardTitle>
              <CardDescription>
                Backup management and restore options for this site
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Archive className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">No backups found</h3>
                <p className="text-muted-foreground">This site has no backups created yet.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Updates Tab */}
        <TabsContent value="updates" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Updates
              </CardTitle>
              <CardDescription>
                Software updates and version history for this site
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Download className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">No updates found</h3>
                <p className="text-muted-foreground">This site has no update history yet.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Logs
              </CardTitle>
              <CardDescription>
                System logs and activity history for this site
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">No logs found</h3>
                <p className="text-muted-foreground">This site has no log entries yet.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Credentials Modal */}
      <CredentialsModal
        isOpen={showCredentialsModal}
        onClose={() => setShowCredentialsModal(false)}
        siteId={parseInt(siteId)}
      />
    </div>
  )
}
