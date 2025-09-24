"use client"

import { useRouter } from "next/navigation"
import { useAppDispatch } from "@/lib/store/hooks"
import { setPageLoading } from "@/lib/store/slices/loadingSlice"
import { cn } from "@/lib/utils"

interface LoadingLinkProps {
  href: string
  children: React.ReactNode
  className?: string
  onClick?: () => void
}

export function LoadingLink({ href, children, className, onClick }: LoadingLinkProps) {
  const router = useRouter()
  const dispatch = useAppDispatch()

  const handleClick = () => {
    // Set loading state first
    if (href.includes('/dashboard')) {
      dispatch(setPageLoading({ page: 'dashboard', loading: true }))
    } else if (href.includes('/clients')) {
      dispatch(setPageLoading({ page: 'clients', loading: true }))
    } else if (href.includes('/sites')) {
      dispatch(setPageLoading({ page: 'sites', loading: true }))
    } else if (href.includes('/installations')) {
      dispatch(setPageLoading({ page: 'installations', loading: true }))
    }
    
    // Use Next.js router for navigation
    router.push(href)
    onClick?.()
  }

  return (
    <button className={cn(className)} onClick={handleClick}>
      {children}
    </button>
  )
}
