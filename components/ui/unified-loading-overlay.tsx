"use client"

import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAppSelector } from "@/lib/store/hooks"

interface UnifiedLoadingOverlayProps {
  children: React.ReactNode
  className?: string
  page?: 'dashboard' | 'clients' | 'sites' | 'installations'
  modal?: 'clientModal' | 'siteModal' | 'installationModal'
  action?: 'creating' | 'updating' | 'deleting'
  message?: string
}

export function UnifiedLoadingOverlay({ 
  children, 
  className, 
  page, 
  modal, 
  action,
  message 
}: UnifiedLoadingOverlayProps) {
  const loading = useAppSelector((state) => {
    if (page) return state.loading[page]
    if (modal) return state.loading[modal]
    if (action) return state.loading[action]
    return state.loading.global
  })

  const getLoadingMessage = () => {
    if (message) return message
    
    if (page) {
      switch (page) {
        case 'dashboard': return 'Loading Dashboard'
        case 'clients': return 'Loading Clients'
        case 'sites': return 'Loading Sites'
        case 'installations': return 'Loading Installations'
        default: return 'Loading...'
      }
    }
    
    if (modal) {
      switch (modal) {
        case 'clientModal': return 'Processing Client'
        case 'siteModal': return 'Processing Site'
        case 'installationModal': return 'Processing Installation'
        default: return 'Processing...'
      }
    }
    
    if (action) {
      switch (action) {
        case 'creating': return 'Creating...'
        case 'updating': return 'Updating...'
        case 'deleting': return 'Deleting...'
        default: return 'Processing...'
      }
    }
    
    return 'Loading...'
  }

  return (
    <div className={cn("relative", className)}>
      {children}
      {loading && (
        <div className="absolute inset-0 bg-white/90 backdrop-blur-md flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="flex flex-col items-center gap-4 p-6 bg-white/95 rounded-lg shadow-lg border">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">{getLoadingMessage()}</p>
              <p className="text-xs text-muted-foreground mt-1">Please wait while we process your request...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
