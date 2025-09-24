"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Search, Download, CheckCircle, XCircle, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { formatPhoneNumber } from "@/lib/utils/phone"

interface CrmClient {
  id: string
  companyName: string
  type: string
  address?: string
  city?: string
  state?: string
  zip?: string
  country?: string
  createdDate: string
  website?: string
  phone?: string
  primaryContact?: string
  primaryEmail?: string
  totalProjects?: string
  clientGroups?: string
  isImported: boolean
}

interface ImportCrmModalProps {
  isOpen: boolean
  onClose: () => void
  onClientImported: () => void
}

export function ImportCrmModal({ isOpen, onClose, onClientImported }: ImportCrmModalProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [clients, setClients] = useState<CrmClient[]>([])
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [totalRecords, setTotalRecords] = useState(0)
  const [isSearchMode, setIsSearchMode] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const limit = 25

  // Fetch clients from CRM
  const fetchClients = async (offset: number = 0, search: string = "") => {
    try {
      setLoading(true)
      setError(null)

      let url: string
      if (search.trim()) {
        url = `/api/crm/clients/search/${encodeURIComponent(search.trim())}`
        setIsSearchMode(true)
      } else {
        url = `/api/crm/clients?offset=${offset}&limit=${limit}`
        setIsSearchMode(false)
      }

      const response = await fetch(url)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch clients")
      }

      if (search.trim()) {
        setClients(data.clients || [])
        setTotalRecords(data.totalResults || 0)
      } else {
        setClients(data.clients || [])
        setTotalRecords(data.totalRecords || 0)
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to fetch clients")
      setClients([])
    } finally {
      setLoading(false)
    }
  }

  // Handle search
  const handleSearch = () => {
    if (searchTerm.trim()) {
      fetchClients(0, searchTerm.trim())
      setCurrentPage(0)
    } else {
      fetchClients(0, "")
      setCurrentPage(0)
    }
  }

  // Handle import client
  const handleImportClient = async (client: CrmClient) => {
    try {
      setImporting(client.id)
      
      const response = await fetch("/api/crm/clients/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          crmClientId: client.id,
          companyName: client.companyName,
          type: client.type,
          address: client.address,
          city: client.city,
          state: client.state,
          zip: client.zip,
          country: client.country,
          website: client.website,
          phone: client.phone ? formatPhoneNumber(client.phone) : client.phone,
          primaryContact: client.primaryContact,
          primaryEmail: client.primaryEmail,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Failed to import client")
      }

      // Update the client as imported
      setClients(prev => prev.map(c => 
        c.id === client.id ? { ...c, isImported: true } : c
      ))

      toast.success(`Client "${client.companyName}" imported successfully`)
      onClientImported()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to import client")
    } finally {
      setImporting(null)
    }
  }

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    if (!isSearchMode) {
      setCurrentPage(newPage)
      fetchClients(newPage * limit)
    }
  }

  // Load initial data when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchClients(0)
      setSearchTerm("")
      setCurrentPage(0)
      setIsSearchMode(false)
      setError(null)
    }
  }, [isOpen])

  // Handle Enter key in search
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch()
    }
  }

  const totalPages = Math.ceil(totalRecords / limit)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Download className="h-5 w-5" />
            <span>Import Clients from CRM</span>
          </DialogTitle>
        </DialogHeader>

        {/* Search Section */}
        <div className="flex space-x-2 pb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search clients by name, email, or company..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={handleKeyPress}
              className="pl-10"
            />
          </div>
          <Button onClick={handleSearch} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Search
          </Button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
            <div className="flex items-center space-x-2">
              <XCircle className="h-4 w-4 text-red-600" />
              <span className="text-red-800 text-sm">{error}</span>
            </div>
          </div>
        )}

        {/* Table Section */}
        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                // Loading skeletons
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-20" /></TableCell>
                  </TableRow>
                ))
              ) : clients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    {loading && isSearchMode ? "Searching..." : isSearchMode ? "No clients found matching your search." : "No clients available."}
                  </TableCell>
                </TableRow>
              ) : (
                clients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">
                      <div>
                        <div>{client.companyName}</div>
                        {client.website && (
                          <div className="text-xs text-muted-foreground">{client.website}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={client.type === "organization" ? "default" : "secondary"}>
                        {client.type
                          .split(/[_\s-]+/)
                          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                          .join(' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>{client.primaryContact || "-"}</TableCell>
                    <TableCell>{client.primaryEmail || "-"}</TableCell>
                    <TableCell>{client.phone ? formatPhoneNumber(client.phone) : "-"}</TableCell>
                    <TableCell>
                      {[client.city, client.state, client.country].filter(Boolean).join(", ") || "-"}
                    </TableCell>
                    <TableCell>
                      {client.isImported ? (
                        <Badge variant="outline" className="text-green-600 border-green-200">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Imported
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-blue-600 border-blue-200">
                          Available
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {client.isImported ? (
                        <Button variant="outline" size="sm" disabled>
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Imported
                        </Button>
                      ) : (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleImportClient(client)}
                          disabled={importing === client.id}
                        >
                          {importing === client.id ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-1" />
                          ) : (
                            <Download className="h-4 w-4 mr-1" />
                          )}
                          Import
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {!isSearchMode && totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              Showing {currentPage * limit + 1} to {Math.min((currentPage + 1) * limit, totalRecords)} of {totalRecords} clients
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 0}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages - 1}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Search Results Info */}
        {isSearchMode && !error && !loading && clients.length > 0 && (
          <div className="pt-4 border-t">
            <div className="text-sm text-muted-foreground">
              Found {totalRecords} clients matching "{searchTerm}"
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
