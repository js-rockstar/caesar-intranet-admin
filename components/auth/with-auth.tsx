"use client"

import { ComponentType } from "react"
import { AuthGuard } from "./auth-guard"

export function withAuth<P extends object>(
  WrappedComponent: ComponentType<P>,
  options: {
    requireAuth?: boolean
    redirectTo?: string
  } = {}
) {
  const { requireAuth = true, redirectTo = "/auth/login" } = options

  return function AuthenticatedComponent(props: P) {
    return (
      <AuthGuard requireAuth={requireAuth} redirectTo={redirectTo}>
        <WrappedComponent {...props} />
      </AuthGuard>
    )
  }
}
