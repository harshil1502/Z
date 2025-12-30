import { create } from 'zustand'
import type { User, FlowFilters } from '../types'

interface AppState {
  // User
  user: User | null
  setUser: (user: User | null) => void
  isAuthenticated: boolean

  // Theme
  theme: 'dark' | 'light'
  toggleTheme: () => void

  // Filters
  flowFilters: FlowFilters
  setFlowFilters: (filters: Partial<FlowFilters>) => void
  resetFlowFilters: () => void

  // Selected symbol
  selectedSymbol: string
  setSelectedSymbol: (symbol: string) => void

  // Real-time updates
  isLiveUpdates: boolean
  toggleLiveUpdates: () => void

  // Sidebar
  isSidebarOpen: boolean
  toggleSidebar: () => void
}

const defaultFilters: FlowFilters = {
  symbol: undefined,
  expiry: undefined,
  option_type: undefined,
  unusual_only: false,
  min_volume: undefined,
  min_oi: undefined,
}

export const useAppStore = create<AppState>((set) => ({
  // User
  user: null,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  isAuthenticated: false,

  // Theme
  theme: 'dark',
  toggleTheme: () =>
    set((state) => ({
      theme: state.theme === 'dark' ? 'light' : 'dark',
    })),

  // Filters
  flowFilters: defaultFilters,
  setFlowFilters: (filters) =>
    set((state) => ({
      flowFilters: { ...state.flowFilters, ...filters },
    })),
  resetFlowFilters: () => set({ flowFilters: defaultFilters }),

  // Selected symbol
  selectedSymbol: 'NIFTY',
  setSelectedSymbol: (symbol) => set({ selectedSymbol: symbol }),

  // Real-time updates
  isLiveUpdates: true,
  toggleLiveUpdates: () =>
    set((state) => ({ isLiveUpdates: !state.isLiveUpdates })),

  // Sidebar
  isSidebarOpen: true,
  toggleSidebar: () =>
    set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
}))
