"use client"

import type React from "react"
import { useSession } from "next-auth/react"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { AdminHeader } from "@/components/admin/admin-header"
import { AuthGuard } from "@/components/auth/auth-guard"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session } = useSession()


  const user = session?.user ? {
    id: parseInt(session.user.id),
    email: session.user.email!,
    name: session.user.name || "Admin User",
    role: session.user.role,
  } : null

  return (
    <AuthGuard requireAuth={true} redirectTo="/auth/login">
      <SidebarProvider>
        <AdminSidebar />
        <SidebarInset>
          {user && <AdminHeader user={user} />}
          <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min">
              <main className="p-6">{children}</main>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </AuthGuard>
  )
}
