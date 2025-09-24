import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface DashboardStats {
  activeClients: number
  activeSites: number
  activeLicenses: number
  recentSites: Array<{
    id: number
    domain: string
    createdAt: string
    client: {
      id: number
      name: string
    }
    project: {
      id: number
      name: string
    }
  }>
  recentClients: Array<{
    id: number
    name: string
    email: string
    createdAt: string
  }>
}

interface DashboardState {
  stats: DashboardStats | null
  loading: boolean
  error: string | null
}

const initialState: DashboardState = {
  stats: null,
  loading: false,
  error: null,
}

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    setDashboardLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload
    },
    
    setDashboardStats: (state, action: PayloadAction<DashboardStats>) => {
      state.stats = action.payload
      state.loading = false
      state.error = null
    },
    
    setDashboardError: (state, action: PayloadAction<string>) => {
      state.error = action.payload
      state.loading = false
    },
    
    clearDashboard: (state) => {
      state.stats = null
      state.loading = false
      state.error = null
    },
  },
})

export const {
  setDashboardLoading,
  setDashboardStats,
  setDashboardError,
  clearDashboard,
} = dashboardSlice.actions

export default dashboardSlice.reducer
