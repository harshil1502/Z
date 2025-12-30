import axios, { AxiosInstance, AxiosError } from 'axios'
import type {
  OptionsFlow,
  UnusualActivity,
  OptionsChainData,
  FIIDIIData,
  GammaExposure,
  Symbol,
  PaginatedResponse,
  FlowFilters,
  Alert,
  User,
} from '../types'

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1'

class APIClient {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Request interceptor for auth
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('access_token')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    })

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Handle unauthorized - redirect to login or refresh token
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          window.location.href = '/login'
        }
        return Promise.reject(error)
      }
    )
  }

  // ============== Options Flow ==============

  async getOptionsFlow(
    filters: FlowFilters = {},
    page = 1,
    pageSize = 50
  ): Promise<PaginatedResponse<OptionsFlow>> {
    const params = new URLSearchParams()

    if (filters.symbol) params.append('symbol', filters.symbol)
    if (filters.expiry) params.append('expiry', filters.expiry)
    if (filters.option_type) params.append('option_type', filters.option_type)
    if (filters.unusual_only) params.append('unusual_only', 'true')
    if (filters.min_volume) params.append('min_volume', filters.min_volume.toString())
    if (filters.min_oi) params.append('min_oi', filters.min_oi.toString())

    params.append('page', page.toString())
    params.append('page_size', pageSize.toString())

    const response = await this.client.get(`/flow?${params}`)
    return response.data
  }

  async getUnusualActivity(
    symbol?: string,
    severity?: string,
    limit = 50
  ): Promise<UnusualActivity[]> {
    const params = new URLSearchParams()

    if (symbol) params.append('symbol', symbol)
    if (severity) params.append('severity', severity)
    params.append('limit', limit.toString())

    const response = await this.client.get(`/flow/unusual?${params}`)
    return response.data
  }

  // ============== Options Data ==============

  async getSymbols(exchange?: string, segment?: string): Promise<Symbol[]> {
    const params = new URLSearchParams()

    if (exchange) params.append('exchange', exchange)
    if (segment) params.append('segment', segment)

    const response = await this.client.get(`/options/symbols?${params}`)
    return response.data
  }

  async getOptionsChain(symbol: string, expiry?: string): Promise<OptionsChainData> {
    const params = new URLSearchParams()
    if (expiry) params.append('expiry', expiry)

    const response = await this.client.get(`/options/chain/${symbol}?${params}`)
    return response.data
  }

  async getExpiries(symbol: string): Promise<string[]> {
    const response = await this.client.get(`/options/expiries/${symbol}`)
    return response.data
  }

  // ============== Analytics ==============

  async getGammaExposure(symbol: string, expiry?: string): Promise<GammaExposure> {
    const params = new URLSearchParams()
    if (expiry) params.append('expiry', expiry)

    const response = await this.client.get(`/analytics/gex/${symbol}?${params}`)
    return response.data
  }

  async getPCR(
    symbol: string,
    expiry?: string
  ): Promise<{ oi_pcr: number; volume_pcr: number }> {
    const params = new URLSearchParams()
    if (expiry) params.append('expiry', expiry)

    const response = await this.client.get(`/analytics/pcr/${symbol}?${params}`)
    return response.data
  }

  async getFIIDII(startDate?: string, endDate?: string): Promise<FIIDIIData[]> {
    const params = new URLSearchParams()
    if (startDate) params.append('start_date', startDate)
    if (endDate) params.append('end_date', endDate)

    const response = await this.client.get(`/analytics/fii-dii?${params}`)
    return response.data
  }

  // ============== Authentication ==============

  async login(email: string, password: string): Promise<{ access_token: string; refresh_token: string }> {
    const response = await this.client.post('/auth/login', { email, password })
    const { access_token, refresh_token } = response.data

    localStorage.setItem('access_token', access_token)
    localStorage.setItem('refresh_token', refresh_token)

    return response.data
  }

  async register(email: string, password: string, fullName?: string): Promise<User> {
    const response = await this.client.post('/auth/register', {
      email,
      password,
      full_name: fullName,
    })
    return response.data
  }

  async logout(): Promise<void> {
    await this.client.post('/auth/logout')
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
  }

  // ============== User ==============

  async getCurrentUser(): Promise<User> {
    const response = await this.client.get('/users/me')
    return response.data
  }

  // ============== Alerts ==============

  async getAlerts(): Promise<Alert[]> {
    const response = await this.client.get('/alerts')
    return response.data
  }

  async createAlert(alert: Omit<Alert, 'id' | 'user_id' | 'trigger_count' | 'last_triggered_at' | 'created_at'>): Promise<Alert> {
    const response = await this.client.post('/alerts', alert)
    return response.data
  }

  async deleteAlert(alertId: number): Promise<void> {
    await this.client.delete(`/alerts/${alertId}`)
  }

  async toggleAlert(alertId: number): Promise<Alert> {
    const response = await this.client.post(`/alerts/${alertId}/toggle`)
    return response.data
  }

  // ============== Market ==============

  async getMarketStatus(): Promise<{
    status: string
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
  }> {
    const response = await this.client.get('/market/status')
    return response.data
  }

  async getIndices(): Promise<{
    timestamp: string
    indices: Array<{
      symbol: string
      name: string
      last_price: number
      change: number
      change_percent: number
      open: number
      high: number
      low: number
      prev_close: number
    }>
  }> {
    const response = await this.client.get('/market/indices')
    return response.data
  }

  async getTradingHolidays(year?: number): Promise<{
    year: number
    holidays: Array<{ date: string; day: string }>
    total: number
  }> {
    const params = year ? `?year=${year}` : ''
    const response = await this.client.get(`/market/holidays${params}`)
    return response.data
  }

  async getUpcomingExpiries(): Promise<{
    timestamp: string
    expiries: Array<{
      date: string
      day: string
      type: string
      days_to_expiry: number
    }>
  }> {
    const response = await this.client.get('/market/expiries')
    return response.data
  }
}

export const api = new APIClient()
export default api
