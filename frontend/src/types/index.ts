// API Response Types

export interface OptionsFlow {
  id: number
  contract_id: number
  timestamp: string
  symbol: string
  strike_price: number
  expiry_date: string
  option_type: 'CE' | 'PE'
  ltp: number
  volume: number
  oi: number
  oi_change: number
  iv: number
  underlying_price: number
  bid_price?: number
  ask_price?: number
  delta?: number
  gamma?: number
  theta?: number
  vega?: number
  is_unusual: boolean
  unusual_flags?: UnusualFlags
}

export interface UnusualFlags {
  type: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH'
  current_value: number
  baseline_value: number
  change_pct?: number
  z_score?: number
}

export interface UnusualActivity {
  id: number
  symbol: string
  strike_price: number
  expiry_date: string
  option_type: 'CE' | 'PE'
  timestamp: string
  activity_type: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH'
  current_value: number
  baseline_value: number
  change_percentage?: number
  z_score?: number
  ltp?: number
  underlying_price?: number
  premium_value?: number
}

export interface StrikeData {
  strike_price: number
  ce_ltp?: number
  ce_volume?: number
  ce_oi?: number
  ce_oi_change?: number
  ce_iv?: number
  ce_bid?: number
  ce_ask?: number
  ce_delta?: number
  ce_gamma?: number
  pe_ltp?: number
  pe_volume?: number
  pe_oi?: number
  pe_oi_change?: number
  pe_iv?: number
  pe_bid?: number
  pe_ask?: number
  pe_delta?: number
  pe_gamma?: number
}

export interface OptionsChainData {
  symbol: string
  expiry_date: string
  underlying_price: number
  timestamp: string
  total_ce_oi: number
  total_pe_oi: number
  pcr: number
  max_pain?: number
  strikes: StrikeData[]
}

export interface FIIDIIData {
  date: string
  category: 'FII' | 'DII'
  segment: string
  buy_value?: number
  sell_value?: number
  net_value?: number
  long_contracts?: number
  short_contracts?: number
  net_contracts?: number
  is_provisional: boolean
}

export interface GammaExposureLevel {
  strike_price: number
  call_gex: number
  put_gex: number
  total_gex: number
}

export interface GammaExposure {
  symbol: string
  expiry_date: string
  underlying_price: number
  timestamp: string
  total_gex: number
  gex_flip_level?: number
  major_positive_strikes: number[]
  major_negative_strikes: number[]
  levels: GammaExposureLevel[]
}

export interface Symbol {
  id: number
  symbol: string
  name?: string
  exchange: 'NSE' | 'BSE'
  segment?: string
  lot_size?: number
  is_active: boolean
}

export interface User {
  id: number
  email: string
  full_name?: string
  subscription_tier: 'free' | 'pro' | 'elite' | 'institutional'
  is_active: boolean
  is_verified: boolean
}

export interface Alert {
  id: number
  user_id: number
  name: string
  symbol?: string
  alert_type: string
  conditions: Record<string, unknown>
  notification_channels: {
    email?: boolean
    telegram?: boolean
    push?: boolean
  }
  is_active: boolean
  trigger_count: number
  last_triggered_at?: string
  created_at: string
}

// Pagination
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  has_more: boolean
}

// API Error
export interface APIError {
  detail: string
  status_code?: number
}

// Filter Types
export interface FlowFilters {
  symbol?: string
  expiry?: string
  option_type?: 'CE' | 'PE'
  unusual_only?: boolean
  min_volume?: number
  min_oi?: number
}
