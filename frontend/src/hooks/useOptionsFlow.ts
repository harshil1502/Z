import { useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../services/api'
import type { FlowFilters, PaginatedResponse, OptionsFlow, UnusualActivity } from '../types'

export function useOptionsFlow(filters: FlowFilters = {}, page = 1, pageSize = 50) {
  return useQuery<PaginatedResponse<OptionsFlow>>({
    queryKey: ['optionsFlow', filters, page, pageSize],
    queryFn: () => api.getOptionsFlow(filters, page, pageSize),
    refetchInterval: 60000, // Refetch every minute
  })
}

export function useUnusualActivity(symbol?: string, severity?: string, limit = 50) {
  return useQuery<UnusualActivity[]>({
    queryKey: ['unusualActivity', symbol, severity, limit],
    queryFn: () => api.getUnusualActivity(symbol, severity, limit),
    refetchInterval: 30000, // Refetch every 30 seconds
  })
}

export function useOptionsChain(symbol: string, expiry?: string) {
  return useQuery({
    queryKey: ['optionsChain', symbol, expiry],
    queryFn: () => api.getOptionsChain(symbol, expiry),
    enabled: !!symbol,
    refetchInterval: 60000,
  })
}

export function useExpiries(symbol: string) {
  return useQuery({
    queryKey: ['expiries', symbol],
    queryFn: () => api.getExpiries(symbol),
    enabled: !!symbol,
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  })
}

export function useSymbols(exchange?: string, segment?: string) {
  return useQuery({
    queryKey: ['symbols', exchange, segment],
    queryFn: () => api.getSymbols(exchange, segment),
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  })
}

export function useGammaExposure(symbol: string, expiry?: string) {
  return useQuery({
    queryKey: ['gammaExposure', symbol, expiry],
    queryFn: () => api.getGammaExposure(symbol, expiry),
    enabled: !!symbol,
    refetchInterval: 60000,
  })
}

export function usePCR(symbol: string, expiry?: string) {
  return useQuery({
    queryKey: ['pcr', symbol, expiry],
    queryFn: () => api.getPCR(symbol, expiry),
    enabled: !!symbol,
    refetchInterval: 60000,
  })
}

export function useFIIDII(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['fiiDii', startDate, endDate],
    queryFn: () => api.getFIIDII(startDate, endDate),
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  })
}

// Hook to invalidate and refetch all flow data
export function useRefreshFlowData() {
  const queryClient = useQueryClient()

  return () => {
    queryClient.invalidateQueries({ queryKey: ['optionsFlow'] })
    queryClient.invalidateQueries({ queryKey: ['unusualActivity'] })
    queryClient.invalidateQueries({ queryKey: ['optionsChain'] })
  }
}
