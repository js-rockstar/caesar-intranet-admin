"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, Globe, Shield, Users } from "lucide-react"
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks"
import { setPageLoading, setGlobalLoading } from "@/lib/store/slices/loadingSlice"
import { setDashboardStats, setDashboardError } from "@/lib/store/slices/dashboardSlice"
import { DashboardSkeleton } from "@/components/ui/page-skeleton"
import { PageBreadcrumb } from "@/components/ui/page-breadcrumb"

interface DashboardStats {
  activeClients: number
  activeSites: number
  activeLicenses: number
  recentSites: Array<{
    id: number
    domain: string
    status: string
    client: {
      id: number
      name: string
    }
    project: {
      name: string
    }
    createdAt: string
  }>
  recentClients: Array<{
    id: number
    name: string
    email: string
    createdAt: string
  }>
}

export default function AdminDashboard() {
  const dispatch = useAppDispatch()
  const { stats } = useAppSelector((state) => state.dashboard) as { stats: DashboardStats | null }
  const loading = useAppSelector((state) => state.loading.dashboard)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      dispatch(setPageLoading({ page: 'dashboard', loading: true }))
      const response = await fetch("/api/dashboard/stats")
      if (response.ok) {
        const data = await response.json()
        dispatch(setDashboardStats(data))
        dispatch(setPageLoading({ page: 'dashboard', loading: false }))
      } else {
        throw new Error('Failed to fetch stats')
      }
    } catch (error) {
      dispatch(setDashboardError('Failed to fetch dashboard stats'))
      dispatch(setPageLoading({ page: 'dashboard', loading: false }))
    }
  }

  const handleSiteNavigation = (siteId: number) => {
    dispatch(setPageLoading({ page: 'sites', loading: true }))
  }

  const handleClientNavigation = (clientId: number) => {
    dispatch(setPageLoading({ page: 'clients', loading: true }))
  }

  if (loading) {
    return <DashboardSkeleton />
  }

  return (
    <div className="space-y-6">
      <PageBreadcrumb />
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to Caesar Intranet. Here's an overview of your system.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.activeClients || 0}</div>
              <p className="text-xs text-muted-foreground">Currently active clients</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Sites</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.activeSites || 0}</div>
              <p className="text-xs text-muted-foreground">Sites under management</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Licenses</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.activeLicenses || 0}</div>
              <p className="text-xs text-muted-foreground">Active software licenses</p>
            </CardContent>
          </Card>
        </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Sites</CardTitle>
            <CardDescription>Latest 5 sites added to the system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
                {stats?.recentSites?.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No sites found</p>
                ) : (
                  stats?.recentSites?.map((site: any) => (
                    <div key={site.id} className="flex items-center space-x-4">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center space-x-2">
                        <Link 
                          href={`/admin/sites/${site.id}`}
                          className="text-sm font-medium leading-none text-blue-600 hover:text-blue-800 hover:underline"
                          onClick={() => handleSiteNavigation(site.id)}
                        >
                          {site.domain || "No domain"}
                        </Link>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        <Link 
                          href={`/admin/clients/${site.client.id}`}
                          className="text-blue-600 hover:text-blue-800 hover:underline"
                          onClick={() => handleClientNavigation(site.client.id)}
                        >
                          {site.client.name}
                        </Link>
                        {" • "}
                        {site.project.name} • {new Date(site.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  ))
                )}
              </div>
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Recent Clients</CardTitle>
            <CardDescription>Latest 5 clients added to the system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
                {stats?.recentClients?.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No clients found</p>
                ) : (
                  stats?.recentClients?.map((client: any) => (
                    <div key={client.id} className="flex items-center space-x-4">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <div className="space-y-1 flex-1">
                        <Link 
                          href={`/admin/clients/${client.id}`}
                          className="text-sm font-medium leading-none text-blue-600 hover:text-blue-800 hover:underline"
                          onClick={() => handleClientNavigation(client.id)}
                        >
                          {client.name}
                        </Link>
                        <p className="text-sm text-muted-foreground">
                          {client.email} • {new Date(client.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
