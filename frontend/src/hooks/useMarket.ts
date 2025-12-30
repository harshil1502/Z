/**
 * Market data hooks for market status, indices, and expiries.
 */

import { useQuery } from '@tanstack/react-query'
import api from '../services/api'

export interface MarketStatus {
  status: 'OPEN' | 'CLOSED' | 'PRE_OPEN' | 'PRE_OPEN_END'
  reason: string
  is_trading_day: boolean
  next_event?: string
  next_event_time?: string
  timestamp: string
  timezone: string
  market_hours: {
    pre_open_start: string
    pre_open_end: string
    market_open: string
    market_close: string
  }
}

export interface IndexData {
  symbol: string
  name: string
  last_price: number
  change: number
  change_percent: number
  open: number
  high: number
  low: number
  prev_close: number
}

export interface IndicesResponse {
  timestamp: string
  indices: IndexData[]
}

export interface TradingHoliday {
  date: string
  day: string
}

export interface HolidaysResponse {
  year: number
  holidays: TradingHoliday[]
  total: number
}

export interface ExpiryInfo {
  date: string
  day: string
  type: 'weekly' | 'monthly'
  days_to_expiry: number
}

export interface ExpiriesResponse {
  timestamp: string
  expiries: ExpiryInfo[]
}

export function useMarketStatus() {
  return useQuery<MarketStatus>({
    queryKey: ['marketStatus'],
    queryFn: () => api.getMarketStatus(),
    refetchInterval: 60000, // Refetch every minute
    staleTime: 30000, // Consider stale after 30 seconds
  })
}

export function useIndices() {
  return useQuery<IndicesResponse>({
    queryKey: ['indices'],
    queryFn: () => api.getIndices(),
    refetchInterval: 10000, // Refetch every 10 seconds during market hours
  })
}

export function useTradingHolidays(year?: number) {
  return useQuery<HolidaysResponse>({
    queryKey: ['tradingHolidays', year],
    queryFn: () => api.getTradingHolidays(year),
    staleTime: 1000 * 60 * 60 * 24, // Cache for 24 hours
  })
}

export function useUpcomingExpiries() {
  return useQuery<ExpiriesResponse>({
    queryKey: ['upcomingExpiries'],
    queryFn: () => api.getUpcomingExpiries(),
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  })
}
