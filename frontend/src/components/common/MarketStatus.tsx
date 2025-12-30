/**
 * Market Status component
 * Displays current market status, indices, and connection state.
 */

import { useMarketStatus, useIndices } from '../../hooks/useMarket'
import { useWebSocketContext } from '../../contexts/WebSocketContext'
import { useAppStore } from '../../store'

function formatNumber(num: number, decimals = 2): string {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num)
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'OPEN':
      return 'text-green-500'
    case 'PRE_OPEN':
    case 'PRE_OPEN_END':
      return 'text-yellow-500'
    case 'CLOSED':
    default:
      return 'text-red-500'
  }
}

function getStatusBgColor(status: string): string {
  switch (status) {
    case 'OPEN':
      return 'bg-green-500/10 border-green-500/20'
    case 'PRE_OPEN':
    case 'PRE_OPEN_END':
      return 'bg-yellow-500/10 border-yellow-500/20'
    case 'CLOSED':
    default:
      return 'bg-red-500/10 border-red-500/20'
  }
}

export function MarketStatusBadge() {
  const { data: marketStatus, isLoading } = useMarketStatus()

  if (isLoading || !marketStatus) {
    return (
      <div className="px-3 py-1 rounded-full bg-gray-500/10 border border-gray-500/20">
        <span className="text-sm text-gray-400">Loading...</span>
      </div>
    )
  }

  return (
    <div className={`px-3 py-1 rounded-full border ${getStatusBgColor(marketStatus.status)}`}>
      <span className={`text-sm font-medium ${getStatusColor(marketStatus.status)}`}>
        {marketStatus.status === 'OPEN' && '● '}
        {marketStatus.status}
      </span>
    </div>
  )
}

export function ConnectionStatus() {
  const { isConnected, status } = useWebSocketContext()
  const { isLiveUpdates, toggleLiveUpdates } = useAppStore()

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={toggleLiveUpdates}
        className={`flex items-center gap-2 px-3 py-1 rounded-full border transition-colors ${
          isLiveUpdates && isConnected
            ? 'bg-green-500/10 border-green-500/20 text-green-500'
            : 'bg-gray-500/10 border-gray-500/20 text-gray-400'
        }`}
      >
        <span className={`w-2 h-2 rounded-full ${
          isLiveUpdates && isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-500'
        }`} />
        <span className="text-sm font-medium">
          {isLiveUpdates ? (isConnected ? 'Live' : 'Connecting...') : 'Paused'}
        </span>
      </button>
    </div>
  )
}

export function IndicesBar() {
  const { data: indicesData, isLoading } = useIndices()

  if (isLoading || !indicesData) {
    return (
      <div className="flex gap-6 py-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="h-4 w-20 bg-gray-700 rounded mb-1" />
            <div className="h-5 w-24 bg-gray-700 rounded" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex gap-6 py-2 overflow-x-auto">
      {indicesData.indices.map((index) => (
        <div key={index.symbol} className="flex-shrink-0">
          <div className="text-xs text-gray-400">{index.name}</div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white">
              {formatNumber(index.last_price)}
            </span>
            <span className={`text-xs ${
              index.change >= 0 ? 'text-green-500' : 'text-red-500'
            }`}>
              {index.change >= 0 ? '+' : ''}{formatNumber(index.change)} ({index.change_percent >= 0 ? '+' : ''}{formatNumber(index.change_percent)}%)
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

export function MarketStatusCard() {
  const { data: marketStatus, isLoading } = useMarketStatus()

  if (isLoading || !marketStatus) {
    return (
      <div className="bg-gray-800 rounded-lg p-4 animate-pulse">
        <div className="h-6 w-32 bg-gray-700 rounded mb-2" />
        <div className="h-4 w-48 bg-gray-700 rounded" />
      </div>
    )
  }

  return (
    <div className={`rounded-lg p-4 border ${getStatusBgColor(marketStatus.status)}`}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold text-white">Market Status</h3>
        <span className={`text-lg font-bold ${getStatusColor(marketStatus.status)}`}>
          {marketStatus.status}
        </span>
      </div>
      <p className="text-sm text-gray-400 mb-2">{marketStatus.reason}</p>
      {marketStatus.next_event && (
        <p className="text-sm text-gray-300">
          Next: <span className="font-medium">{marketStatus.next_event}</span>
          {marketStatus.next_event_time && (
            <span className="text-gray-400 ml-1">
              at {new Date(marketStatus.next_event_time).toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          )}
        </p>
      )}
      <div className="mt-3 pt-3 border-t border-gray-700 text-xs text-gray-500">
        <span>Market Hours: {marketStatus.market_hours.market_open} - {marketStatus.market_hours.market_close} IST</span>
      </div>
    </div>
  )
}

export default MarketStatusBadge
