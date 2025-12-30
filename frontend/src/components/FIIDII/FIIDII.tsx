/**
 * FII/DII Flow Analysis Page
 * Comprehensive institutional flow tracking for Indian markets.
 */

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../services/api'
import clsx from 'clsx'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { StatsCard } from '../ui/StatsCard'
import { DualProgressBar, CircularProgress } from '../ui/Progress'
import { BarChart, Sparkline } from '../ui/Charts'
import { Skeleton, TableSkeleton } from '../ui/Skeleton'
import { EmptyState } from '../ui/EmptyState'
import {
  TrendingUp,
  TrendingDown,
  Building2,
  Landmark,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Download,
  BarChart3,
  PieChart,
  Activity,
  IndianRupee
} from 'lucide-react'

type TimeRange = '1D' | '1W' | '1M' | '3M' | '6M' | '1Y'
type Segment = 'all' | 'cash' | 'derivatives'

interface FIIDIIData {
  date: string
  fii_buy: number
  fii_sell: number
  fii_net: number
  dii_buy: number
  dii_sell: number
  dii_net: number
  segment: string
}

// Summary card for FII or DII
function InstitutionCard({
  title,
  icon: Icon,
  buy,
  sell,
  net,
  trend,
  color
}: {
  title: string
  icon: typeof Building2
  buy: number
  sell: number
  net: number
  trend: number[]
  color: 'fii' | 'dii'
}) {
  const isPositive = net >= 0
  const colorClasses = color === 'fii'
    ? { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' }
    : { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' }

  return (
    <Card className={clsx('p-5 border', colorClasses.border)}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={clsx('p-2.5 rounded-xl', colorClasses.bg)}>
            <Icon size={22} className={colorClasses.text} />
          </div>
          <div>
            <h3 className="font-semibold text-white">{title}</h3>
            <p className="text-xs text-gray-400">Institutional Activity</p>
          </div>
        </div>
        <Sparkline
          data={trend}
          width={80}
          height={30}
          color={isPositive ? '#22c55e' : '#ef4444'}
        />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <p className="text-xs text-gray-400 mb-1">Buy</p>
          <p className="text-lg font-bold text-green-400 tabular-nums">
            ₹{(buy / 100).toFixed(0)}Cr
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">Sell</p>
          <p className="text-lg font-bold text-red-400 tabular-nums">
            ₹{(sell / 100).toFixed(0)}Cr
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-400 mb-1">Net</p>
          <p className={clsx(
            'text-lg font-bold tabular-nums flex items-center gap-1',
            isPositive ? 'text-green-400' : 'text-red-400'
          )}>
            {isPositive ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
            ₹{Math.abs(net / 100).toFixed(0)}Cr
          </p>
        </div>
      </div>

      <DualProgressBar
        leftValue={buy}
        rightValue={sell}
        leftLabel="Buy"
        rightLabel="Sell"
        size="sm"
      />
    </Card>
  )
}

// Net flow comparison chart
function NetFlowChart({ data }: { data: FIIDIIData[] }) {
  const chartData = useMemo(() => {
    return data.slice(-10).map(d => ({
      label: new Date(d.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      fiiNet: d.fii_net / 100,
      diiNet: d.dii_net / 100
    }))
  }, [data])

  const maxValue = Math.max(
    ...chartData.map(d => Math.max(Math.abs(d.fiiNet), Math.abs(d.diiNet)))
  )

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <BarChart3 size={18} className="text-primary-400" />
          Net Flow Comparison
        </h3>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-blue-500" />
            FII
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-purple-500" />
            DII
          </span>
        </div>
      </div>

      <div className="h-48 flex items-end gap-2">
        {chartData.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            {/* Bars */}
            <div className="flex-1 w-full flex items-end justify-center gap-1">
              {/* FII Bar */}
              <div className="w-2/5 flex flex-col justify-end h-full">
                <div
                  className={clsx(
                    'w-full rounded-t transition-all',
                    d.fiiNet >= 0 ? 'bg-blue-500' : 'bg-blue-500/50'
                  )}
                  style={{
                    height: `${(Math.abs(d.fiiNet) / maxValue) * 100}%`,
                    minHeight: '4px'
                  }}
                />
              </div>
              {/* DII Bar */}
              <div className="w-2/5 flex flex-col justify-end h-full">
                <div
                  className={clsx(
                    'w-full rounded-t transition-all',
                    d.diiNet >= 0 ? 'bg-purple-500' : 'bg-purple-500/50'
                  )}
                  style={{
                    height: `${(Math.abs(d.diiNet) / maxValue) * 100}%`,
                    minHeight: '4px'
                  }}
                />
              </div>
            </div>
            {/* Label */}
            <span className="text-[10px] text-gray-500 whitespace-nowrap">
              {d.label}
            </span>
          </div>
        ))}
      </div>
    </Card>
  )
}

// Cumulative flow tracker
function CumulativeFlow({ data }: { data: FIIDIIData[] }) {
  const cumulative = useMemo(() => {
    let fiiTotal = 0
    let diiTotal = 0
    return data.map(d => {
      fiiTotal += d.fii_net
      diiTotal += d.dii_net
      return { date: d.date, fii: fiiTotal, dii: diiTotal }
    })
  }, [data])

  const latestFII = cumulative[cumulative.length - 1]?.fii || 0
  const latestDII = cumulative[cumulative.length - 1]?.dii || 0

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <Activity size={18} className="text-primary-400" />
          Cumulative Flow (Period)
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="text-center">
          <CircularProgress
            value={Math.abs(latestFII / 100)}
            max={Math.max(Math.abs(latestFII), Math.abs(latestDII)) / 100}
            size={100}
            strokeWidth={8}
            color={latestFII >= 0 ? 'success' : 'danger'}
          >
            <div className="text-center">
              <p className="text-xs text-gray-400">FII</p>
              <p className={clsx(
                'text-sm font-bold',
                latestFII >= 0 ? 'text-green-400' : 'text-red-400'
              )}>
                {latestFII >= 0 ? '+' : ''}{(latestFII / 100).toFixed(0)}Cr
              </p>
            </div>
          </CircularProgress>
        </div>
        <div className="text-center">
          <CircularProgress
            value={Math.abs(latestDII / 100)}
            max={Math.max(Math.abs(latestFII), Math.abs(latestDII)) / 100}
            size={100}
            strokeWidth={8}
            color={latestDII >= 0 ? 'success' : 'danger'}
          >
            <div className="text-center">
              <p className="text-xs text-gray-400">DII</p>
              <p className={clsx(
                'text-sm font-bold',
                latestDII >= 0 ? 'text-green-400' : 'text-red-400'
              )}>
                {latestDII >= 0 ? '+' : ''}{(latestDII / 100).toFixed(0)}Cr
              </p>
            </div>
          </CircularProgress>
        </div>
      </div>
    </Card>
  )
}

// Historical data table
function HistoryTable({ data, isLoading }: { data: FIIDIIData[]; isLoading: boolean }) {
  if (isLoading) {
    return <TableSkeleton rows={10} cols={7} />
  }

  if (!data.length) {
    return (
      <EmptyState
        type="no-data"
        title="No FII/DII Data"
        description="Historical data is not available for the selected period."
      />
    )
  }

  return (
    <Card variant="elevated" className="overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between bg-gray-800/50">
        <h3 className="font-medium text-white flex items-center gap-2">
          <Calendar size={18} className="text-primary-400" />
          Historical Data
        </h3>
        <Button variant="ghost" size="sm">
          <Download size={14} />
          Export CSV
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-900/50">
              <th className="px-4 py-3 text-left font-medium text-gray-400">Date</th>
              <th className="px-4 py-3 text-right font-medium text-blue-400">FII Buy</th>
              <th className="px-4 py-3 text-right font-medium text-blue-400">FII Sell</th>
              <th className="px-4 py-3 text-right font-medium text-blue-400">FII Net</th>
              <th className="px-4 py-3 text-right font-medium text-purple-400">DII Buy</th>
              <th className="px-4 py-3 text-right font-medium text-purple-400">DII Sell</th>
              <th className="px-4 py-3 text-right font-medium text-purple-400">DII Net</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800/50">
            {data.map((row, i) => (
              <tr key={i} className="hover:bg-gray-800/50 transition-colors">
                <td className="px-4 py-3 font-medium text-white">
                  {new Date(row.date).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-green-400">
                  ₹{(row.fii_buy / 100).toFixed(0)}Cr
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-red-400">
                  ₹{(row.fii_sell / 100).toFixed(0)}Cr
                </td>
                <td className={clsx(
                  'px-4 py-3 text-right tabular-nums font-medium',
                  row.fii_net >= 0 ? 'text-green-400' : 'text-red-400'
                )}>
                  {row.fii_net >= 0 ? '+' : ''}₹{(row.fii_net / 100).toFixed(0)}Cr
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-green-400">
                  ₹{(row.dii_buy / 100).toFixed(0)}Cr
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-red-400">
                  ₹{(row.dii_sell / 100).toFixed(0)}Cr
                </td>
                <td className={clsx(
                  'px-4 py-3 text-right tabular-nums font-medium',
                  row.dii_net >= 0 ? 'text-green-400' : 'text-red-400'
                )}>
                  {row.dii_net >= 0 ? '+' : ''}₹{(row.dii_net / 100).toFixed(0)}Cr
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}

export default function FIIDII() {
  const [timeRange, setTimeRange] = useState<TimeRange>('1M')
  const [segment, setSegment] = useState<Segment>('all')

  // Fetch FII/DII data
  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['fiidii', timeRange, segment],
    queryFn: () => api.getFIIDIIData(timeRange, segment),
    staleTime: 5 * 60 * 1000 // 5 minutes
  })

  // Calculate summary stats
  const summary = useMemo(() => {
    if (!data?.length) return null

    const latest = data[0]
    const fiiTrend = data.slice(0, 10).map(d => d.fii_net).reverse()
    const diiTrend = data.slice(0, 10).map(d => d.dii_net).reverse()

    const totalFIINet = data.reduce((sum, d) => sum + d.fii_net, 0)
    const totalDIINet = data.reduce((sum, d) => sum + d.dii_net, 0)

    return {
      latest,
      fiiTrend,
      diiTrend,
      totalFIINet,
      totalDIINet,
      combinedNet: totalFIINet + totalDIINet
    }
  }, [data])

  const timeRanges: TimeRange[] = ['1D', '1W', '1M', '3M', '6M', '1Y']
  const segments: { value: Segment; label: string }[] = [
    { value: 'all', label: 'All Segments' },
    { value: 'cash', label: 'Cash' },
    { value: 'derivatives', label: 'Derivatives' }
  ]

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">FII/DII Activity</h1>
            <Badge variant="info" size="lg">Institutional Flow</Badge>
          </div>
          <p className="text-gray-400 mt-1">
            Track Foreign and Domestic Institutional Investor activity
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Time Range */}
        <div className="flex items-center gap-1.5 bg-gray-800 rounded-lg p-1">
          {timeRanges.map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={clsx(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                timeRange === range
                  ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              )}
            >
              {range}
            </button>
          ))}
        </div>

        {/* Segment Filter */}
        <select
          value={segment}
          onChange={(e) => setSegment(e.target.value as Segment)}
          className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:ring-2 focus:ring-primary-500"
        >
          {segments.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* Summary Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      ) : summary ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InstitutionCard
            title="FII (Foreign)"
            icon={Building2}
            buy={summary.latest.fii_buy}
            sell={summary.latest.fii_sell}
            net={summary.latest.fii_net}
            trend={summary.fiiTrend}
            color="fii"
          />
          <InstitutionCard
            title="DII (Domestic)"
            icon={Landmark}
            buy={summary.latest.dii_buy}
            sell={summary.latest.dii_sell}
            net={summary.latest.dii_net}
            trend={summary.diiTrend}
            color="dii"
          />
        </div>
      ) : null}

      {/* Quick Stats */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatsCard
            title="Total FII Flow"
            value={`${summary.totalFIINet >= 0 ? '+' : ''}₹${(summary.totalFIINet / 100).toFixed(0)}Cr`}
            icon={Building2}
            variant={summary.totalFIINet >= 0 ? 'success' : 'danger'}
          />
          <StatsCard
            title="Total DII Flow"
            value={`${summary.totalDIINet >= 0 ? '+' : ''}₹${(summary.totalDIINet / 100).toFixed(0)}Cr`}
            icon={Landmark}
            variant={summary.totalDIINet >= 0 ? 'success' : 'danger'}
          />
          <StatsCard
            title="Combined Flow"
            value={`${summary.combinedNet >= 0 ? '+' : ''}₹${(summary.combinedNet / 100).toFixed(0)}Cr`}
            icon={IndianRupee}
            variant={summary.combinedNet >= 0 ? 'success' : 'danger'}
          />
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary-500/10">
                <PieChart size={20} className="text-primary-400" />
              </div>
              <div>
                <p className="text-xs text-gray-400">FII:DII Ratio</p>
                <p className="text-xl font-bold text-white tabular-nums">
                  {Math.abs(summary.totalFIINet / (summary.totalDIINet || 1)).toFixed(2)}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Charts Row */}
      {data && data.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <NetFlowChart data={data} />
          </div>
          <CumulativeFlow data={data} />
        </div>
      )}

      {/* History Table */}
      <HistoryTable data={data || []} isLoading={isLoading} />
    </div>
  )
}
