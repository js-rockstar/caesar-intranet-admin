"use client"

import {useCallback, useEffect, useRef, useState} from "react"
import {Card, CardContent} from "@/components/ui/card"
import {Badge} from "@/components/ui/badge"
import {CheckCircle, Clock, Loader2, RefreshCw, XCircle} from "lucide-react"
import {Button} from "@/components/ui/button"
import {useAppDispatch} from "@/lib/store/hooks"
import {completeInstallationStep, failInstallationStep} from "@/lib/store/slices/installationsSlice"

interface TrackerStepProps {
    step: {
        id: number
        type: string
        name: string
        description: string
        icon: any
        duration: number
    }
    index: number
    installationId: number
    isFailed?: boolean
    onRetry?: () => void
    sessionData?: {
        projectId: number
        clientId: number
        domain: string
        adminEmail: string
        adminPassword: string
        currentStep?: string
    } | null
    // New props for the new architecture
    stepStatus?: {
        status: 'PENDING' | 'IN_PROGRESS' | 'SUCCESS' | 'FAILED'
        errorMsg?: string | null
    } | null
    onStartStep?: (stepType: string) => Promise<void>
    onCheckStatus?: () => Promise<any>
    // Configuration props (passed from parent to avoid multiple API calls)
    getStepConfig?: (stepType: string) => any
    validateConfig?: (stepType: string) => { isValid: boolean; missingFields: string[] }
    configLoading?: boolean
    // Polling control
    isPolling?: boolean
    hasInitialData?: boolean
    onResumePolling?: () => void
    // Register retry function with parent
    onRegisterRetry?: (index: number, retryFn: () => void) => void
}

export function TrackerStep({
                                step,
                                index,
                                installationId,
                                isFailed,
                                onRetry,
                                sessionData,
                                stepStatus,
                                onStartStep,
                                onCheckStatus,
                                getStepConfig,
                                validateConfig,
                                configLoading,
                                isPolling,
                                hasInitialData,
                                onResumePolling,
                                onRegisterRetry
                            }: TrackerStepProps) {
    const dispatch = useAppDispatch()
    const [status, setStatus] = useState<'pending' | 'in_progress' | 'completed' | 'failed'>('pending')
    const [isRequestSent, setIsRequestSent] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [showSuccessCard, setShowSuccessCard] = useState(false)
    const hasInitialized = useRef(false)

    // Add a ref to track if step has been started
    const hasBeenStartedRef = useRef(false)
    
    // Add a ref to track if we're in a retry state to prevent useEffect from overriding
    const isRetryingRef = useRef(false)

    const IconComponent = step.icon

    const animateProgressToSuccess = useCallback(() => {
        setStatus('completed')
        setShowSuccessCard(true)
        dispatch(completeInstallationStep(index))
    }, [index, dispatch])

    // Update status based on stepStatus prop
    useEffect(() => {
        if (stepStatus && !isRetryingRef.current) {
            switch (stepStatus.status) {
                case 'PENDING':
                    setStatus('pending')
                    setShowSuccessCard(false)
                    break
                case 'IN_PROGRESS':
                    setStatus('in_progress')
                    setShowSuccessCard(false)
                    setError(null)
                    hasBeenStartedRef.current = true
                    break
                case 'SUCCESS':
                    animateProgressToSuccess()
                    hasBeenStartedRef.current = true
                    break
                case 'FAILED':
                    setStatus('failed')
                    setError(stepStatus.errorMsg || 'Step failed')
                    dispatch(failInstallationStep(index))
                    hasBeenStartedRef.current = true
                    break
            }
        }
    }, [stepStatus, index, dispatch, animateProgressToSuccess])

    // Clear retry flag when stepStatus updates to IN_PROGRESS
    useEffect(() => {
        if (stepStatus?.status === 'IN_PROGRESS' && isRetryingRef.current) {
            isRetryingRef.current = false
        }
    }, [stepStatus?.status])

    useEffect(() => {

        if (
            status === 'pending' &&
            !isFailed &&
            onStartStep &&
            stepStatus &&
            stepStatus.status === 'PENDING' &&
            hasInitialData &&
            !hasBeenStartedRef.current
        ) {
            hasBeenStartedRef.current = true
            onStartStep(step.type)
        }
    }, [status, isFailed, onStartStep, step.type, stepStatus, hasInitialData])

    const handleRetry = useCallback(() => {

        if (stepStatus?.status === 'SUCCESS') {
            return
        }

        setError(null)
        setStatus('pending')
        setIsRequestSent(false)
        setShowSuccessCard(false)
        hasInitialized.current = false

        // Set retry flag to prevent useEffect from overriding our state
        isRetryingRef.current = true

        // Immediately show in_progress state for better UX
        setTimeout(() => {
            setStatus('in_progress')
        }, 50)

        // Clear retry flag after a delay as fallback
        setTimeout(() => {
            isRetryingRef.current = false
        }, 2000)

        hasBeenStartedRef.current = false

        if (status === 'failed') {
            dispatch(failInstallationStep(-1))
        }

        if (!isPolling && onResumePolling) {
            onResumePolling()
        }

        if (onStartStep) {
            hasBeenStartedRef.current = true
            onStartStep(step.type)
        }

        // Trigger immediate status check to get updated status
        if (onCheckStatus) {
            onCheckStatus()
        }
    }, [index, status, isPolling, onResumePolling, onStartStep, step.type, dispatch, stepStatus?.status])

    // Handle isFailed prop changes separately
    useEffect(() => {
        if (isFailed && status !== 'failed') {
            setStatus('failed')
        }
    }, [isFailed, status, index])

    // Register retry function with parent component
    useEffect(() => {
        if (onRegisterRetry) {
            onRegisterRetry(index, handleRetry)
        }
    }, [index, onRegisterRetry, handleRetry])

    // Cleanup when component unmounts or step changes
    useEffect(() => {
        return () => {
            setShowSuccessCard(false)
        }
    }, [index])

    // Rest of the component remains the same...
    const getStatusColor = () => {
        if (showSuccessCard) {
            return 'default'
        }
        switch (status) {
            case 'in_progress':
                return 'secondary'
            case 'failed':
                return 'destructive'
            default:
                return 'outline'
        }
    }

    const getStatusIcon = () => {
        if (showSuccessCard) {
            return <CheckCircle className="h-4 w-4 text-green-500"/>
        }
        switch (status) {
            case 'in_progress':
                return <Loader2 className="h-4 w-4 text-blue-500 animate-spin"/>
            case 'failed':
                return <XCircle className="h-4 w-4 text-red-500"/>
            default:
                return <Clock className="h-4 w-4 text-yellow-500"/>
        }
    }

    return (
        <Card className={`transition-all duration-300 ${
            showSuccessCard ? "border-green-200 bg-green-50" :
                status === 'failed' ? "border-red-200 bg-red-50" :
                    status === 'in_progress' ? "border-blue-200 bg-blue-50" :
                        "border-gray-200"
        }`}>
            <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                        showSuccessCard ? "bg-green-100" :
                            status === 'failed' ? "bg-red-100" :
                                status === 'in_progress' ? "bg-blue-100" :
                                    "bg-gray-100"
                    }`}>
                        {showSuccessCard ? (
                            <CheckCircle className="h-5 w-5 text-green-600"/>
                        ) : status === 'failed' ? (
                            <XCircle className="h-5 w-5 text-red-600"/>
                        ) : status === 'in_progress' ? (
                            <Loader2 className="h-5 w-5 animate-spin text-blue-600"/>
                        ) : (
                            <IconComponent className="h-5 w-5 text-gray-600"/>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                            <h4 className={`text-sm font-medium ${
                                showSuccessCard ? "text-green-800" :
                                    status === 'failed' ? "text-red-800" :
                                        status === 'in_progress' ? "text-blue-800" :
                                            "text-gray-800"
                            }`}>
                                {step.name}
                            </h4>
                            {showSuccessCard && (
                                <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                                    Completed
                                </Badge>
                            )}
                            {status === 'in_progress' && (
                                <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                                    In Progress
                                </Badge>
                            )}
                            {status === 'failed' && stepStatus?.status === 'FAILED' && (
                                <Badge variant="destructive" className="text-xs">
                                    Failed
                                </Badge>
                            )}
                        </div>
                        <p className={`text-xs ${
                            showSuccessCard ? "text-green-600" :
                                status === 'failed' ? "text-red-600" :
                                    status === 'in_progress' ? "text-blue-600" :
                                        "text-gray-600"
                        }`}>
                            {step.description}
                        </p>
                        {error && stepStatus?.status === 'FAILED' && (
                            <p className="text-xs text-red-600 mt-1">{error}</p>
                        )}
                        {status === 'failed' && stepStatus?.status === 'FAILED' && (
                            <div className="mt-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleRetry}
                                    className="text-red-600 border-red-200 hover:bg-red-50"
                                    title="Retry this step"
                                >
                                    <RefreshCw className="h-4 w-4"/>
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
