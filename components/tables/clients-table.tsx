"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"
import { MoreHorizontal, Edit, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react"
import { useAppDispatch } from "@/lib/store/hooks"
import { setPageLoading } from "@/lib/store/slices/loadingSlice"
import { Skeleton } from "@/components/ui/skeleton"
import { PageLoader } from "@/components/ui/loader"

interface Client {
  id: number
  name: string
  city?: string
  state?: string
  active: boolean
  createdAt: string
  updatedAt: string
  phones: Array<{
    id: number
    type: string
    number: string
    isPrimary: boolean
    isVerified: boolean
  }>
  contacts: Array<{
    id: number
    firstName: string
    lastName: string
    email: string
    isPrimary: boolean
    gender?: string
    language?: string
  }>
  _count?: {
    sites: number
    contacts: number
  }
}

interface PaginationInfo {
  page: number
  limit: number
  totalCount: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

interface ClientsTableProps {
  searchTerm: string
  activeFilter: "active" | "inactive" | "all"
  onEditClient: (client: Client) => void
}

export function ClientsTable({ searchTerm, activeFilter, onEditClient }: ClientsTableProps) {
  const dispatch = useAppDispatch()
  const [clients, setClients] = useState<Client[]>([])
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

  const fetchClients = async (page: number = 1) => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '25',
        search: searchTerm,
        activeFilter: activeFilter,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      })

      const response = await fetch(`/api/clients?${params}`)
      if (response.ok) {
        const result = await response.json()
        setClients(result.data)
        setPagination(result.pagination)
      } else {
        setError("Failed to fetch clients")
      }
    } catch (error) {
      setError("Error fetching clients")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClients(1) // Reset to page 1 when filters change
  }, [searchTerm, activeFilter])

  const handleClientNavigation = (clientId: number) => {
    dispatch(setPageLoading({ page: 'clients', loading: true }))
  }

  const handleActiveToggle = async (clientId: number, newActiveStatus: boolean) => {
    try {
      const response = await fetch(`/api/clients/${clientId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ active: newActiveStatus }),
      })

      if (response.ok) {
        // Update local state
        setClients(prev => prev.map(client => 
          client.id === clientId ? { ...client, active: newActiveStatus } : client
        ))
        // Refresh current page to update counts
        fetchClients(pagination.page)
      } else {
        const error = await response.json()
        alert(error.error || "Failed to update client status")
      }
    } catch (error) {
      alert("Failed to update client status")
    }
  }

  const handlePageChange = (newPage: number) => {
    fetchClients(newPage)
  }

  if (loading) {
    return <PageLoader message="Loading clients..." />
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={() => fetchClients(pagination.page)} variant="outline">
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
          Showing {clients.length} of {pagination.totalCount} clients
          {pagination.totalPages > 1 && ` (Page ${pagination.page} of ${pagination.totalPages})`}
        </p>
        <Button onClick={() => fetchClients(pagination.page)} variant="outline" size="sm" disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>
      
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Client Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Active</TableHead>
            <TableHead>Sites</TableHead>
            <TableHead>Contacts</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="w-[70px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                {searchTerm || activeFilter !== 'all'
                  ? "No clients found matching your criteria."
                  : "No clients found. Add your first client to get started."}
              </TableCell>
            </TableRow>
          ) : (
            clients.map((client) => (
              <TableRow key={client.id}>
                <TableCell className="font-medium">
                  <Link
                    href={`/admin/clients/${client.id}`}
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                    onClick={() => handleClientNavigation(client.id)}
                  >
                    {client.name}
                  </Link>
                </TableCell>
                <TableCell>
                  {client.contacts && client.contacts.length > 0 
                    ? client.contacts.find(c => c.isPrimary)?.email || client.contacts[0].email
                    : "—"
                  }
                </TableCell>
                <TableCell>{client.city && client.state ? `${client.city}, ${client.state}` : "—"}</TableCell>
                <TableCell>
                  <Switch
                    checked={client.active}
                    onCheckedChange={(checked) => handleActiveToggle(client.id, checked)}
                  />
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{client._count?.sites || 0}</Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{client._count?.contacts || 0}</Badge>
                </TableCell>
                <TableCell>{new Date(client.createdAt).toLocaleDateString()}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEditClient(client)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
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
    </div>
  )
}
