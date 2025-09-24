"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { 
  ArrowRight, 
  ArrowLeft,
  Globe,
  Building2,
  Mail,
  MapPin,
  CheckCircle,
  Settings,
  User,
  Lock,
  AlertCircle,
  RefreshCw,
  Eye,
  EyeOff,
  XCircle,
  Loader2
} from "lucide-react"

interface Client {
  id: number
  name: string
  city?: string
  state?: string
  country?: string
  contacts?: Array<{
    id: number
    firstName: string
    lastName: string
    email?: string | null
    isPrimary: boolean
  }>
  _count?: {
    sites: number
    contacts: number
  }
}

interface Project {
  id: number
  name: string
  domain: string
  status: boolean
  sites: Array<{
    id: number
    domain: string
    status: string
  }>
  createdAt: string
  updatedAt: string
}

export default function ConfigPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get("sessionId")
  const projectId = searchParams.get("projectId")
  const clientId = searchParams.get("clientId")
  
  const [client, setClient] = useState<Client | null>(null)
  const [project, setProject] = useState<Project | null>(null)
  const [subdomain, setSubdomain] = useState("")
  const [adminEmail, setAdminEmail] = useState("")
  const [adminPassword, setAdminPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isAutoSelecting, setIsAutoSelecting] = useState(false)
  const [hasConfigToPreSelect, setHasConfigToPreSelect] = useState(false)
  const [domainAvailability, setDomainAvailability] = useState<{
    status: 'idle' | 'checking' | 'available' | 'unavailable'
    message: string
    existingSite?: {
      id: number
      domain: string
      client: {
        id: number
        name: string
        email: string
      }
    }
  }>({
    status: 'idle',
    message: ''
  })

  useEffect(() => {
    if (projectId && clientId) {
      fetchData()
    } else if (sessionId) {
      // If we have sessionId but no projectId/clientId, fetch session data first
      fetchSessionDataOnly()
    } else {
      router.push("/admin/installations/new")
    }
  }, [projectId, clientId, sessionId, router])

  // Auto-check domain availability when subdomain is set and valid
  useEffect(() => {
    if (subdomain && project && !isAutoSelecting) {
      const subdomainValidation = validateSubdomain(subdomain)
      if (subdomainValidation.valid) {
        const fullDomain = `${subdomain}.${project.domain}`
        checkDomainAvailability(fullDomain)
      } else {
        setDomainAvailability({ status: 'idle', message: '' })
      }
    }
  }, [subdomain, project, isAutoSelecting])

  const fetchData = async () => {
    try {
      const [clientResponse, projectResponse] = await Promise.all([
        fetch(`/api/clients/${clientId}`),
        fetch(`/api/projects/${projectId}`)
      ])

      if (clientResponse.ok && projectResponse.ok) {
        const [clientData, projectData] = await Promise.all([
          clientResponse.json(),
          projectResponse.json()
        ])
        setClient(clientData)
        setProject(projectData)
        // Don't pre-fill admin email - let user enter it manually
        
        // After project data is loaded, fetch session data if sessionId exists
        if (sessionId) {
          await fetchSessionData(projectData)
        }
      }
    } catch (error) {
    } finally {
      setIsLoading(false)
    }
  }

  const fetchSessionDataOnly = async () => {
    try {
      const response = await fetch(`/api/installations/session?sessionId=${sessionId}`)
      
      if (response.ok) {
        const sessionData = await response.json()
        const stepData = sessionData.stepData
        
        // Fetch client and project data using session data
        const [clientResponse, projectResponse] = await Promise.all([
          fetch(`/api/clients/${stepData.clientId}`),
          fetch(`/api/projects/${stepData.projectId}`)
        ])


        if (clientResponse.ok && projectResponse.ok) {
          const [clientData, projectData] = await Promise.all([
            clientResponse.json(),
            projectResponse.json()
          ])
          setClient(clientData)
          setProject(projectData)
          
          // Now load the configuration data
          await loadConfigurationData(stepData, projectData)
        } else {
        }
      } else {
        router.push("/admin/installations/new")
      }
    } catch (error) {
      router.push("/admin/installations/new")
    } finally {
      setIsLoading(false)
    }
  }

  const loadConfigurationData = async (stepData: any, projectData: Project) => {
    
    // Check if there's configuration data to pre-select
    const hasConfig = stepData?.domain || stepData?.adminEmail || stepData?.adminPassword
    setHasConfigToPreSelect(hasConfig)
    
    if (hasConfig) {
      setIsAutoSelecting(true)
      
      // Load previously entered domain configuration
      if (stepData?.domain && stepData.domain !== "UNNAMED" && projectData) {
        // Extract subdomain from full domain
        const fullDomain = stepData.domain
        const projectDomain = projectData.domain
        
        if (fullDomain.endsWith(`.${projectDomain}`)) {
          const subdomain = fullDomain.replace(`.${projectDomain}`, '')
          setSubdomain(subdomain)
          // Domain availability check will be triggered automatically by useEffect
        } else {
        }
      } else {
      }
      
      // Load previously entered admin credentials
      if (stepData?.adminEmail) {
        setAdminEmail(stepData.adminEmail)
      } else {
      }
      
      if (stepData?.adminPassword) {
        setAdminPassword(stepData.adminPassword)
        setConfirmPassword(stepData.adminPassword)
        calculatePasswordStrength(stepData.adminPassword)
      } else {
      }
    } else {
    }
    
    setIsAutoSelecting(false)
  }

  const fetchSessionData = async (projectData?: Project) => {
    try {
      const response = await fetch(`/api/installations/session?sessionId=${sessionId}`)
      if (response.ok) {
        const sessionData = await response.json()
        const stepData = sessionData.stepData
        
        // Use the provided project data or the current state
        const currentProject = projectData || project
        
        // Load configuration data
        await loadConfigurationData(stepData, currentProject)
      }
    } catch (error) {
    }
  }

  const handleBack = async () => {
    if (sessionId) {
      try {
        setIsSaving(true)
        // Update session data when going back
        const sessionData = {
          projectId: parseInt(projectId!),
          clientId: parseInt(clientId!),
          domain: subdomain ? `${subdomain}.${project?.domain}` : "",
          adminEmail: adminEmail,
          adminPassword: adminPassword,
          currentStep: 'client_selection'
        }

        await fetch(`/api/installations/session?sessionId=${sessionId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            stepData: sessionData
          })
        })

        router.push(`/admin/installations/new/client?sessionId=${sessionId}&projectId=${projectId}`)
      } catch (error) {
        router.push(`/admin/installations/new/client?sessionId=${sessionId}&projectId=${projectId}`)
      } finally {
        setIsSaving(false)
      }
    } else {
      router.push(`/admin/installations/new/client?projectId=${projectId}`)
    }
  }

  const generatePassword = () => {
    const length = 12
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
    let password = ""
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length))
    }
    setAdminPassword(password)
    setConfirmPassword(password)
    calculatePasswordStrength(password)
  }

  const calculatePasswordStrength = (password: string) => {
    let strength = 0
    if (password.length >= 8) strength++
    if (password.length >= 12) strength++
    if (/[a-z]/.test(password)) strength++
    if (/[A-Z]/.test(password)) strength++
    if (/[0-9]/.test(password)) strength++
    if (/[^A-Za-z0-9]/.test(password)) strength++
    setPasswordStrength(strength)
  }

  const getPasswordStrengthColor = (strength: number) => {
    if (strength <= 2) return "text-red-500"
    if (strength <= 4) return "text-yellow-500"
    return "text-green-500"
  }

  const getPasswordStrengthText = (strength: number) => {
    if (strength <= 2) return "Weak"
    if (strength <= 4) return "Medium"
    return "Strong"
  }

  const handlePasswordChange = (password: string) => {
    setAdminPassword(password)
    calculatePasswordStrength(password)
  }

  const validateSubdomain = (subdomain: string) => {
    // Rule 1: Minimum 3 characters
    if (subdomain.length < 3) {
      return { valid: false, message: "Subdomain must be at least 3 characters long" }
    }

    // Rule 2: Only lowercase letters, numbers, and underscores
    if (!/^[a-z0-9_]+$/.test(subdomain)) {
      return { valid: false, message: "Subdomain can only contain lowercase letters, numbers, and underscores" }
    }

    // Rule 3: Must start with lowercase letter or underscore (database friendly)
    if (!/^[a-z_]/.test(subdomain)) {
      return { valid: false, message: "Subdomain must start with a lowercase letter or underscore" }
    }

    // Rule 4: Cannot be too long (database name limits)
    if (subdomain.length > 20) {
      return { valid: false, message: "Subdomain cannot be longer than 20 characters" }
    }

    return { valid: true, message: "Subdomain is valid" }
  }

  const handleSubdomainChange = (newSubdomain: string) => {
    // Convert to lowercase automatically
    const lowercaseSubdomain = newSubdomain.toLowerCase()
    setSubdomain(lowercaseSubdomain)
    
    // Debounce the domain check
    const timeoutId = setTimeout(() => {
      if (lowercaseSubdomain && project) {
        // Only check domain availability if subdomain is valid
        const subdomainValidation = validateSubdomain(lowercaseSubdomain)
        if (subdomainValidation.valid) {
          const fullDomain = `${lowercaseSubdomain}.${project.domain}`
          checkDomainAvailability(fullDomain)
        } else {
          // Reset domain availability if subdomain is invalid
          setDomainAvailability({ status: 'idle', message: '' })
        }
      } else {
        setDomainAvailability({ status: 'idle', message: '' })
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }

  const checkDomainAvailability = async (domainToCheck: string) => {
    if (!domainToCheck.trim()) {
      setDomainAvailability({ status: 'idle', message: '' })
      return
    }

    setDomainAvailability({ status: 'checking', message: 'Checking availability...' })

    try {
      const requestBody = {
        domain: domainToCheck.trim(),
        excludeSiteId: sessionId ? parseInt(sessionId) : undefined // Exclude the current temporary site
      }
      
      
      const response = await fetch('/api/sites/check-domain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      const result = await response.json()

      if (result.available) {
        setDomainAvailability({
          status: 'available',
          message: 'Domain is available'
        })
      } else {
        setDomainAvailability({
          status: 'unavailable',
          message: result.message,
          existingSite: result.existingSite
        })
      }
    } catch (error) {
      setDomainAvailability({
        status: 'unavailable',
        message: 'Error checking domain availability'
      })
    }
  }

  const handleDomainChange = (newDomain: string) => {
    setDomain(newDomain)
    
    // Debounce the domain check
    const timeoutId = setTimeout(() => {
      checkDomainAvailability(newDomain)
    }, 500)

    return () => clearTimeout(timeoutId)
  }

  const handleContinue = async () => {
    if (!subdomain.trim() || !adminEmail.trim() || !adminPassword.trim()) {
      return
    }

    if (adminPassword !== confirmPassword) {
      alert("Passwords do not match")
      return
    }

    const subdomainValidation = validateSubdomain(subdomain.trim())
    if (!subdomainValidation.valid) {
      alert(subdomainValidation.message)
      return
    }

    if (domainAvailability.status !== 'available') {
      alert("Please ensure the domain is available before continuing")
      return
    }

    try {
      setIsSaving(true)
      // Update session with configuration data
      const fullDomain = `${subdomain.trim()}.${project?.domain}`
      const sessionData = {
        projectId: parseInt(projectId!),
        clientId: parseInt(clientId!),
        domain: fullDomain,
        adminEmail: adminEmail.trim(),
        adminPassword: adminPassword.trim(),
        currentStep: 'review'
      }

      const response = await fetch(`/api/installations/session?sessionId=${sessionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stepData: sessionData
        })
      })

      if (response.ok) {
        // Navigate to review step with session ID
        router.push(`/admin/installations/new/review?sessionId=${sessionId}`)
      } else {
        const error = await response.json()
        alert(error.error || "Failed to save configuration")
      }
    } catch (error) {
      alert("Failed to save configuration")
    } finally {
      setIsSaving(false)
    }
  }

  const isFormValid = () => {
    const subdomainValidation = validateSubdomain(subdomain.trim())
    return subdomain.trim() && 
           adminEmail.trim() && 
           adminPassword.trim() && 
           confirmPassword.trim() &&
           adminPassword === confirmPassword &&
           subdomainValidation.valid &&
           domainAvailability.status === 'available'
  }

  if (isLoading || (sessionId && hasConfigToPreSelect && isAutoSelecting)) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        
        <div className="flex items-center space-x-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center space-x-2">
              <Skeleton className="w-8 h-8 rounded-full" />
              <Skeleton className="h-4 w-24" />
            </div>
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
        
        {isAutoSelecting && hasConfigToPreSelect && (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span className="text-muted-foreground">Loading previous configuration...</span>
          </div>
        )}
      </div>
    )
  }

  if (!client || !project) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900">Data not found</h2>
          <p className="text-gray-600">Unable to load client or project information.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Configuration</h1>
        <p className="text-muted-foreground">
          Configure the domain and admin credentials for your new installation.
        </p>
      </div>

      {/* Progress Indicator */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-muted-foreground">
            <span className="text-sm font-medium">1</span>
          </div>
          <span className="text-sm text-muted-foreground">Project Selection</span>
        </div>
        <div className="flex-1 h-px bg-border"></div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-muted-foreground">
            <span className="text-sm font-medium">2</span>
          </div>
          <span className="text-sm text-muted-foreground">Client Selection</span>
        </div>
        <div className="flex-1 h-px bg-border"></div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground">
            <span className="text-sm font-medium">3</span>
          </div>
          <span className="text-sm font-medium">Configuration</span>
        </div>
        <div className="flex-1 h-px bg-border"></div>
        <div className="flex items-center space-x-2">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-muted-foreground">
            <span className="text-sm font-medium">4</span>
          </div>
          <span className="text-sm text-muted-foreground">Review & Confirm</span>
        </div>
      </div>

      {/* Selected Project and Client Summary */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Building2 className="h-5 w-5" />
              <span>Selected Client</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <h3 className="font-medium">{client.name}</h3>
              <div className="flex items-center space-x-1 text-muted-foreground">
                <Mail className="h-3 w-3" />
                <span className="text-sm">
                  {client.contacts?.find(contact => contact.isPrimary)?.email || "No email available"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-5 w-5" />
              <span>Selected Project</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">{project.name}</h3>
                <Badge variant={project.status ? "default" : "secondary"}>
                  {project.status ? "Active" : "Inactive"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {project.sites.length} existing installations
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Configuration Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Domain Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Globe className="h-5 w-5" />
              <span>Domain Configuration</span>
            </CardTitle>
            <CardDescription>
              Configure the domain name for your new website installation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Project Domain (Fixed) */}
            <div className="space-y-2">
              <Label>Project Domain</Label>
              <div className="flex items-center space-x-2 p-3 bg-muted rounded-md">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-blue-600">{project?.domain}</span>
                <Badge variant="outline" className="ml-auto">Fixed</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                This is the base domain for the {project?.name} project
              </p>
            </div>

            {/* Subdomain Input */}
            <div className="space-y-2">
              <Label htmlFor="subdomain">Domain Name</Label>
              <div className="flex items-center space-x-2">
                <div className="relative flex-1">
                  <Input
                    id="subdomain"
                    placeholder="mysite"
                    value={subdomain}
                    onChange={(e) => handleSubdomainChange(e.target.value)}
                    className={domainAvailability.status === 'unavailable' ? 'border-red-500 focus:border-red-500' : 
                             domainAvailability.status === 'available' ? 'border-green-500 focus:border-green-500' : ''}
                  />
                  {domainAvailability.status === 'checking' && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  )}
                  {domainAvailability.status === 'available' && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    </div>
                  )}
                  {domainAvailability.status === 'unavailable' && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <XCircle className="h-4 w-4 text-red-500" />
                    </div>
                  )}
                </div>
                <span className="text-muted-foreground">.{project?.domain}</span>
              </div>
              
              {/* Full domain preview */}
              {subdomain && (
                <div className="p-2 bg-muted rounded-md">
                  <span className="text-sm text-muted-foreground">Full domain: </span>
                  <span className="text-sm font-medium text-blue-600">{subdomain}.{project?.domain}</span>
                </div>
              )}
              
              {/* Subdomain validation */}
              {subdomain && (
                <div className={`flex items-center space-x-2 text-sm ${
                  validateSubdomain(subdomain).valid ? 'text-green-600' : 'text-red-600'
                }`}>
                  {validateSubdomain(subdomain).valid ? (
                    <CheckCircle className="h-3 w-3" />
                  ) : (
                    <XCircle className="h-3 w-3" />
                  )}
                  <span>{validateSubdomain(subdomain).message}</span>
                </div>
              )}
              
              {/* Domain availability status */}
              {domainAvailability.status !== 'idle' && (
                <div className={`flex items-center space-x-2 text-sm ${
                  domainAvailability.status === 'available' ? 'text-green-600' :
                  domainAvailability.status === 'unavailable' ? 'text-red-600' :
                  'text-muted-foreground'
                }`}>
                  {domainAvailability.status === 'checking' && (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  )}
                  {domainAvailability.status === 'available' && (
                    <CheckCircle className="h-3 w-3" />
                  )}
                  {domainAvailability.status === 'unavailable' && (
                    <XCircle className="h-3 w-3" />
                  )}
                  <span>{domainAvailability.message}</span>
                </div>
              )}
              
              <p className="text-sm text-muted-foreground">
                Enter a subdomain (3-20 characters, lowercase letters, numbers, and underscores only, must start with a letter or underscore)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Admin Credentials */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Admin Credentials</span>
            </CardTitle>
            <CardDescription>
              Set up the administrator account for your website.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="adminEmail">Email *</Label>
              <Input
                id="adminEmail"
                type="email"
                placeholder="admin@example.com"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="adminPassword">Password *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={generatePassword}
                  className="h-8 px-2"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Generate
                </Button>
              </div>
              <div className="relative">
                <Input
                  id="adminPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  value={adminPassword}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {adminPassword && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Password Strength:</span>
                    <span className={`font-medium ${getPasswordStrengthColor(passwordStrength)}`}>
                      {getPasswordStrengthText(passwordStrength)}
                    </span>
                  </div>
                  <div className="flex space-x-1">
                    {[1, 2, 3, 4, 5, 6].map((level) => (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded ${
                          level <= passwordStrength
                            ? passwordStrength <= 2
                              ? "bg-red-500"
                              : passwordStrength <= 4
                              ? "bg-yellow-500"
                              : "bg-green-500"
                            : "bg-gray-200"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {confirmPassword && adminPassword !== confirmPassword && (
                <p className="text-sm text-red-600">Passwords do not match</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={handleBack} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <ArrowLeft className="mr-2 h-4 w-4" />
          )}
          {isSaving ? "Saving..." : "Back to Client Selection"}
        </Button>
        
        <Button 
          onClick={handleContinue} 
          disabled={!isFormValid() || isSaving}
          size="lg"
        >
          {isSaving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <ArrowRight className="ml-2 h-4 w-4" />
          )}
          {isSaving ? "Saving..." : "Continue to Review"}
        </Button>
      </div>
    </div>
  )
}
