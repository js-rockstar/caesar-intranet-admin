import { NextResponse } from "next/server"
import { requireAuth, createAuthResponse } from "@/lib/auth-middleware"
import { StatsService } from "@/lib/services/stats-service"

export async function GET() {
  try {
    const authResult = await requireAuth()
    
    if ("error" in authResult) {
      return createAuthResponse(authResult)
    }

    const stats = await StatsService.getSiteStats()
    return NextResponse.json(stats)
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
