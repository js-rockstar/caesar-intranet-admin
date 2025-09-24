import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface Installation {
  id: number
  domain?: string
  status: string
  createdAt: string
  client?: {
    id: number
    name: string
  }
  project?: {
    id: number
    name: string
  }
  steps: Array<{
    id: number
    status: string
    createdAt: string
  }>
}

interface InstallationsState {
  installations: Installation[]
  loading: boolean
  error: string | null
  filters: {
    search: string
    statusFilter: string
    clientFilter: string
  }
  // Installation tracking state
  tracking: {
    installationId: number | null
    completedSteps: number[]
    failedStep: number | null
    currentStep: number
    progress: number
    isCompleted: boolean
    credentials: {
      domain: string
      adminEmail: string
      adminPassword?: string
    } | null
  }
}

const initialState: InstallationsState = {
  installations: [],
  loading: false,
  error: null,
  filters: {
    search: '',
    statusFilter: 'all',
    clientFilter: 'all',
  },
  tracking: {
    installationId: null,
    completedSteps: [],
    failedStep: null,
    currentStep: 0,
    progress: 0,
    isCompleted: false,
    credentials: null,
  },
}

const installationsSlice = createSlice({
  name: 'installations',
  initialState,
  reducers: {
    setInstallationsLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload
    },
    
    setInstallations: (state, action: PayloadAction<Installation[]>) => {
      state.installations = action.payload
      state.loading = false
      state.error = null
    },
    
    addInstallation: (state, action: PayloadAction<Installation>) => {
      state.installations.push(action.payload)
    },
    
    updateInstallation: (state, action: PayloadAction<Installation>) => {
      const index = state.installations.findIndex(installation => installation.id === action.payload.id)
      if (index !== -1) {
        state.installations[index] = action.payload
      }
    },
    
    removeInstallation: (state, action: PayloadAction<number>) => {
      state.installations = state.installations.filter(installation => installation.id !== action.payload)
    },
    
    setInstallationsError: (state, action: PayloadAction<string>) => {
      state.error = action.payload
      state.loading = false
    },
    
    setInstallationsFilters: (state, action: PayloadAction<Partial<InstallationsState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload }
    },
    
    clearInstallations: (state) => {
      state.installations = []
      state.loading = false
      state.error = null
    },
    
    // Installation tracking actions
    startInstallationTracking: (state, action: PayloadAction<number>) => {
      state.tracking.installationId = action.payload
      state.tracking.completedSteps = []
      state.tracking.failedStep = null
      state.tracking.currentStep = 0
      state.tracking.progress = 0
      state.tracking.isCompleted = false
      state.tracking.credentials = null
    },
    
    setInstallationCredentials: (state, action: PayloadAction<InstallationsState['tracking']['credentials']>) => {
      state.tracking.credentials = action.payload
    },
    
    completeInstallationStep: (state, action: PayloadAction<number>) => {
      if (!state.tracking.completedSteps.includes(action.payload)) {
        state.tracking.completedSteps.push(action.payload)
      }
      state.tracking.currentStep = action.payload
      // Calculate progress based on completed steps
      const totalSteps = 4 // Assuming 4 steps
      state.tracking.progress = (state.tracking.completedSteps.length / totalSteps) * 100
    },
    
    failInstallationStep: (state, action: PayloadAction<number>) => {
      state.tracking.failedStep = action.payload === -1 ? null : action.payload
    },
    
    completeInstallation: (state) => {
      state.tracking.isCompleted = true
      state.tracking.progress = 100
    },
    
    failInstallation: (state) => {
      state.tracking.isCompleted = true
      // Keep current progress, don't set to 100
    },
    
    resetInstallationTracking: (state) => {
      state.tracking.installationId = null
      state.tracking.completedSteps = []
      state.tracking.failedStep = null
      state.tracking.currentStep = 0
      state.tracking.progress = 0
      state.tracking.isCompleted = false
      state.tracking.credentials = null
    },
  },
})

export const {
  setInstallationsLoading,
  setInstallations,
  addInstallation,
  updateInstallation,
  removeInstallation,
  setInstallationsError,
  setInstallationsFilters,
  clearInstallations,
  startInstallationTracking,
  setInstallationCredentials,
  completeInstallationStep,
  failInstallationStep,
  completeInstallation,
  failInstallation,
  resetInstallationTracking,
} = installationsSlice.actions

export default installationsSlice.reducer
