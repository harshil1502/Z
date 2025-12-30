/**
 * Enhanced Options Flow component with professional UI.
 */

import { useState, useMemo, useEffect } from 'react'
import { useOptionsFlow, useUnusualActivity, useExpiries } from '../../hooks/useOptionsFlow'
import { useAppStore } from '../../store'
import {
  Filter,
  RefreshCw,
  Download,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  Clock,
  ChevronDown,
  ChevronUp,
  X,
  Flame,
  Eye,
  BarChart2,
  PieChart
} from 'lucide-react'
import clsx from 'clsx'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { DualProgressBar, CircularProgress } from '../ui/Progress'
import { Sparkline } from '../ui/Charts'
import { Skeleton, TableSkeleton } from '../ui/Skeleton'
import { StatsCard } from '../ui/StatsCard'
import { EmptyState } from '../ui/EmptyState'
import type { FlowFilters } from '../../types'

// Flow row animation component
function FlowRowAnimation({ isNew }: { isNew: boolean }) {
  if (!isNew) return null
  return (
    <span className="absolute inset-0 bg-primary-500/20 animate-pulse pointer-events-none" />
  )
}

// Sentiment badge with color coding
function SentimentBadge({ sentiment, score }: { sentiment: 'bullish' | 'bearish' | 'neutral'; score?: number }) {
  const config = {
    bullish: { color: 'bullish' as const, icon: TrendingUp, label: 'Bullish' },
    bearish: { color: 'bearish' as const, icon: TrendingDown, label: 'Bearish' },
    neutral: { color: 'neutral' as const, icon: Activity, label: 'Neutral' }
  }
  const { color, icon: Icon, label } = config[sentiment]

  return (
    <Badge variant={color} className="gap-1">
      <Icon size={12} />
      {label}
      {score !== undefined && <span className="opacity-70">({score}%)</span>}
    </Badge>
  )
}

// Premium volume indicator
function PremiumIndicator({ premium, avgPremium }: { premium: number; avgPremium: number }) {
  const ratio = avgPremium > 0 ? premium / avgPremium : 1
  const isHigh = ratio > 2
  const isVeryHigh = ratio > 5

  return (
    <div className="flex items-center gap-2">
      <span className={clsx(
        'tabular-nums',
        isVeryHigh && 'text-orange-400 font-medium',
        isHigh && !isVeryHigh && 'text-yellow-400'
      )}>
        ₹{premium.toLocaleString()}
      </span>
      {isVeryHigh && <Flame size={14} className="text-orange-400" />}
    </div>
  )
}

function FlowFiltersPanel({
  filters,
  onChange,
  onReset,
  isExpanded,
  onToggle
}: {
  filters: FlowFilters
  onChange: (filters: Partial<FlowFilters>) => void
  onReset: () => void
  isExpanded: boolean
  onToggle: () => void
}) {
  const { selectedSymbol } = useAppStore()
  const { data: expiries } = useExpiries(selectedSymbol)

  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (filters.expiry) count++
    if (filters.option_type) count++
    if (filters.min_volume) count++
    if (filters.min_oi) count++
    if (filters.unusual_only) count++
    return count
  }, [filters])

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary-500/10">
            <Filter size={18} className="text-primary-400" />
          </div>
          <span className="font-medium text-white">Filters</span>
          {activeFiltersCount > 0 && (
            <Badge variant="bullish" size="sm">{activeFiltersCount} active</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeFiltersCount > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); onReset() }}
              className="text-sm text-gray-400 hover:text-white px-2 py-1 rounded hover:bg-gray-700"
            >
              Clear all
            </button>
          )}
          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </div>
      </button>

      {/* Filters Grid */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-gray-800">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 pt-4">
            {/* Expiry */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">
                Expiry
              </label>
              <select
                value={filters.expiry || ''}
                onChange={(e) => onChange({ expiry: e.target.value || undefined })}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">All Expiries</option>
                {expiries?.map((exp) => (
                  <option key={exp} value={exp}>
                    {new Date(exp).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </option>
                ))}
              </select>
            </div>

            {/* Option Type */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">
                Type
              </label>
              <div className="flex gap-1">
                <button
                  onClick={() => onChange({ option_type: filters.option_type === 'CE' ? undefined : 'CE' })}
                  className={clsx(
                    'flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                    filters.option_type === 'CE'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  )}
                >
                  Calls
                </button>
                <button
                  onClick={() => onChange({ option_type: filters.option_type === 'PE' ? undefined : 'PE' })}
                  className={clsx(
                    'flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                    filters.option_type === 'PE'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  )}
                >
                  Puts
                </button>
              </div>
            </div>

            {/* Min Volume */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">
                Min Volume
              </label>
              <input
                type="number"
                value={filters.min_volume || ''}
                onChange={(e) =>
                  onChange({
                    min_volume: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
                placeholder="0"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Min OI */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">
                Min OI
              </label>
              <input
                type="number"
                value={filters.min_oi || ''}
                onChange={(e) =>
                  onChange({
                    min_oi: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
                placeholder="0"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Min Premium */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1.5 uppercase tracking-wide">
                Min Premium
              </label>
              <input
                type="number"
                value={filters.min_premium || ''}
                onChange={(e) =>
                  onChange({
                    min_premium: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
                placeholder="₹0"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Unusual Only */}
            <div className="flex items-end">
              <button
                onClick={() => onChange({ unusual_only: !filters.unusual_only })}
                className={clsx(
                  'w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                  filters.unusual_only
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                )}
              >
                <Zap size={14} />
                Unusual Only
              </button>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}

function FlowSummaryStats() {
  const { selectedSymbol } = useAppStore()
  const { data: unusual } = useUnusualActivity(selectedSymbol)

  // Mock summary data - would come from API
  const summaryData = useMemo(() => ({
    totalVolume: 125000,
    totalPremium: 45000000,
    callVolume: 72000,
    putVolume: 53000,
    avgIV: 18.5,
    unusualCount: unusual?.length || 0,
    sentiment: 'bullish' as const,
    sentimentScore: 65
  }), [unusual])

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
      <StatsCard
        title="Total Volume"
        value={summaryData.totalVolume.toLocaleString()}
        icon={BarChart2}
        trend={{ value: 12.5, isPositive: true }}
      />
      <StatsCard
        title="Total Premium"
        value={`₹${(summaryData.totalPremium / 10000000).toFixed(1)}Cr`}
        icon={Activity}
        variant="default"
      />
      <Card className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400">Call/Put Ratio</span>
          <PieChart size={14} className="text-gray-500" />
        </div>
        <DualProgressBar
          leftValue={summaryData.callVolume}
          rightValue={summaryData.putVolume}
          leftLabel=""
          rightLabel=""
          size="sm"
        />
        <div className="flex justify-between mt-2 text-xs">
          <span className="text-green-400">{((summaryData.callVolume / (summaryData.callVolume + summaryData.putVolume)) * 100).toFixed(0)}% CE</span>
          <span className="text-red-400">{((summaryData.putVolume / (summaryData.callVolume + summaryData.putVolume)) * 100).toFixed(0)}% PE</span>
        </div>
      </Card>
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <CircularProgress
            value={summaryData.avgIV}
            max={50}
            size={48}
            strokeWidth={4}
            color="warning"
            showLabel={false}
          />
          <div>
            <p className="text-xs text-gray-400">Avg IV</p>
            <p className="text-lg font-bold text-white">{summaryData.avgIV}%</p>
          </div>
        </div>
      </Card>
      <StatsCard
        title="Unusual Trades"
        value={String(summaryData.unusualCount)}
        icon={Zap}
        variant="warning"
      />
      <Card className="p-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-400">Market Sentiment</span>
        </div>
        <SentimentBadge sentiment={summaryData.sentiment} score={summaryData.sentimentScore} />
      </Card>
    </div>
  )
}

function FlowTable() {
  const { flowFilters, selectedSymbol } = useAppStore()
  const [page, setPage] = useState(1)
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')
  const pageSize = 50

  const { data, isLoading, isFetching, refetch } = useOptionsFlow(
    { ...flowFilters, symbol: selectedSymbol },
    page,
    pageSize
  )

  // Track new items for animation
  const [newIds, setNewIds] = useState<Set<number>>(new Set())

  useEffect(() => {
    if (data?.items) {
      const ids = new Set(data.items.slice(0, 5).map(item => item.id))
      setNewIds(ids)
      const timer = setTimeout(() => setNewIds(new Set()), 2000)
      return () => clearTimeout(timer)
    }
  }, [data?.items])

  if (isLoading) {
    return <TableSkeleton rows={10} cols={11} />
  }

  if (!data?.items.length) {
    return (
      <EmptyState
        type="no-data"
        title="No Options Flow Data"
        description="No options flow data available for the selected filters. Try adjusting your filters or check back later."
      />
    )
  }

  return (
    <Card variant="elevated" className="overflow-hidden">
      {/* Table Header */}
      <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between bg-gray-800/50">
        <div className="flex items-center gap-4">
          <h3 className="font-medium text-white flex items-center gap-2">
            <Activity size={18} className="text-primary-400" />
            Live Flow
          </h3>
          <Badge variant="info">{data.total.toLocaleString()} entries</Badge>
          {isFetching && (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <RefreshCw size={12} className="animate-spin" />
              Updating...
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
            Refresh
          </Button>
          <Button variant="ghost" size="sm">
            <Download size={14} />
            Export
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-900/50">
              <th className="px-4 py-3 text-left font-medium text-gray-400">
                <Clock size={14} className="inline mr-1" />
                Time
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-400">Symbol</th>
              <th className="px-4 py-3 text-right font-medium text-gray-400">Strike</th>
              <th className="px-4 py-3 text-left font-medium text-gray-400">Expiry</th>
              <th className="px-4 py-3 text-center font-medium text-gray-400">Type</th>
              <th className="px-4 py-3 text-right font-medium text-gray-400">LTP</th>
              <th className="px-4 py-3 text-right font-medium text-gray-400">Volume</th>
              <th className="px-4 py-3 text-right font-medium text-gray-400">OI</th>
              <th className="px-4 py-3 text-right font-medium text-gray-400">OI Chg</th>
              <th className="px-4 py-3 text-right font-medium text-gray-400">IV</th>
              <th className="px-4 py-3 text-center font-medium text-gray-400">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {data.items.map((flow) => {
              const isNew = newIds.has(flow.id)
              return (
                <tr
                  key={flow.id}
                  className={clsx(
                    'relative transition-colors hover:bg-gray-800/50',
                    flow.is_unusual && 'bg-orange-900/10',
                    isNew && 'animate-pulse'
                  )}
                >
                  <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                    {new Date(flow.timestamp).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })}
                  </td>
                  <td className="px-4 py-3 font-medium text-white">{flow.symbol}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium">
                    {flow.strike_price.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                    {new Date(flow.expiry_date).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Badge
                      variant={flow.option_type === 'CE' ? 'bullish' : 'bearish'}
                      size="sm"
                    >
                      {flow.option_type}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    ₹{flow.ltp?.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium">
                    {flow.volume?.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {flow.oi?.toLocaleString()}
                  </td>
                  <td className={clsx(
                    'px-4 py-3 text-right tabular-nums',
                    (flow.oi_change || 0) > 0 && 'text-green-400',
                    (flow.oi_change || 0) < 0 && 'text-red-400'
                  )}>
                    {(flow.oi_change || 0) > 0 ? '+' : ''}
                    {flow.oi_change?.toLocaleString()}
                  </td>
                  <td className={clsx(
                    'px-4 py-3 text-right tabular-nums',
                    (flow.iv || 0) > 25 && 'text-orange-400'
                  )}>
                    {flow.iv?.toFixed(1)}%
                  </td>
                  <td className="px-4 py-3 text-center">
                    {flow.is_unusual ? (
                      <Badge variant="unusual" className="gap-1">
                        <AlertTriangle size={12} />
                        {flow.unusual_flags?.severity || 'HIGH'}
                      </Badge>
                    ) : (
                      <span className="text-gray-500">—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data.total > pageSize && (
        <div className="px-4 py-3 border-t border-gray-700 flex items-center justify-between bg-gray-800/30">
          <div className="text-sm text-gray-400">
            Showing <span className="font-medium text-white">{(page - 1) * pageSize + 1}</span> to{' '}
            <span className="font-medium text-white">{Math.min(page * pageSize, data.total)}</span> of{' '}
            <span className="font-medium text-white">{data.total.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
            >
              Previous
            </Button>
            <span className="px-3 py-1 bg-gray-800 rounded text-sm text-white">
              {page}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage(page + 1)}
              disabled={!data.has_more}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}

export default function OptionsFlow() {
  const { flowFilters, setFlowFilters, resetFlowFilters, selectedSymbol } = useAppStore()
  const [filtersExpanded, setFiltersExpanded] = useState(false)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">Options Flow</h1>
            <Badge variant="info" size="lg">{selectedSymbol}</Badge>
          </div>
          <p className="text-gray-400 mt-1">
            Real-time options flow with unusual activity detection
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-2 text-sm">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-gray-400">Live</span>
          </span>
        </div>
      </div>

      {/* Summary Stats */}
      <FlowSummaryStats />

      {/* Filters */}
      <FlowFiltersPanel
        filters={flowFilters}
        onChange={setFlowFilters}
        onReset={resetFlowFilters}
        isExpanded={filtersExpanded}
        onToggle={() => setFiltersExpanded(!filtersExpanded)}
      />

      {/* Flow Table */}
      <FlowTable />
    </div>
  )
}
