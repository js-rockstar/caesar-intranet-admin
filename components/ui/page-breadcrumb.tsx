"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Home, LayoutDashboard, Building2, Globe, Settings } from "lucide-react"

interface BreadcrumbItem {
  label: string
  href?: string
  icon?: React.ReactNode
}

export function PageBreadcrumb() {
  const pathname = usePathname()

  const getBreadcrumbs = (): BreadcrumbItem[] => {
    const segments = pathname.split('/').filter(Boolean)
    const breadcrumbs: BreadcrumbItem[] = [
      { label: "Home", href: "/admin/dashboard", icon: <Home className="h-4 w-4" /> }
    ]

    if (segments.length === 0) return breadcrumbs

    // Dashboard
    if (segments[0] === "admin") {
      if (segments[1] === "dashboard") {
        breadcrumbs.push({ 
          label: "Dashboard", 
          icon: <LayoutDashboard className="h-4 w-4" /> 
        })
      } else if (segments[1] === "clients") {
        breadcrumbs.push({ 
          label: "Clients", 
          href: "/admin/clients", 
          icon: <Building2 className="h-4 w-4" /> 
        })
        
        if (segments[2]) {
          breadcrumbs.push({ 
            label: `Client #${segments[2]}`, 
            icon: <Building2 className="h-4 w-4" /> 
          })
        }
      } else if (segments[1] === "sites") {
        breadcrumbs.push({ 
          label: "Sites", 
          href: "/admin/sites", 
          icon: <Globe className="h-4 w-4" /> 
        })
        
        if (segments[2]) {
          breadcrumbs.push({ 
            label: `Site #${segments[2]}`, 
            icon: <Globe className="h-4 w-4" /> 
          })
        }
      } else if (segments[1] === "installations") {
        breadcrumbs.push({ 
          label: "Installations", 
          href: "/admin/installations", 
          icon: <Settings className="h-4 w-4" /> 
        })
        
        if (segments[2] === "new") {
          breadcrumbs.push({ 
            label: "New Installation", 
            icon: <Settings className="h-4 w-4" /> 
          })
        } else if (segments[2]) {
          breadcrumbs.push({ 
            label: `Installation #${segments[2]}`, 
            icon: <Settings className="h-4 w-4" /> 
          })
        }
      } else if (segments[1] === "settings") {
        breadcrumbs.push({ 
          label: "Settings", 
          icon: <Settings className="h-4 w-4" /> 
        })
      }
    }

    return breadcrumbs
  }

  const breadcrumbs = getBreadcrumbs()

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {breadcrumbs.map((item, index) => (
          <div key={index} className="flex items-center">
            <BreadcrumbItem>
              {item.href && index < breadcrumbs.length - 1 ? (
                <BreadcrumbLink asChild>
                  <Link href={item.href} className="flex items-center gap-1">
                    {item.icon}
                    {item.label}
                  </Link>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage className="flex items-center gap-1">
                  {item.icon}
                  {item.label}
                </BreadcrumbPage>
              )}
            </BreadcrumbItem>
            {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
          </div>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
