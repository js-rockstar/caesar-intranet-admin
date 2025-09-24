import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface LoadingState {
  // Page loading states
  dashboard: boolean
  clients: boolean
  sites: boolean
  installations: boolean
  
  // Modal loading states
  clientModal: boolean
  siteModal: boolean
  installationModal: boolean
  
  // Action loading states
  creating: boolean
  updating: boolean
  deleting: boolean
  
  // Global loading state
  global: boolean
}

const initialState: LoadingState = {
  // Page loading states
  dashboard: false,
  clients: false,
  sites: false,
  installations: false,
  
  // Modal loading states
  clientModal: false,
  siteModal: false,
  installationModal: false,
  
  // Action loading states
  creating: false,
  updating: false,
  deleting: false,
  
  // Global loading state
  global: false,
}

const loadingSlice = createSlice({
  name: 'loading',
  initialState,
  reducers: {
    setPageLoading: (state, action: PayloadAction<{ page: keyof Pick<LoadingState, 'dashboard' | 'clients' | 'sites' | 'installations'>, loading: boolean }>) => {
      const { page, loading } = action.payload
      state[page] = loading
    },
    
    setModalLoading: (state, action: PayloadAction<{ modal: keyof Pick<LoadingState, 'clientModal' | 'siteModal' | 'installationModal'>, loading: boolean }>) => {
      const { modal, loading } = action.payload
      state[modal] = loading
    },
    
    setActionLoading: (state, action: PayloadAction<{ action: keyof Pick<LoadingState, 'creating' | 'updating' | 'deleting'>, loading: boolean }>) => {
      const { action: actionType, loading } = action.payload
      state[actionType] = loading
    },
    
    setGlobalLoading: (state, action: PayloadAction<boolean>) => {
      state.global = action.payload
    },
    
    clearAllLoading: (state) => {
      return initialState
    },
  },
})

export const {
  setPageLoading,
  setModalLoading,
  setActionLoading,
  setGlobalLoading,
  clearAllLoading,
} = loadingSlice.actions

export default loadingSlice.reducer
