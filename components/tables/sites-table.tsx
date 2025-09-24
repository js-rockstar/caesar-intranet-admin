"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { MoreHorizontal, Eye, Trash2, RefreshCw, ChevronLeft, ChevronRight, CheckCircle, XCircle, Clock, AlertTriangle, Key } from "lucide-react"
import { useAppDispatch } from "@/lib/store/hooks"
import { setPageLoading } from "@/lib/store/slices/loadingSlice"
import { Skeleton } from "@/components/ui/skeleton"
import { PageLoader } from "@/components/ui/loader"
import { CredentialsModal } from "@/components/installations/credentials-modal"

interface Site {
  id: number
  domain: string
  status: string
  createdAt: string
  client?: {
    id: number
    name: string
    email: string
  }
  project?: {
    id: number
    name: string
  }
  steps: Array<{
    id: number
    status: string
  }>
}

interface PaginationInfo {
  page: number
  limit: number
  totalCount: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

interface SitesTableProps {
  searchTerm: string
  statusFilter: string
  clientFilter: string
}

export function SitesTable({ searchTerm, statusFilter, clientFilter }: SitesTableProps) {
  const dispatch = useAppDispatch()
  const router = useRouter()
  const [sites, setSites] = useState<Site[]>([])
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 25,
    totalCount: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean
    siteId: number | null
    siteDomain: string | null
  }>({
    open: false,
    siteId: null,
    siteDomain: null
  })
  const [credentialsModal, setCredentialsModal] = useState<{
    open: boolean
    siteId: number | null
  }>({
    open: false,
    siteId: null
  })
  const [deleting, setDeleting] = useState(false)

  const fetchSites = async (page: number = 1) => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '25',
        search: searchTerm,
        statusFilter: statusFilter,
        clientFilter: clientFilter,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      })

      const response = await fetch(`/api/sites?${params}`)
      if (response.ok) {
        const result = await response.json()
        setSites(result.data)
        setPagination(result.pagination)
      } else {
        setError("Failed to fetch sites")
      }
    } catch (error) {
      setError("Error fetching sites")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSites(1) // Reset to page 1 when filters change
  }, [searchTerm, statusFilter, clientFilter])

  const handleSiteNavigation = (siteId: number) => {
    dispatch(setPageLoading({ page: 'sites', loading: true }))
    router.push(`/admin/sites/${siteId}`)
  }

  const handleDeleteClick = (siteId: number, siteDomain: string) => {
    setDeleteDialog({
      open: true,
      siteId,
      siteDomain
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
        // Refresh current page
        fetchSites(pagination.page)
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

  const handleViewCredentials = (siteId: number) => {
    setCredentialsModal({
      open: true,
      siteId: siteId
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "default"
      case "IN_PROGRESS":
        return "secondary"
      case "PENDING":
        return "outline"
      default:
        return "outline"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "IN_PROGRESS":
        return <Clock className="h-4 w-4 text-yellow-600" />
      case "PENDING":
        return <Clock className="h-4 w-4 text-gray-600" />
      default:
        return <XCircle className="h-4 w-4 text-red-600" />
    }
  }

  const handlePageChange = (newPage: number) => {
    fetchSites(newPage)
  }

  if (loading) {
    return <PageLoader message="Loading sites..." />
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={() => fetchSites(pagination.page)} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Showing {sites.length} of {pagination.totalCount} sites
          {pagination.totalPages > 1 && ` (Page ${pagination.page} of ${pagination.totalPages})`}
        </p>
        <Button onClick={() => fetchSites(pagination.page)} variant="outline" size="sm" disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>
      
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Domain</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Project</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="w-[70px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sites.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                {searchTerm || statusFilter !== 'all' || clientFilter !== 'all'
                  ? "No sites found matching your criteria."
                  : "No sites found. Add your first site to get started."}
              </TableCell>
            </TableRow>
          ) : (
            sites.map((site) => (
              <TableRow key={site.id}>
                <TableCell className="font-medium">
                  <Link
                    href={`/admin/sites/${site.id}`}
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                    onClick={() => handleSiteNavigation(site.id)}
                  >
                    {site.domain}
                  </Link>
                </TableCell>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(site.status)}
                    <Badge variant={getStatusColor(site.status) as any}>
                      {site.status}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  {site.client ? (
                    <Link
                      href={`/admin/clients/${site.client.id}`}
                      className="text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      {site.client.name}
                    </Link>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell>{site.project?.name || "—"}</TableCell>
                <TableCell>{new Date(site.createdAt).toLocaleDateString()}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleSiteNavigation(site.id)}>
                        <Eye className="mr-2 h-4 w-4" />
                        View
                      </DropdownMenuItem>
                      {site.status === "COMPLETED" && (
                        <DropdownMenuItem onClick={() => handleViewCredentials(site.id)}>
                          <Key className="mr-2 h-4 w-4" />
                          View Credentials
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem 
                        onClick={() => handleDeleteClick(site.id, site.domain)}
                        className="text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={!pagination.hasPrev || loading}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={!pagination.hasNext || loading}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog(prev => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <span>Delete Site</span>
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the site <strong>{deleteDialog.siteDomain}</strong>? 
              This action will permanently remove the site and all its associated installation steps. 
              This action cannot be undone.
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

      {/* Credentials Modal */}
      <CredentialsModal
        isOpen={credentialsModal.open}
        onClose={() => setCredentialsModal({ open: false, siteId: null })}
        siteId={credentialsModal.siteId || 0}
      />
    </div>
  )
}
