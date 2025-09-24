import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { Suspense } from "react"
import { Providers } from "@/components/providers/session-provider"
import { ReduxProvider } from "@/components/providers/redux-provider"

export const metadata: Metadata = {
  title: "Caesar Intranet",
  description: "Professional client and installation management system",
  generator: "v0.app",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <ReduxProvider>
          <Providers>
            <Suspense>{children}</Suspense>
            <Analytics />
          </Providers>
        </ReduxProvider>
      </body>
    </html>
  )
}
