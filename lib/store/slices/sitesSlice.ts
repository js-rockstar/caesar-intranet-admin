import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface Site {
  id: number
  domain: string
  status: string
  createdAt: string
  client: {
    id: number
    name: string
  }
  project: {
    id: number
    name: string
  }
  steps: Array<{
    id: number
    status: string
    createdAt: string
  }>
}

interface SitesState {
  sites: Site[]
  loading: boolean
  error: string | null
  filters: {
    search: string
    statusFilter: string
    clientFilter: string
  }
}

const initialState: SitesState = {
  sites: [],
  loading: false,
  error: null,
  filters: {
    search: '',
    statusFilter: 'all',
    clientFilter: 'all',
  },
}

const sitesSlice = createSlice({
  name: 'sites',
  initialState,
  reducers: {
    setSitesLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload
    },
    
    setSites: (state, action: PayloadAction<Site[]>) => {
      state.sites = action.payload
      state.loading = false
      state.error = null
    },
    
    addSite: (state, action: PayloadAction<Site>) => {
      state.sites.push(action.payload)
    },
    
    updateSite: (state, action: PayloadAction<Site>) => {
      const index = state.sites.findIndex(site => site.id === action.payload.id)
      if (index !== -1) {
        state.sites[index] = action.payload
      }
    },
    
    removeSite: (state, action: PayloadAction<number>) => {
      state.sites = state.sites.filter(site => site.id !== action.payload)
    },
    
    setSitesError: (state, action: PayloadAction<string>) => {
      state.error = action.payload
      state.loading = false
    },
    
    setSitesFilters: (state, action: PayloadAction<Partial<SitesState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload }
    },
    
    clearSites: (state) => {
      state.sites = []
      state.loading = false
      state.error = null
    },
  },
})

export const {
  setSitesLoading,
  setSites,
  addSite,
  updateSite,
  removeSite,
  setSitesError,
  setSitesFilters,
  clearSites,
} = sitesSlice.actions

export default sitesSlice.reducer
