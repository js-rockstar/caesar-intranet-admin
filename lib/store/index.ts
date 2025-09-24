import { configureStore } from '@reduxjs/toolkit'
import loadingReducer from './slices/loadingSlice'
import dashboardReducer from './slices/dashboardSlice'
import clientsReducer from './slices/clientsSlice'
import sitesReducer from './slices/sitesSlice'
import installationsReducer from './slices/installationsSlice'

export const store = configureStore({
  reducer: {
    loading: loadingReducer,
    dashboard: dashboardReducer,
    clients: clientsReducer,
    sites: sitesReducer,
    installations: installationsReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
