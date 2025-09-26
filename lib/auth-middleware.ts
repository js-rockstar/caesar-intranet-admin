import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

export interface AuthResult {
  session: any
  user: any
}

export interface AuthError {
  error: string
  status: number
}

export async function requireAuth(): Promise<AuthResult | AuthError> {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return {
        error: "Unauthorized",
        status: 401
      }
    }

    // Check user role
    if (session.user.role !== "ADMIN" && session.user.role !== "STAFF") {
      return {
        error: "Unauthorized",
        status: 401
      }
    }

    return {
      session,
      user: session.user
    }
  } catch (error) {
    return {
      error: "Internal server error",
      status: 500
    }
  }
}

export async function requireAdminAuth(): Promise<AuthResult | AuthError> {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return {
        error: "Unauthorized",
        status: 401
      }
    }

    // Check user role - only ADMIN allowed
    if (session.user.role !== "ADMIN") {
      return {
        error: "Forbidden - Admin access required",
        status: 403
      }
    }

    return {
      session,
      user: session.user
    }
  } catch (error) {
    return {
      error: "Internal server error",
      status: 500
    }
  }
}

export function createAuthResponse(error: AuthError): NextResponse {
  return NextResponse.json({ error: error.error }, { status: error.status })
}
