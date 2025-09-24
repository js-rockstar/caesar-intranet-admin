"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertCircle, ExternalLink, Globe, Mail, Settings, User, Eye, EyeOff } from "lucide-react"
// Removed direct import - will fetch from API instead

interface CredentialsModalProps {
  isOpen: boolean
  onClose: () => void
  siteId: number
}

interface InstallationCredentials {
  domain: string
  adminEmail: string
  adminPassword: string
}

export function CredentialsModal({ isOpen, onClose, siteId }: CredentialsModalProps) {
  const [credentials, setCredentials] = useState<InstallationCredentials | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (isOpen && siteId) {
      fetchCredentials()
    }
  }, [isOpen, siteId])

  const fetchCredentials = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/sites/${siteId}/credentials`)
      if (response.ok) {
        const creds = await response.json()
        setCredentials(creds)
      } else {
        setCredentials(null)
      }
    } catch (error) {
      setCredentials(null)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setCredentials(null)
    setShowPassword(false)
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-xl">
            <User className="h-6 w-6 text-blue-600" />
            <span>Installation Credentials</span>
          </DialogTitle>
          <DialogDescription>
            Access credentials for your installed website
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : credentials ? (
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-lg border border-green-200 shadow-sm">
                <h4 className="font-semibold text-green-800 mb-4 text-lg flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>Access Credentials</span>
                </h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Globe className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-600 font-medium">Website Domain:</span>
                    </div>
                    <span className="font-semibold text-gray-900">{credentials.domain}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-600 font-medium">Admin Email:</span>
                    </div>
                    <span className="font-semibold text-gray-900">{credentials.adminEmail}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Settings className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-600 font-medium">Admin Password:</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-semibold text-gray-900 bg-yellow-100 px-2 py-1 rounded">
                        {showPassword ? credentials.adminPassword : '••••••••'}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowPassword(!showPassword)}
                        className="h-8 w-8 p-0"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Important:</p>
                    <p>Please save these credentials in a secure location. You can use them to access your website's admin panel.</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4">
                <Button
                  onClick={handleClose}
                  variant="outline"
                  className="px-8 py-3 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  Close
                </Button>
                <Button
                  onClick={() => window.open(`https://${credentials.domain}`, '_blank')}
                  className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                  disabled={!credentials.domain}
                >
                  <ExternalLink className="mr-2 h-5 w-5" />
                  Visit Your Website
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No credentials found for this site.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
