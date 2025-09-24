import { NextResponse, type NextRequest } from "next/server"
import { getToken } from "next-auth/jwt"

export async function authMiddleware(request: NextRequest) {
  const token = await getToken({ 
    req: request, 
    secret: process.env.NEXTAUTH_SECRET 
  })

  // If accessing admin routes without authentication, redirect to login
  if (request.nextUrl.pathname.startsWith("/admin") && !token) {
    const url = request.nextUrl.clone()
    url.pathname = "/auth/login"
    return NextResponse.redirect(url)
  }

  // If accessing /admin directly, redirect to dashboard
  if (request.nextUrl.pathname === "/admin" && token) {
    const url = request.nextUrl.clone()
    url.pathname = "/admin/dashboard"
    return NextResponse.redirect(url)
  }

  // If accessing login page while authenticated, redirect to dashboard
  if (request.nextUrl.pathname === "/auth/login" && token) {
    const url = request.nextUrl.clone()
    url.pathname = "/admin/dashboard"
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}
