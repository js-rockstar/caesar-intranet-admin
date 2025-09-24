"use client"

import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface LoadingOverlayProps {
  isLoading: boolean
  className?: string
  children?: React.ReactNode
}

export function LoadingOverlay({ isLoading, className, children }: LoadingOverlayProps) {
  return (
    <div className={cn("relative", className)}>
      {children}
      {isLoading && (
        <div className="absolute inset-0 bg-white/90 backdrop-blur-md flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="flex flex-col items-center gap-4 p-6 bg-white/95 rounded-lg shadow-lg border">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">Loading Dashboard</p>
              <p className="text-xs text-muted-foreground mt-1">Please wait while we fetch your data...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
