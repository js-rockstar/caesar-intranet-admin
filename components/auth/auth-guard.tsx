"use client"

import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, ReactNode } from "react"

interface AuthGuardProps {
  children: ReactNode
  requireAuth?: boolean
  redirectTo?: string
}

export function AuthGuard({ 
  children, 
  requireAuth = true, 
  redirectTo = "/auth/login" 
}: AuthGuardProps) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === "loading") return // Still loading

    if (requireAuth && !session) {
      // User is not authenticated, redirect to login
      router.push(redirectTo)
      return
    }

    if (!requireAuth && session) {
      // User is authenticated but trying to access auth pages, redirect to dashboard
      router.push("/admin/dashboard")
      return
    }
  }, [session, status, requireAuth, redirectTo, router])

  // Show loading state while checking authentication
  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  // If requireAuth is true and no session, don't render children
  if (requireAuth && !session) {
    return null
  }

  // If requireAuth is false and session exists, don't render children (will redirect)
  if (!requireAuth && session) {
    return null
  }

  return <>{children}</>
}
