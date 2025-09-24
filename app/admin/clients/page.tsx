"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Search, Filter, Download } from "lucide-react"
import { ClientModal } from "@/components/clients/client-modal"
import { ImportCrmModal } from "@/components/clients/import-crm-modal"
import { ClientsStats } from "@/components/stats/clients-stats"
import { ClientsTable } from "@/components/tables/clients-table"
import { PageBreadcrumb } from "@/components/ui/page-breadcrumb"

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

export default function ClientsPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [activeFilter, setActiveFilter] = useState<"active" | "inactive" | "all">("active")
  const [clientModal, setClientModal] = useState<{
    open: boolean
    client: Client | null
  }>({
    open: false,
    client: null,
  })
  const [importCrmModal, setImportCrmModal] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const handleClientModalSuccess = () => {
    // Trigger refresh of both table and stats
    setRefreshKey(prev => prev + 1)
  }

  const handleClientImported = () => {
    // Trigger refresh of both table and stats
    setRefreshKey(prev => prev + 1)
    // Auto-close the import modal after successful import
    setImportCrmModal(false)
  }


  return (
    <div className="space-y-6">
      <PageBreadcrumb />
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Clients</h1>
          <p className="text-muted-foreground">Manage your client organizations and their information</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={() => setImportCrmModal(true)} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Import from CRM
          </Button>
          <Button onClick={() => setClientModal({ open: true, client: null })}>
            <Plus className="mr-2 h-4 w-4" />
            Add Client
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <ClientsStats key={`stats-${refreshKey}`} />

      {/* Filters */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Client Filters</CardTitle>
          <Filter className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search clients..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={activeFilter} onValueChange={(value: "active" | "inactive" | "all") => setActiveFilter(value)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="inactive">Inactive Only</SelectItem>
                <SelectItem value="all">All Clients</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Clients Table */}
      <Card>
        <CardHeader>
          <CardTitle>Client Directory</CardTitle>
        </CardHeader>
        <CardContent>
          <ClientsTable 
            key={`table-${refreshKey}`}
            searchTerm={searchTerm}
            activeFilter={activeFilter}
            onEditClient={(client) => setClientModal({ open: true, client })}
          />
        </CardContent>
      </Card>

      <ClientModal
        open={clientModal.open}
        onOpenChange={(open) => setClientModal(prev => ({ ...prev, open }))}
        client={clientModal.client}
        onSuccess={handleClientModalSuccess}
      />

      <ImportCrmModal
        isOpen={importCrmModal}
        onClose={() => setImportCrmModal(false)}
        onClientImported={handleClientImported}
      />
    </div>
  )
}
