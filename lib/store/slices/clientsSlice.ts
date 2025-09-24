import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface Client {
  id: number
  name: string
  email: string
  address?: string
  apartment?: string
  city?: string
  state?: string
  zipCode?: string
  country?: string
  active: boolean
  createdAt: string
  updatedAt: string
  phones: Array<{
    id: number
    type: string
    number: string
  }>
  contacts: Array<{
    id: number
    firstName: string
    lastName: string
    email: string
    phone: string
  }>
  _count?: {
    sites: number
    contacts: number
  }
}

interface ClientsState {
  clients: Client[]
  loading: boolean
  error: string | null
  filters: {
    search: string
    activeFilter: 'active' | 'inactive' | 'all'
  }
}

const initialState: ClientsState = {
  clients: [],
  loading: false,
  error: null,
  filters: {
    search: '',
    activeFilter: 'active',
  },
}

const clientsSlice = createSlice({
  name: 'clients',
  initialState,
  reducers: {
    setClientsLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload
    },
    
    setClients: (state, action: PayloadAction<Client[]>) => {
      state.clients = action.payload
      state.loading = false
      state.error = null
    },
    
    addClient: (state, action: PayloadAction<Client>) => {
      state.clients.push(action.payload)
    },
    
    updateClient: (state, action: PayloadAction<Client>) => {
      const index = state.clients.findIndex(client => client.id === action.payload.id)
      if (index !== -1) {
        state.clients[index] = action.payload
      }
    },
    
    removeClient: (state, action: PayloadAction<number>) => {
      state.clients = state.clients.filter(client => client.id !== action.payload)
    },
    
    setClientsError: (state, action: PayloadAction<string>) => {
      state.error = action.payload
      state.loading = false
    },
    
    setClientsFilters: (state, action: PayloadAction<Partial<ClientsState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload }
    },
    
    clearClients: (state) => {
      state.clients = []
      state.loading = false
      state.error = null
    },
  },
})

export const {
  setClientsLoading,
  setClients,
  addClient,
  updateClient,
  removeClient,
  setClientsError,
  setClientsFilters,
  clearClients,
} = clientsSlice.actions

export default clientsSlice.reducer
