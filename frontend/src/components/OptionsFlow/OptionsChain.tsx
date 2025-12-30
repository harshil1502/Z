/**
 * Enhanced Options Chain component with professional visualizations.
 */

import { useParams } from 'react-router-dom'
import { useOptionsChain, useExpiries } from '../../hooks/useOptionsFlow'
import { useState, useMemo } from 'react'
import clsx from 'clsx'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { GaugeChart, Sparkline, BarChart } from '../ui/Charts'
import { DualProgressBar } from '../ui/Progress'
import { Skeleton, TableSkeleton } from '../ui/Skeleton'
import { StatsCard } from '../ui/StatsCard'
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  Zap,
  Calendar,
  Eye,
  EyeOff,
  ArrowUpRight,
  ArrowDownRight,
  Maximize2,
  Minimize2
} from 'lucide-react'

// OI Bar visualization for the chain
function OIBar({ value, max, side }: { value: number; max: number; side: 'call' | 'put' }) {
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0
  const isCall = side === 'call'

  return (
    <div className={clsx(
      'h-2 rounded-full overflow-hidden',
      isCall ? 'bg-green-900/30' : 'bg-red-900/30'
    )}>
      <div
        className={clsx(
          'h-full transition-all duration-300',
          isCall ? 'bg-green-500/60' : 'bg-red-500/60'
        )}
        style={{ width: `${percentage}%` }}
      />
    </div>
  )
}

// Strike row component for better organization
function StrikeRow({
  strike,
  isATM,
  isITMCall,
  isITMPut,
  isMaxPain,
  maxOI,
  underlyingPrice,
  showGreeks
}: {
  strike: {
    strike_price: number
    ce_oi?: number
    ce_oi_change?: number
    ce_volume?: number
    ce_ltp?: number
    ce_iv?: number
    ce_delta?: number
    pe_oi?: number
    pe_oi_change?: number
    pe_volume?: number
    pe_ltp?: number
    pe_iv?: number
    pe_delta?: number
  }
  isATM: boolean
  isITMCall: boolean
  isITMPut: boolean
  isMaxPain: boolean
  maxOI: number
  underlyingPrice: number
  showGreeks: boolean
}) {
  const straddlePremium = (strike.ce_ltp || 0) + (strike.pe_ltp || 0)
  const distanceFromSpot = underlyingPrice
    ? ((strike.strike_price - underlyingPrice) / underlyingPrice * 100).toFixed(1)
    : 0

  return (
    <tr
      className={clsx(
        'transition-colors hover:bg-gray-800/50',
        isATM && 'bg-primary-900/30 border-y-2 border-primary-500/50',
        isMaxPain && !isATM && 'bg-yellow-900/20'
      )}
    >
      {/* Call side - OI Change */}
      <td className={clsx(
        'text-right tabular-nums px-3 py-2',
        isITMCall && 'bg-green-900/10'
      )}>
        <span className={clsx(
          'inline-flex items-center gap-1',
          (strike.ce_oi_change || 0) > 0 && 'text-green-400',
          (strike.ce_oi_change || 0) < 0 && 'text-red-400'
        )}>
          {(strike.ce_oi_change || 0) > 0 && <ArrowUpRight size={12} />}
          {(strike.ce_oi_change || 0) < 0 && <ArrowDownRight size={12} />}
          {strike.ce_oi_change?.toLocaleString() || '—'}
        </span>
      </td>

      {/* Call OI with bar */}
      <td className={clsx('px-3 py-2', isITMCall && 'bg-green-900/10')}>
        <div className="space-y-1">
          <div className="text-right tabular-nums text-sm">
            {strike.ce_oi?.toLocaleString() || '—'}
          </div>
          <OIBar value={strike.ce_oi || 0} max={maxOI} side="call" />
        </div>
      </td>

      {/* Call Volume */}
      <td className={clsx(
        'text-right tabular-nums text-sm px-3 py-2',
        isITMCall && 'bg-green-900/10'
      )}>
        {strike.ce_volume?.toLocaleString() || '—'}
      </td>

      {/* Call IV */}
      <td className={clsx(
        'text-right tabular-nums text-sm px-3 py-2',
        isITMCall && 'bg-green-900/10',
        (strike.ce_iv || 0) > 30 && 'text-orange-400'
      )}>
        {strike.ce_iv?.toFixed(1)}%
      </td>

      {/* Call LTP */}
      <td className={clsx(
        'text-right tabular-nums font-medium px-3 py-2',
        isITMCall && 'bg-green-900/10 text-green-400'
      )}>
        ₹{strike.ce_ltp?.toFixed(2) || '—'}
      </td>

      {/* Greeks - Delta */}
      {showGreeks && (
        <td className={clsx(
          'text-right tabular-nums text-xs text-gray-400 px-2 py-2',
          isITMCall && 'bg-green-900/10'
        )}>
          {strike.ce_delta?.toFixed(2) || '—'}
        </td>
      )}

      {/* Strike Price */}
      <td className={clsx(
        'text-center font-bold px-4 py-2 bg-gray-800',
        isATM && 'text-primary-400 bg-primary-900/50',
        isMaxPain && !isATM && 'text-yellow-400'
      )}>
        <div className="flex flex-col items-center">
          <span className="text-base">{strike.strike_price}</span>
          {isATM && (
            <span className="text-[10px] text-primary-300 uppercase tracking-wide">ATM</span>
          )}
          {isMaxPain && !isATM && (
            <span className="text-[10px] text-yellow-400 uppercase tracking-wide">Max Pain</span>
          )}
          <span className="text-[10px] text-gray-500">
            {Number(distanceFromSpot) > 0 ? '+' : ''}{distanceFromSpot}%
          </span>
        </div>
      </td>

      {/* Greeks - Delta */}
      {showGreeks && (
        <td className={clsx(
          'text-left tabular-nums text-xs text-gray-400 px-2 py-2',
          isITMPut && 'bg-red-900/10'
        )}>
          {strike.pe_delta?.toFixed(2) || '—'}
        </td>
      )}

      {/* Put LTP */}
      <td className={clsx(
        'text-left tabular-nums font-medium px-3 py-2',
        isITMPut && 'bg-red-900/10 text-red-400'
      )}>
        ₹{strike.pe_ltp?.toFixed(2) || '—'}
      </td>

      {/* Put IV */}
      <td className={clsx(
        'text-left tabular-nums text-sm px-3 py-2',
        isITMPut && 'bg-red-900/10',
        (strike.pe_iv || 0) > 30 && 'text-orange-400'
      )}>
        {strike.pe_iv?.toFixed(1)}%
      </td>

      {/* Put Volume */}
      <td className={clsx(
        'text-left tabular-nums text-sm px-3 py-2',
        isITMPut && 'bg-red-900/10'
      )}>
        {strike.pe_volume?.toLocaleString() || '—'}
      </td>

      {/* Put OI with bar */}
      <td className={clsx('px-3 py-2', isITMPut && 'bg-red-900/10')}>
        <div className="space-y-1">
          <div className="text-left tabular-nums text-sm">
            {strike.pe_oi?.toLocaleString() || '—'}
          </div>
          <OIBar value={strike.pe_oi || 0} max={maxOI} side="put" />
        </div>
      </td>

      {/* Put OI Change */}
      <td className={clsx(
        'text-left tabular-nums px-3 py-2',
        isITMPut && 'bg-red-900/10'
      )}>
        <span className={clsx(
          'inline-flex items-center gap-1',
          (strike.pe_oi_change || 0) > 0 && 'text-green-400',
          (strike.pe_oi_change || 0) < 0 && 'text-red-400'
        )}>
          {(strike.pe_oi_change || 0) > 0 && <ArrowUpRight size={12} />}
          {(strike.pe_oi_change || 0) < 0 && <ArrowDownRight size={12} />}
          {strike.pe_oi_change?.toLocaleString() || '—'}
        </span>
      </td>
    </tr>
  )
}

export default function OptionsChain() {
  const { symbol } = useParams<{ symbol: string }>()
  const [selectedExpiry, setSelectedExpiry] = useState<string | undefined>()
  const [showGreeks, setShowGreeks] = useState(false)
  const [isCompact, setIsCompact] = useState(false)

  const { data: expiries } = useExpiries(symbol || '')
  const { data, isLoading } = useOptionsChain(symbol || '', selectedExpiry)

  // Calculate max OI for relative bars
  const maxOI = useMemo(() => {
    if (!data?.strikes) return 0
    return Math.max(
      ...data.strikes.map(s => Math.max(s.ce_oi || 0, s.pe_oi || 0))
    )
  }, [data?.strikes])

  // Calculate ATM strike
  const atmStrike = useMemo(() => {
    if (!data?.underlying_price || !data?.strikes?.length) return null
    const sorted = [...data.strikes].sort(
      (a, b) => Math.abs(a.strike_price - data.underlying_price!) - Math.abs(b.strike_price - data.underlying_price!)
    )
    return sorted[0]?.strike_price
  }, [data])

  // Calculate straddle premium at ATM
  const straddlePremium = useMemo(() => {
    if (!atmStrike || !data?.strikes) return 0
    const atm = data.strikes.find(s => s.strike_price === atmStrike)
    return (atm?.ce_ltp || 0) + (atm?.pe_ltp || 0)
  }, [atmStrike, data?.strikes])

  // Calculate OI distribution for chart
  const oiDistribution = useMemo(() => {
    if (!data?.strikes?.length) return []
    return data.strikes.slice(0, 10).map(s => ({
      label: String(s.strike_price),
      value: s.ce_oi || 0,
      color: 'bullish' as const
    }))
  }, [data?.strikes])

  if (!symbol) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <Target size={48} className="mb-4 text-gray-600" />
        <p className="text-lg">No symbol selected</p>
        <p className="text-sm">Choose a symbol from the header to view options chain</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-8 w-16" />
            ))}
          </div>
        </div>
        {/* Stats skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        {/* Table skeleton */}
        <TableSkeleton rows={15} cols={11} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">{symbol}</h1>
              <Badge variant="info" size="lg">Options Chain</Badge>
            </div>
            <div className="flex items-center gap-4 mt-1 text-sm">
              <span className="text-gray-400">
                Spot: <span className="text-white font-medium">₹{data?.underlying_price?.toLocaleString()}</span>
              </span>
              <span className="text-gray-500">|</span>
              <span className={clsx(
                'font-medium',
                (data?.pcr || 0) > 1 ? 'text-red-400' : 'text-green-400'
              )}>
                PCR: {data?.pcr?.toFixed(2)}
              </span>
              <span className="text-gray-500">|</span>
              <span className="text-yellow-400">
                Max Pain: ₹{data?.max_pain?.toLocaleString() || '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Expiry Selector */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400 hidden sm:block">
            <Calendar size={14} className="inline mr-1" />
            Expiry:
          </span>
          <div className="flex items-center gap-1.5 bg-gray-800 rounded-lg p-1">
            {expiries?.slice(0, 5).map((exp) => (
              <button
                key={exp}
                onClick={() => setSelectedExpiry(exp)}
                className={clsx(
                  'px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                  (selectedExpiry || expiries[0]) === exp
                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/20'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                )}
              >
                {new Date(exp).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                })}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatsCard
          title="Total Call OI"
          value={data?.total_ce_oi?.toLocaleString() || '0'}
          icon={TrendingUp}
          variant="success"
        />
        <StatsCard
          title="Total Put OI"
          value={data?.total_pe_oi?.toLocaleString() || '0'}
          icon={TrendingDown}
          variant="danger"
        />
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary-500/10">
              <Activity size={20} className="text-primary-400" />
            </div>
            <div>
              <p className="text-xs text-gray-400">PCR (OI)</p>
              <p className={clsx(
                'text-xl font-bold tabular-nums',
                (data?.pcr || 0) > 1 ? 'text-red-400' : 'text-green-400'
              )}>
                {data?.pcr?.toFixed(2)}
              </p>
            </div>
          </div>
        </Card>
        <StatsCard
          title="Max Pain"
          value={`₹${data?.max_pain?.toLocaleString() || '—'}`}
          icon={Target}
          variant="warning"
        />
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Zap size={20} className="text-purple-400" />
            </div>
            <div>
              <p className="text-xs text-gray-400">ATM Straddle</p>
              <p className="text-xl font-bold text-purple-400 tabular-nums">
                ₹{straddlePremium.toFixed(2)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* OI Distribution Bar */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-white">OI Distribution</h3>
          <div className="flex items-center gap-4 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              Calls
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              Puts
            </span>
          </div>
        </div>
        <DualProgressBar
          leftValue={data?.total_ce_oi || 0}
          rightValue={data?.total_pe_oi || 0}
          leftLabel="Call OI"
          rightLabel="Put OI"
          size="lg"
        />
      </Card>

      {/* Table Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowGreeks(!showGreeks)}
            className={clsx(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors',
              showGreeks
                ? 'bg-primary-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            )}
          >
            {showGreeks ? <Eye size={14} /> : <EyeOff size={14} />}
            Greeks
          </button>
          <button
            onClick={() => setIsCompact(!isCompact)}
            className={clsx(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors',
              isCompact
                ? 'bg-primary-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:text-white'
            )}
          >
            {isCompact ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
            {isCompact ? 'Expand' : 'Compact'}
          </button>
        </div>
        <div className="text-sm text-gray-400">
          {data?.strikes?.length || 0} strikes
        </div>
      </div>

      {/* Options Chain Table */}
      <Card variant="elevated" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className={clsx(
            'w-full',
            isCompact ? 'text-xs' : 'text-sm'
          )}>
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-900">
                {/* Call side headers */}
                <th className="text-right px-3 py-3 font-medium text-green-400 bg-green-900/20 whitespace-nowrap">
                  OI Chg
                </th>
                <th className="text-right px-3 py-3 font-medium text-green-400 bg-green-900/20 whitespace-nowrap">
                  OI
                </th>
                <th className="text-right px-3 py-3 font-medium text-green-400 bg-green-900/20 whitespace-nowrap">
                  Vol
                </th>
                <th className="text-right px-3 py-3 font-medium text-green-400 bg-green-900/20 whitespace-nowrap">
                  IV
                </th>
                <th className="text-right px-3 py-3 font-medium text-green-400 bg-green-900/20 whitespace-nowrap">
                  LTP
                </th>
                {showGreeks && (
                  <th className="text-right px-2 py-3 font-medium text-green-400 bg-green-900/20 whitespace-nowrap">
                    Delta
                  </th>
                )}
                {/* Strike */}
                <th className="text-center px-4 py-3 font-bold text-white bg-gray-800 whitespace-nowrap min-w-[100px]">
                  STRIKE
                </th>
                {/* Put side headers */}
                {showGreeks && (
                  <th className="text-left px-2 py-3 font-medium text-red-400 bg-red-900/20 whitespace-nowrap">
                    Delta
                  </th>
                )}
                <th className="text-left px-3 py-3 font-medium text-red-400 bg-red-900/20 whitespace-nowrap">
                  LTP
                </th>
                <th className="text-left px-3 py-3 font-medium text-red-400 bg-red-900/20 whitespace-nowrap">
                  IV
                </th>
                <th className="text-left px-3 py-3 font-medium text-red-400 bg-red-900/20 whitespace-nowrap">
                  Vol
                </th>
                <th className="text-left px-3 py-3 font-medium text-red-400 bg-red-900/20 whitespace-nowrap">
                  OI
                </th>
                <th className="text-left px-3 py-3 font-medium text-red-400 bg-red-900/20 whitespace-nowrap">
                  OI Chg
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/50">
              {data?.strikes.map((strike) => {
                const isITMCall = data.underlying_price && strike.strike_price < data.underlying_price
                const isITMPut = data.underlying_price && strike.strike_price > data.underlying_price
                const isATM = strike.strike_price === atmStrike
                const isMaxPain = data.max_pain && strike.strike_price === data.max_pain

                return (
                  <StrikeRow
                    key={strike.strike_price}
                    strike={strike}
                    isATM={isATM}
                    isITMCall={!!isITMCall}
                    isITMPut={!!isITMPut}
                    isMaxPain={!!isMaxPain}
                    maxOI={maxOI}
                    underlyingPrice={data.underlying_price || 0}
                    showGreeks={showGreeks}
                  />
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
