"use client"

import {useCallback, useEffect, useRef, useState} from "react"
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card"
import {Button} from "@/components/ui/button"
import {Badge} from "@/components/ui/badge"
import {Separator} from "@/components/ui/separator"
import { 
    AlertCircle,
    ArrowLeft,
  CheckCircle,
    ChevronDown,
    ChevronUp,
    Cloud,
    Database,
  ExternalLink,
  FolderOpen,
    Globe,
  Loader2,
    Mail,
  RefreshCw,
    Server,
    Settings,
    User,
  XCircle
} from "lucide-react"
import {Collapsible, CollapsibleContent, CollapsibleTrigger} from "@/components/ui/collapsible"
import {TrackerStep} from "./tracker-step"
import {useAppDispatch, useAppSelector} from "@/lib/store/hooks"
import { 
  completeInstallation,
  failInstallationStep,
    setInstallationCredentials,
    startInstallationTracking,
    resetInstallationTracking
} from "@/lib/store/slices/installationsSlice"
import {useProjectSettings} from "@/hooks/use-settings"

interface InstallationStep {
  id: number
  type: string
  name: string
  description: string
  icon: any
  duration: number
}

interface InstallationCredentials {
  domain: string
  adminEmail: string
  adminPassword?: string
}

interface InstallationTrackerProps {
  installationId: number
  sessionData: {
    projectId: number
    clientId: number
    domain: string
    adminEmail: string
    adminPassword: string
    currentStep?: string
  } | null
  onInstallationComplete?: () => void
}

const installationSteps: InstallationStep[] = [
  {
    id: 0,
    type: "CPANEL_ENTRY",
    name: "Create Subdomain",
    description: "Creating subdomain in cPanel",
    icon: Server,
    duration: 4000
  },
  {
    id: 1,
    type: "CLOUDFLARE_ENTRY",
    name: "Add DNS Record",
    description: "Adding DNS record in Cloudflare",
    icon: Cloud,
    duration: 3500
  },
  {
    id: 2,
    type: "DIRECTORY_SETUP",
    name: "Setup Directory",
    description: "Creating file structure and permissions",
    icon: FolderOpen,
    duration: 2500
  },
  {
    id: 3,
    type: "DB_CREATION",
    name: "Database Creation",
    description: "Creating database and user accounts",
    icon: Database,
    duration: 2000
  }
]

export default function InstallationTracker({ 
  installationId, 
  sessionData, 
  onInstallationComplete 
}: InstallationTrackerProps) {
  const dispatch = useAppDispatch()
  const tracking = useAppSelector((state: any) => state.installations.tracking)
  const [isCollapsibleOpen, setIsCollapsibleOpen] = useState(true)
    const [stepsStatus, setStepsStatus] = useState<any>(null)
    const [isPolling, setIsPolling] = useState(false)
    const [hasInitialData, setHasInitialData] = useState(false)
    const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null)
    const pollingActiveRef = useRef(false)
    const lastCallRef = useRef(0)
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
    const abortControllerRef = useRef<AbortController | null>(null)

    const [isAnimatingMainProgress, setIsAnimatingMainProgress] = useState(false)
    const mainProgressTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const stepRetryRefs = useRef<{ [key: number]: () => void }>({})
    const {projectSettings, loading: settingsLoading} = useProjectSettings(sessionData?.projectId || 0)
    const getStepConfig = (stepType: string) => {
        if (!projectSettings || settingsLoading) return null

        switch (stepType) {
            case 'CPANEL_ENTRY':
                return {
                    type: 'cpanel',
                    config: projectSettings.cpanel,
                    projectKey: 'UNKNOWN'
                }
            case 'CLOUDFLARE_ENTRY':
                return {
                    type: 'cloudflare',
                    config: projectSettings.cloudflare,
                    projectKey: 'UNKNOWN'
                }
            case 'DIRECTORY_SETUP':
            case 'DB_CREATION':
                return {
                    type: 'installer',
                    config: projectSettings.installer,
                    projectKey: 'UNKNOWN'
                }
            default:
                return null
        }
    }
    const validateStepConfig = (stepType: string): { isValid: boolean; missingFields: string[] } => {
        const stepConfig = getStepConfig(stepType)
        if (!stepConfig) {
            return {isValid: false, missingFields: ['Configuration not found']}
        }

        const missingFields: string[] = []

        switch (stepType) {
            case 'CPANEL_ENTRY':
                const cpanelConfig = projectSettings.cpanel
                if (!cpanelConfig.domain) missingFields.push('cPanel Domain')
                if (!cpanelConfig.username) missingFields.push('cPanel Username')
                if (!cpanelConfig.apiToken) missingFields.push('cPanel API Token')
                break
            case 'CLOUDFLARE_ENTRY':
                const cloudflareConfig = projectSettings.cloudflare
                if (!cloudflareConfig.username) missingFields.push('Cloudflare Email')
                if (!cloudflareConfig.apiKey) missingFields.push('Cloudflare API Key')
                if (!cloudflareConfig.zoneId) missingFields.push('Cloudflare Zone ID')
                if (!cloudflareConfig.aRecordIp) missingFields.push('A Record IP')
                break
            case 'DIRECTORY_SETUP':
            case 'DB_CREATION':
                const installerConfig = projectSettings.installer
                if (!installerConfig.apiEndpoint) missingFields.push('Installer API Endpoint')
                if (!installerConfig.token) missingFields.push('Installer Token')
                break
        }

        return {
            isValid: missingFields.length === 0,
            missingFields
        }
    }
  useEffect(() => {
    if (tracking.isCompleted) {
      onInstallationComplete?.()
            setIsCollapsibleOpen(false)
    }
  }, [tracking.isCompleted, tracking.credentials, onInstallationComplete])
    useEffect(() => {
        return () => {
            if (pollingInterval) {
                clearInterval(pollingInterval)
            }
            if (abortControllerRef.current) {
                abortControllerRef.current.abort()
            }
        }
    }, [pollingInterval])
    
  useEffect(() => {
    return () => {
      dispatch(resetInstallationTracking())
    }
  }, [dispatch])
    
  useEffect(() => {
    if (installationId) {
      if (tracking.installationId !== installationId) {
        dispatch(startInstallationTracking(installationId))
        updateSiteStatus('IN_PROGRESS')
      }
    }
  }, [installationId, tracking.installationId, dispatch])
  useEffect(() => {
    if (sessionData && !tracking.credentials) {
      const credentials = {
        domain: sessionData.domain || '',
        adminEmail: sessionData.adminEmail || '',
        adminPassword: sessionData.adminPassword || ''
      }
      dispatch(setInstallationCredentials(credentials))
    }
  }, [sessionData, tracking.credentials, dispatch])
    useEffect(() => {

        if (installationId && !pollingActiveRef.current) {
            startPolling()
        }
        return () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current)
                pollingIntervalRef.current = null
            }
            pollingActiveRef.current = false
            setIsPolling(false)
            if (abortControllerRef.current) {
                abortControllerRef.current.abort()
                abortControllerRef.current = null
            }
        }
    }, [installationId]) // Only depend on installationId to avoid circular dependencies
  useEffect(() => {
    if (tracking.isCompleted && !isAnimatingMainProgress) {
      setIsAnimatingMainProgress(true)
      mainProgressTimeoutRef.current = setTimeout(() => {
        setIsCollapsibleOpen(false)
        
        setIsAnimatingMainProgress(false)
        mainProgressTimeoutRef.current = null
      }, 2000) // 2 second delay after reaching 100%
    }
  }, [tracking.isCompleted, isAnimatingMainProgress])

  const getCurrentProgress = () => {
        const completedSteps = tracking.completedSteps.length
        const totalSteps = installationSteps.length

        if (isAnimatingMainProgress || tracking.isCompleted) {
            return totalSteps
        }

        return completedSteps
    }

    const getProgressPercentage = () => {
        const completedSteps = tracking.completedSteps.length
        const totalSteps = installationSteps.length

        if (isAnimatingMainProgress || tracking.isCompleted) {
            return 100
        }

        return Math.round((completedSteps / totalSteps) * 100)
    }

    const updateSiteStatus = useCallback(async (status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED') => {
    if (!installationId) return

    try {
            const response = await fetch(`/api/sites/${installationId}/status`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status })
            })

            if (!response.ok) {
                throw new Error(`Failed to update site status: ${response.status}`)
            }

            const result = await response.json()
        } catch (error) {
        }
    }, [installationId])

    const areAllStepsFailed = () => {
        if (!stepsStatus?.steps) return false
        return stepsStatus.steps.every((step: any) => step.status === "FAILED")
    }

    const areAllStepsFinal = () => {
        if (!stepsStatus?.steps) return false
        return stepsStatus.steps.every((step: any) => 
            step.status === "SUCCESS" || step.status === "FAILED"
        )
    }

    const fetchStepsStatusDirect = useCallback(async () => {
        if (!installationId) return null

        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
        }
        const abortController = new AbortController()
        abortControllerRef.current = abortController

        try {
            const response = await fetch(`/api/installations/${installationId}/steps/status-all`, {
                signal: abortController.signal
            })

            if (!response.ok) {
                throw new Error(`Failed to fetch steps status: ${response.status}`)
            }

            const data = await response.json()
            return data
        } catch (error) {
            // Ignore aborted requests
            if (error instanceof Error && error.name === 'AbortError') {
                return null
            }
            return null
        }
    }, [installationId])

    const fetchStepsStatus = useCallback(async () => {
        if (!pollingActiveRef.current) {
            return
        }

        const now = Date.now()
        if (now - lastCallRef.current < 100) {
            return
        }
        lastCallRef.current = now

        if (!installationId) return

        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
        }
        const abortController = new AbortController()
        abortControllerRef.current = abortController

        try {
            const response = await fetch(`/api/installations/${installationId}/steps/status-all`, {
                signal: abortController.signal
            })

            if (!response.ok) {
                throw new Error(`Failed to fetch steps status: ${response.status}`)
            }

            const data = await response.json()
            setStepsStatus(data)
            
            // Mark that we have initial data
            if (!hasInitialData) {
                setHasInitialData(true)
            }

            const allStepsFinal = data.steps.every((step: { status: string }) => 
                step.status === "SUCCESS" || step.status === "FAILED"
            )

            if (allStepsFinal) {
                stopPolling()

                const allStepsSuccessful = data.steps.every((step: { status: string }) => step.status === "SUCCESS")
                
                if (allStepsSuccessful) {
                    dispatch(completeInstallation())
                    updateSiteStatus('COMPLETED')
                    
                    const requestBody = {
                        domain: sessionData?.domain || tracking.credentials?.domain || '',
                        adminEmail: sessionData?.adminEmail || tracking.credentials?.adminEmail || '',
                        adminPassword: sessionData?.adminPassword || tracking.credentials?.adminPassword || ''
                    }
                    
                    
                    fetch(`/api/installations/${installationId}/complete`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(requestBody)
                    }).then(response => {
                        if (response.ok) {
                            return response.json()
                        } else {
                            return response.text().then(text => {
                                throw new Error(`API error: ${response.status}`)
                            })
                        }
                    }).then(result => {
                    }).catch(error => {
                    })
                } else {
                    const failedSteps = data.steps.filter((step: { status: string }) => step.status === "FAILED")
                    if (failedSteps.length > 0) {
                        dispatch(failInstallationStep(failedSteps[0].id))
                    }
                    updateSiteStatus('FAILED')
                }
            } else {
                updateSiteStatus('IN_PROGRESS')
            }

            return data
        } catch (error) {
            // Ignore aborted requests
            if (error instanceof Error && error.name === 'AbortError') {
                return null
            }
            return null
        }
    }, [installationId, dispatch])

    const startPolling = useCallback(() => {

        if (pollingActiveRef.current || !installationId) {
            return
        }

        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current)
            pollingIntervalRef.current = null
        }

        pollingActiveRef.current = true
        setIsPolling(true)

        fetchStepsStatus()

        const interval = setInterval(() => {

            if (!pollingActiveRef.current) {
                return
            }

            fetchStepsStatus()
        }, 3000)

        pollingIntervalRef.current = interval

    }, [installationId, fetchStepsStatus])

    const stopPolling = useCallback(() => {

        pollingActiveRef.current = false
        setIsPolling(false)

        if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current)
            pollingIntervalRef.current = null
        }
        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
            abortControllerRef.current = null
        }

    }, [])

    const startStepProcess = async (stepType: string) => {
        if (!installationId) return

        const currentStepStatus = stepsStatus?.steps?.find((s: any) => s.stepType === stepType)
        if (currentStepStatus?.status === 'SUCCESS') {
            return {success: true, message: "Step already completed", step: currentStepStatus}
        }

        try {
            const response = await fetch(`/api/installations/${installationId}/steps/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({stepType})
            })

            if (!response.ok) {
                const errorData = await response.json()

                if (errorData.error === "Step is already completed") {
                    return {success: true, message: "Step already completed", step: errorData.step}
                }

                if (errorData.error === "Step is already in progress") {
                    return {success: true, message: "Step already in progress", step: errorData.step}
                }

                throw new Error(errorData.error || 'Failed to start step process')
            }

            const data = await response.json()

            if (!isPolling) {
                startPolling()
            }

            return data
    } catch (error) {
            throw error
        }
    }

    const retryFailedStep = async () => {

        if (!isPolling) {
            startPolling()
        }

        const statusData = await fetchStepsStatusDirect()

        if (!statusData) {
            return
        }

        // Find all failed steps
        const failedSteps = statusData.steps.filter((step: any) => step.status === 'FAILED')

        if (failedSteps.length === 0) {
            return
        }

        // Trigger individual retry for each failed step
        failedSteps.forEach((step: any) => {
            const stepIndex = installationSteps.findIndex(s => s.type === step.stepType)
            if (stepIndex !== -1 && stepRetryRefs.current[stepIndex]) {
                stepRetryRefs.current[stepIndex]()
            }
        })

        // Trigger immediate status check to get updated statuses
        setTimeout(() => {
            fetchStepsStatus()
        }, 100)

    }

    useEffect(() => {
        return () => {
            if (mainProgressTimeoutRef.current) {
                clearTimeout(mainProgressTimeoutRef.current)
            }
        }
    }, [])

  return (
    <div className="space-y-6">
      {/* Installation Steps - Show unless all steps are successfully completed */}
        <Collapsible open={isCollapsibleOpen} onOpenChange={setIsCollapsibleOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      {tracking.isCompleted ? (
                                             <CheckCircle className="h-5 w-5 text-green-600"/>
                                         ) : areAllStepsFailed() ? (
                                             <XCircle className="h-5 w-5 text-red-600"/>
                                         ) : tracking.installationId && isPolling && !areAllStepsFinal() ? (
                                             <Loader2 className="h-5 w-5 animate-spin text-blue-600"/>
                                         ) : (
                                             <Settings className="h-5 w-5 text-gray-600"/>
                      )}
                      <CardTitle className="text-lg">
                                             {tracking.isCompleted ? "Installation Completed" : areAllStepsFailed() ? "Installation Failed" : "Installation Steps"}
                      </CardTitle>
                    </div>
                                     <Badge
                                         variant={tracking.isCompleted ? "default" : areAllStepsFailed() ? "destructive" : tracking.installationId && isPolling && !areAllStepsFinal() ? "secondary" : "outline"}>
                                         {tracking.isCompleted ? "Completed" : areAllStepsFailed() ? "Failed" : tracking.installationId && isPolling && !areAllStepsFinal() ? "In Progress" : "Ready"}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-sm text-muted-foreground">
                      {getCurrentProgress()} / {installationSteps.length}
                    </div>
                    {isCollapsibleOpen ? (
                                         <ChevronUp className="h-4 w-4"/>
                    ) : (
                                         <ChevronDown className="h-4 w-4"/>
                    )}
                  </div>
                </div>
                <CardDescription>
                  {tracking.isCompleted 
                    ? "All installation steps have been completed successfully"
                                     : areAllStepsFailed()
                                         ? "All installation steps have failed. Use the retry buttons to restart failed steps."
                                         : tracking.installationId && isPolling && !areAllStepsFinal()
                      ? "Installing your website components..."
                      : "Click to view installation progress"
                  }
                </CardDescription>
              </CardHeader>
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              <CardContent className="space-y-4">
                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Overall Progress</span>
                                    <span>{getProgressPercentage()}%</span>
                  </div>
                  <div className="relative">
                    <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                                            className={`h-full transition-all duration-1000 ease-out ${
                                                isAnimatingMainProgress ? 'bg-green-600' : 'bg-blue-600'
                                            }`}
                        style={{ 
                                                width: `${getProgressPercentage()}%`
                        }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {getCurrentProgress()} / {installationSteps.length}
                    </span>
                  </div>
                                {stepsStatus?.steps?.some((step: any) => step.status === 'FAILED') && (
                    <div className="space-y-2">
                      <p className="text-sm text-red-600">
                                            Some installation steps have failed. Use the refresh button on
                                            individual failed steps to retry, or use "Retry All Failed Steps" to
                                            retry all failed steps at once.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={retryFailedStep}
                        className="text-red-600 border-red-200 hover:bg-red-50"
                      >
                                            <RefreshCw className="mr-2 h-4 w-4"/>
                        Retry All Failed Steps
                      </Button>
                    </div>
                  )}
                </div>

                            <Separator/>
                {/* Installation Steps */}
                <div className="space-y-3">
                                {installationSteps.map((step, index) => {
                                    // Find the step status from the polling data
                                    const stepStatus = stepsStatus?.steps?.find((s: any) => s.stepType === step.type)

                                    return (
                    <TrackerStep
                      key={step.id}
                      step={step}
                      index={index}
                      installationId={installationId}
                      isFailed={tracking.failedStep === index}
                      sessionData={sessionData}
                                            stepStatus={stepStatus}
                                            onStartStep={startStepProcess}
                                            onCheckStatus={fetchStepsStatus}
                                            getStepConfig={getStepConfig}
                                            validateConfig={validateStepConfig}
                                            configLoading={settingsLoading}
                                            isPolling={isPolling}
                                            hasInitialData={hasInitialData}
                                            onResumePolling={startPolling}
                                            onRegisterRetry={(stepIndex, retryFn) => {
                                                stepRetryRefs.current[stepIndex] = retryFn
                                            }}
                      onRetry={() => {
                        // Reset the failed step in Redux
                        dispatch(failInstallationStep(-1)) // Clear failed step
                        // The TrackerStep will handle its own retry
                      }}
                    />
                                    )
                                })}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

      {/* Installation Completed Section */}
      {tracking.isCompleted && tracking.failedStep === null && (
        <Card className="border-green-200 bg-green-50 shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center space-x-2 text-green-800 text-xl">
                            <CheckCircle className="h-8 w-8 text-green-600"/>
              <span>🎉 Installation Completed Successfully!</span>
            </CardTitle>
            <CardDescription className="text-green-700 text-base">
              Your website has been successfully installed and configured. All systems are ready!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="bg-white p-6 rounded-lg border border-green-200 shadow-sm">
                <h4 className="font-semibold text-green-800 mb-4 text-lg flex items-center space-x-2">
                                    <User className="h-5 w-5"/>
                  <span>Access Credentials</span>
                </h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                                            <Globe className="h-4 w-4 text-gray-500"/>
                      <span className="text-gray-600 font-medium">Website Domain:</span>
                    </div>
                                        <span
                                            className="font-semibold text-gray-900">{tracking.credentials?.domain || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                                            <Mail className="h-4 w-4 text-gray-500"/>
                      <span className="text-gray-600 font-medium">Admin Email:</span>
                    </div>
                                        <span
                                            className="font-semibold text-gray-900">{tracking.credentials?.adminEmail || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-2">
                                            <Settings className="h-4 w-4 text-gray-500"/>
                      <span className="text-gray-600 font-medium">Admin Password:</span>
                    </div>
                                        <span
                                            className="font-mono font-semibold text-gray-900 bg-yellow-100 px-2 py-1 rounded">
                      {tracking.credentials?.adminPassword || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-start space-x-3">
                                    <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5"/>
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Important:</p>
                                        <p>Please save these credentials in a secure location. You can use them to
                                            access your website's admin panel.</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4">
                <Button
                  onClick={() => window.location.href = `/admin/sites/${installationId}`}
                  variant="outline"
                  className="px-8 py-3 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                >
                                    <ArrowLeft className="mr-2 h-5 w-5"/>
                  Go back to the site
                </Button>
                <Button
                  onClick={() => window.open(`https://${tracking.credentials?.domain}`, '_blank')}
                  className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                  disabled={!tracking.credentials?.domain}
                >
                                    <ExternalLink className="mr-2 h-5 w-5"/>
                  Visit Your Website
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
