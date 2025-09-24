import { cn } from "@/lib/utils"

interface LoaderProps {
  size?: "sm" | "md" | "lg"
  className?: string
}

export function Loader({ size = "md", className }: LoaderProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6", 
    lg: "h-8 w-8"
  }

  return (
    <div className={cn("animate-spin rounded-full border-2 border-gray-300 border-t-blue-600", sizeClasses[size], className)} />
  )
}

interface PageLoaderProps {
  message?: string
}

export function PageLoader({ message = "Loading..." }: PageLoaderProps) {
  return (
    <div className="flex flex-col items-center justify-center h-[400px] space-y-4">
      <Loader size="lg" />
      <p className="text-muted-foreground">{message}</p>
    </div>
  )
}

interface ModalLoaderProps {
  message?: string
}

export function ModalLoader({ message = "Loading..." }: ModalLoaderProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 space-y-4">
      <Loader size="md" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}

interface TabLoaderProps {
  message?: string
}

export function TabLoader({ message = "Loading..." }: TabLoaderProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 space-y-4">
      <Loader size="md" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  )
}
