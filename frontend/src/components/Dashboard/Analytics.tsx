/**
 * Enhanced Analytics component with data visualizations.
 */

import { useAppStore } from '../../store'
import { useGammaExposure, usePCR, useFIIDII, useOptionsFlow } from '../../hooks/useOptionsFlow'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { StatsCard, StatGroup, MiniStats } from '../ui/StatsCard'
import { Badge } from '../ui/Badge'
import { Skeleton } from '../ui/Skeleton'
import { ProgressBar, DualProgressBar, CircularProgress } from '../ui/Progress'
import { GaugeChart, BarChart, Sparkline, DonutChart } from '../ui/Charts'
import { Button } from '../ui/Button'
import { NoDataEmptyState } from '../ui/EmptyState'
import {
  BarChart3, TrendingUp, TrendingDown, Activity, Target,
  ArrowUpRight, ArrowDownRight, Info, RefreshCw, Download
} from 'lucide-react'
import clsx from 'clsx'

// GEX Bar Chart Component
function GammaExposureChart() {
  const { selectedSymbol } = useAppStore()
  const { data, isLoading, refetch, isFetching } = useGammaExposure(selectedSymbol)

  if (isLoading) {
    return (
      <Card padding="none">
        <div className="px-4 py-3 border-b border-gray-700">
          <Skeleton height={20} className="w-40" />
        </div>
        <div className="p-6 h-80">
          <Skeleton height="100%" />
        </div>
      </Card>
    )
  }

  if (!data || !data.levels || data.levels.length === 0) {
    return (
      <Card padding="none">
        <div className="px-4 py-3 border-b border-gray-700">
          <h3 className="font-medium text-white">Gamma Exposure (GEX)</h3>
        </div>
        <NoDataEmptyState onRefresh={refetch} />
      </Card>
    )
  }

  // Transform data for bar chart
  const chartData = data.levels.slice(0, 15).map((level) => ({
    label: level.strike_price.toString(),
    value: level.total_gex / 1000000,
    color: level.total_gex >= 0 ? 'bullish' as const : 'bearish' as const,
  }))

  const maxGexStrike = data.levels.reduce((max, level) =>
    Math.abs(level.total_gex) > Math.abs(max.total_gex) ? level : max
  , data.levels[0])

  return (
    <Card padding="none">
      <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
        <div>
          <h3 className="font-medium text-white">Gamma Exposure (GEX)</h3>
          <p className="text-sm text-gray-400 mt-0.5">
            {selectedSymbol} • Spot: ₹{data.underlying_price?.toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="xs"
            leftIcon={<RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />}
            onClick={() => refetch()}
            disabled={isFetching}
          >
            Refresh
          </Button>
        </div>
      </div>

      <div className="p-6">
        <BarChart
          data={chartData}
          height={280}
          orientation="vertical"
          showLabels
          showValues={false}
        />
      </div>

      <div className="px-4 py-3 border-t border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-green-500 rounded" />
              <span className="text-sm text-gray-400">Positive GEX</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-red-500 rounded" />
              <span className="text-sm text-gray-400">Negative GEX</span>
            </div>
          </div>
          <div className="text-sm">
            <span className="text-gray-400">Total: </span>
            <span className={clsx(
              'font-semibold',
              data.total_gex >= 0 ? 'text-green-400' : 'text-red-400'
            )}>
              {(data.total_gex / 1000000).toFixed(2)}M
            </span>
          </div>
        </div>

        {data.gex_flip_level && (
          <div className="mt-3 pt-3 border-t border-gray-700/50 flex items-center justify-between">
            <span className="text-sm text-gray-400">GEX Flip Level</span>
            <Badge variant="info">₹{data.gex_flip_level.toLocaleString()}</Badge>
          </div>
        )}

        {maxGexStrike && (
          <div className="mt-2 flex items-center justify-between">
            <span className="text-sm text-gray-400">Max GEX Strike</span>
            <Badge variant={maxGexStrike.total_gex >= 0 ? 'bullish' : 'bearish'}>
              ₹{maxGexStrike.strike_price.toLocaleString()}
            </Badge>
          </div>
        )}
      </div>
    </Card>
  )
}

// PCR Analysis Card
function PCRAnalysis() {
  const { selectedSymbol } = useAppStore()
  const { data, isLoading } = usePCR(selectedSymbol)

  if (isLoading) {
    return (
      <Card padding="lg">
        <Skeleton height={20} className="w-32 mb-6" />
        <div className="flex justify-center">
          <Skeleton variant="circular" width={160} height={100} />
        </div>
      </Card>
    )
  }

  const oiPCR = data?.oi_pcr || 1
  const volumePCR = data?.volume_pcr || 1

  // Determine sentiment
  const getSentiment = (pcr: number) => {
    if (pcr < 0.7) return { label: 'Very Bullish', color: 'text-green-400' }
    if (pcr < 0.9) return { label: 'Bullish', color: 'text-green-400' }
    if (pcr < 1.1) return { label: 'Neutral', color: 'text-yellow-400' }
    if (pcr < 1.3) return { label: 'Bearish', color: 'text-red-400' }
    return { label: 'Very Bearish', color: 'text-red-400' }
  }

  const sentiment = getSentiment(oiPCR)

  return (
    <Card padding="lg">
      <h3 className="font-medium text-white mb-6 flex items-center gap-2">
        <BarChart3 size={18} className="text-primary-400" />
        Put-Call Ratio Analysis
      </h3>

      <div className="flex flex-col items-center">
        <GaugeChart
          value={oiPCR}
          min={0}
          max={2}
          label="OI PCR"
          zones={[
            { min: 0, max: 0.7, color: '#22c55e', label: 'Very Bullish' },
            { min: 0.7, max: 0.9, color: '#4ade80', label: 'Bullish' },
            { min: 0.9, max: 1.1, color: '#f59e0b', label: 'Neutral' },
            { min: 1.1, max: 1.3, color: '#f87171', label: 'Bearish' },
            { min: 1.3, max: 2, color: '#ef4444', label: 'Very Bearish' },
          ]}
        />

        <div className="mt-6 w-full space-y-4">
          <div className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
            <span className="text-gray-400">Volume PCR</span>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white tabular-nums">
                {volumePCR.toFixed(2)}
              </span>
              <Badge variant={volumePCR > 1 ? 'bearish' : 'bullish'} size="sm">
                {volumePCR > 1 ? 'Bearish' : 'Bullish'}
              </Badge>
            </div>
          </div>

          <div className="p-3 bg-gray-700/30 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-400">Sentiment</span>
              <span className={clsx('font-semibold', sentiment.color)}>
                {sentiment.label}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              PCR {'>'} 1 indicates more puts than calls, suggesting bearish sentiment.
              PCR {'<'} 1 indicates more calls than puts, suggesting bullish sentiment.
            </p>
          </div>
        </div>
      </div>
    </Card>
  )
}

// FII/DII Detailed Card
function FIIDIIAnalysis() {
  const { data, isLoading } = useFIIDII()

  if (isLoading) {
    return (
      <Card padding="lg">
        <Skeleton height={20} className="w-32 mb-4" />
        <div className="space-y-4">
          <Skeleton height={80} />
          <Skeleton height={80} />
        </div>
      </Card>
    )
  }

  const latestFII = data?.find((d) => d.category === 'FII' && d.segment === 'CASH')
  const latestDII = data?.find((d) => d.category === 'DII' && d.segment === 'CASH')

  const fiiNet = latestFII?.net_value || 0
  const diiNet = latestDII?.net_value || 0
  const totalNet = fiiNet + diiNet

  return (
    <Card padding="lg">
      <h3 className="font-medium text-white mb-6 flex items-center gap-2">
        <Target size={18} className="text-primary-400" />
        FII/DII Activity
      </h3>

      <div className="space-y-4">
        {/* FII Card */}
        <div className="p-4 bg-gradient-to-r from-blue-900/20 to-transparent border border-blue-800/30 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-blue-400 font-medium">FII</span>
              <Badge variant="info" size="sm">Foreign</Badge>
            </div>
            <span className={clsx(
              'text-xl font-bold tabular-nums',
              fiiNet >= 0 ? 'text-green-400' : 'text-red-400'
            )}>
              {fiiNet >= 0 ? '+' : ''}₹{(fiiNet / 100).toFixed(0)} Cr
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Buy</span>
              <div className="font-medium text-green-400 tabular-nums">
                ₹{((latestFII?.buy_value || 0) / 100).toFixed(0)} Cr
              </div>
            </div>
            <div className="text-right">
              <span className="text-gray-500">Sell</span>
              <div className="font-medium text-red-400 tabular-nums">
                ₹{((latestFII?.sell_value || 0) / 100).toFixed(0)} Cr
              </div>
            </div>
          </div>
        </div>

        {/* DII Card */}
        <div className="p-4 bg-gradient-to-r from-purple-900/20 to-transparent border border-purple-800/30 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-purple-400 font-medium">DII</span>
              <Badge variant="warning" size="sm">Domestic</Badge>
            </div>
            <span className={clsx(
              'text-xl font-bold tabular-nums',
              diiNet >= 0 ? 'text-green-400' : 'text-red-400'
            )}>
              {diiNet >= 0 ? '+' : ''}₹{(diiNet / 100).toFixed(0)} Cr
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Buy</span>
              <div className="font-medium text-green-400 tabular-nums">
                ₹{((latestDII?.buy_value || 0) / 100).toFixed(0)} Cr
              </div>
            </div>
            <div className="text-right">
              <span className="text-gray-500">Sell</span>
              <div className="font-medium text-red-400 tabular-nums">
                ₹{((latestDII?.sell_value || 0) / 100).toFixed(0)} Cr
              </div>
            </div>
          </div>
        </div>

        {/* Total Net */}
        <div className="p-3 bg-gray-700/30 rounded-lg flex items-center justify-between">
          <span className="text-gray-400">Combined Net</span>
          <span className={clsx(
            'font-bold text-lg tabular-nums',
            totalNet >= 0 ? 'text-green-400' : 'text-red-400'
          )}>
            {totalNet >= 0 ? '+' : ''}₹{(totalNet / 100).toFixed(0)} Cr
          </span>
        </div>
      </div>
    </Card>
  )
}

// OI Distribution Widget
function OIDistribution() {
  const { selectedSymbol } = useAppStore()
  const { data } = useOptionsFlow({ symbol: selectedSymbol }, 1, 100)

  const totalCallOI = data?.items
    .filter(f => f.option_type === 'CE')
    .reduce((sum, f) => sum + (f.oi || 0), 0) || 0

  const totalPutOI = data?.items
    .filter(f => f.option_type === 'PE')
    .reduce((sum, f) => sum + (f.oi || 0), 0) || 0

  const totalCallOIChange = data?.items
    .filter(f => f.option_type === 'CE')
    .reduce((sum, f) => sum + (f.oi_change || 0), 0) || 0

  const totalPutOIChange = data?.items
    .filter(f => f.option_type === 'PE')
    .reduce((sum, f) => sum + (f.oi_change || 0), 0) || 0

  return (
    <Card padding="lg">
      <h3 className="font-medium text-white mb-6 flex items-center gap-2">
        <Activity size={18} className="text-primary-400" />
        Open Interest Distribution
      </h3>

      <div className="space-y-6">
        <DualProgressBar
          leftValue={totalCallOI}
          rightValue={totalPutOI}
          leftLabel="Call OI"
          rightLabel="Put OI"
          leftColor="bullish"
          rightColor="bearish"
          size="lg"
        />

        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-green-900/20 border border-green-800/30 rounded-lg">
            <div className="text-sm text-gray-400 mb-1">Call OI</div>
            <div className="text-xl font-bold text-green-400 tabular-nums">
              {(totalCallOI / 100000).toFixed(1)}L
            </div>
            <div className={clsx(
              'text-sm mt-1 tabular-nums',
              totalCallOIChange >= 0 ? 'text-green-400' : 'text-red-400'
            )}>
              {totalCallOIChange >= 0 ? '+' : ''}{(totalCallOIChange / 1000).toFixed(1)}K
            </div>
          </div>
          <div className="p-3 bg-red-900/20 border border-red-800/30 rounded-lg">
            <div className="text-sm text-gray-400 mb-1">Put OI</div>
            <div className="text-xl font-bold text-red-400 tabular-nums">
              {(totalPutOI / 100000).toFixed(1)}L
            </div>
            <div className={clsx(
              'text-sm mt-1 tabular-nums',
              totalPutOIChange >= 0 ? 'text-green-400' : 'text-red-400'
            )}>
              {totalPutOIChange >= 0 ? '+' : ''}{(totalPutOIChange / 1000).toFixed(1)}K
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}

// IV Stats Widget
function IVStats() {
  const { selectedSymbol } = useAppStore()
  const { data } = useOptionsFlow({ symbol: selectedSymbol }, 1, 50)

  const ivData = data?.items.filter(f => f.iv && f.iv > 0) || []
  const avgIV = ivData.length > 0
    ? ivData.reduce((sum, f) => sum + (f.iv || 0), 0) / ivData.length
    : 0
  const maxIV = Math.max(...ivData.map(f => f.iv || 0), 0)
  const minIV = Math.min(...ivData.filter(f => f.iv && f.iv > 0).map(f => f.iv || 0), 100)

  return (
    <Card padding="lg">
      <h3 className="font-medium text-white mb-6 flex items-center gap-2">
        <TrendingUp size={18} className="text-primary-400" />
        Implied Volatility
      </h3>

      <div className="flex justify-center mb-6">
        <CircularProgress
          value={avgIV}
          max={50}
          size={120}
          strokeWidth={10}
          color={avgIV > 25 ? 'warning' : 'primary'}
          showLabel
        />
      </div>

      <div className="text-center mb-4">
        <div className="text-2xl font-bold text-white">{avgIV.toFixed(1)}%</div>
        <div className="text-sm text-gray-400">Average IV</div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <MiniStats label="Min IV" value={`${minIV.toFixed(1)}%`} />
        <MiniStats label="Max IV" value={`${maxIV.toFixed(1)}%`} />
      </div>
    </Card>
  )
}

// Main Analytics Component
export default function Analytics() {
  const { selectedSymbol } = useAppStore()

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <p className="text-gray-400 mt-1">
            Advanced options analytics for <span className="text-primary-400 font-medium">{selectedSymbol}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" leftIcon={<Download size={16} />}>
            Export
          </Button>
        </div>
      </div>

      {/* Top Row - GEX and PCR */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <GammaExposureChart />
        </div>
        <div>
          <PCRAnalysis />
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <FIIDIIAnalysis />
        <OIDistribution />
        <IVStats />
      </div>
    </div>
  )
}
