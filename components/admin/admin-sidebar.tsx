"use client"

import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { Building2, Globe, LayoutDashboard, Settings, Users, FolderOpen, Puzzle, FileText, Shield, Download, HelpCircle } from "lucide-react"
import { useAppDispatch } from "@/lib/store/hooks"
import { setPageLoading } from "@/lib/store/slices/loadingSlice"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"

const navigationItems = [
  {
    title: "Dashboard",
    url: "/admin/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Clients",
    url: "/admin/clients",
    icon: Building2,
  },
]

const siteManagementItems = [
  {
    title: "Sites",
    url: "/admin/sites",
    icon: Globe,
  },
  {
    title: "Logs",
    url: "/admin/logs",
    icon: FileText,
  },
  {
    title: "Plugins",
    url: "/admin/plugins",
    icon: Puzzle,
  },
  {
    title: "Licenses",
    url: "/admin/licenses",
    icon: Shield,
  },
  {
    title: "Updates",
    url: "/admin/updates",
    icon: Download,
  },
]

const systemItems = [
  {
    title: "Staff Management",
    url: "/admin/staff",
    icon: Users,
  },
  {
    title: "Settings",
    url: "/admin/settings",
    icon: Settings,
  },
  {
    title: "Support",
    url: "/admin/support",
    icon: HelpCircle,
  },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const dispatch = useAppDispatch()

  const handleNavigation = (url: string) => {
    if (pathname !== url) {
      // Set loading state first
      if (url.includes('/dashboard')) {
        dispatch(setPageLoading({ page: 'dashboard', loading: true }))
      } else if (url.includes('/clients')) {
        dispatch(setPageLoading({ page: 'clients', loading: true }))
      } else if (url.includes('/sites')) {
        dispatch(setPageLoading({ page: 'sites', loading: true }))
      } else if (url.includes('/installations')) {
        dispatch(setPageLoading({ page: 'installations', loading: true }))
      }
      
      // Use Next.js router for navigation
      router.push(url)
    }
  }

  return (
    <Sidebar variant="inset">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Building2 className="h-4 w-4" />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-semibold">Caesar Intranet</span>
            <span className="truncate text-xs text-muted-foreground">Admin Panel</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    isActive={pathname === item.url} 
                    tooltip={item.title}
                    onClick={() => handleNavigation(item.url)}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Site Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {siteManagementItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    isActive={pathname === item.url} 
                    tooltip={item.title}
                    onClick={() => handleNavigation(item.url)}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>System</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {systemItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    isActive={pathname === item.url} 
                    tooltip={item.title}
                    onClick={() => handleNavigation(item.url)}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

    </Sidebar>
  )
}
