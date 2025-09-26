"use client"

import React, { createContext, useContext, useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { UnifiedLoadingOverlay } from "@/components/ui/unified-loading-overlay"

interface LoadingContextType {
  isLoading: boolean
  setLoading: (loading: boolean) => void
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined)

export function useLoading() {
  const context = useContext(LoadingContext)
  if (context === undefined) {
    throw new Error("useLoading must be used within a LoadingProvider")
  }
  return context
}

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(false)
  const pathname = usePathname()

  const setLoading = (loading: boolean) => {
    setIsLoading(loading)
  }

  // Show loading on pathname changes and auto-hide after a delay
  useEffect(() => {
    setIsLoading(true)
    
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 300) // Increased delay to show loading for a bit longer

    return () => clearTimeout(timer)
  }, [pathname])

  return (
    <LoadingContext.Provider value={{ isLoading, setLoading }}>
      <UnifiedLoadingOverlay 
        page="dashboard"
        message="Loading page..."
      >
        {children}
      </UnifiedLoadingOverlay>
    </LoadingContext.Provider>
  )
}
