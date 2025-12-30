/**
 * Enhanced Dashboard component with real-time data widgets.
 */

import { useAppStore } from '../../store'
import { useOptionsFlow, useUnusualActivity, usePCR, useGammaExposure, useFIIDII } from '../../hooks/useOptionsFlow'
import { useMarketStatus, useUpcomingExpiries } from '../../hooks/useMarket'
import { useWebSocketContext } from '../../contexts/WebSocketContext'
import {
  TrendingUp, TrendingDown, Activity, AlertTriangle, BarChart3,
  Calendar, ArrowUpRight, ArrowDownRight, Clock, Zap, Target,
  RefreshCw
} from 'lucide-react'
import clsx from 'clsx'
import { Card, CardHeader, CardContent } from '../ui/Card'
import { StatsCard, StatGroup, MiniStats } from '../ui/StatsCard'
import { Badge } from '../ui/Badge'
import { Skeleton, SkeletonStats, SkeletonTable } from '../ui/Skeleton'
import { DualProgressBar } from '../ui/Progress'
import { Sparkline, GaugeChart, BarChart } from '../ui/Charts'
import { NoActivityEmptyState } from '../ui/EmptyState'
import { Button, IconButton } from '../ui/Button'

// PCR Gauge Widget
function PCRGauge() {
  const { selectedSymbol } = useAppStore()
  const { data, isLoading } = usePCR(selectedSymbol)

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="flex flex-col items-center">
          <Skeleton variant="circular" width={160} height={100} />
          <Skeleton height={20} className="w-20 mt-4" />
        </div>
      </Card>
    )
  }

  return (
    <Card padding="lg" className="flex flex-col items-center">
      <div className="text-sm text-gray-400 mb-4">Put-Call Ratio</div>
      <GaugeChart
        value={data?.oi_pcr || 1}
        min={0}
        max={2}
        label="OI PCR"
        zones={[
          { min: 0, max: 0.8, color: '#22c55e', label: 'Bullish' },
          { min: 0.8, max: 1.2, color: '#f59e0b', label: 'Neutral' },
          { min: 1.2, max: 2, color: '#ef4444', label: 'Bearish' },
        ]}
      />
      <div className="mt-4 w-full pt-4 border-t border-gray-700">
        <MiniStats
          label="Volume PCR"
          value={data?.volume_pcr?.toFixed(2) || '—'}
          trend={data?.volume_pcr && data.volume_pcr > 1 ? 'down' : 'up'}
        />
      </div>
    </Card>
  )
}

// Call/Put Volume Comparison
function VolumeComparison() {
  const { selectedSymbol } = useAppStore()
  const { data } = useOptionsFlow({ symbol: selectedSymbol }, 1, 100)

  const callVolume = data?.items.filter(f => f.option_type === 'CE').reduce((sum, f) => sum + (f.volume || 0), 0) || 0
  const putVolume = data?.items.filter(f => f.option_type === 'PE').reduce((sum, f) => sum + (f.volume || 0), 0) || 0

  return (
    <Card padding="lg">
      <div className="text-sm text-gray-400 mb-4">Volume Distribution</div>
      <DualProgressBar
        leftValue={callVolume}
        rightValue={putVolume}
        leftLabel="Calls"
        rightLabel="Puts"
        leftColor="bullish"
        rightColor="bearish"
        size="lg"
      />
      <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-700">
        <div>
          <div className="text-xs text-gray-500 mb-1">Total CE Volume</div>
          <div className="text-lg font-bold text-green-400 tabular-nums">
            {callVolume.toLocaleString()}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500 mb-1">Total PE Volume</div>
          <div className="text-lg font-bold text-red-400 tabular-nums">
            {putVolume.toLocaleString()}
          </div>
        </div>
      </div>
    </Card>
  )
}

// Upcoming Expiries Widget
function ExpiryWidget() {
  const { data, isLoading } = useUpcomingExpiries()

  if (isLoading) {
    return (
      <Card padding="md">
        <Skeleton height={16} className="w-32 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} height={40} />
          ))}
        </div>
      </Card>
    )
  }

  const upcomingExpiries = data?.expiries.slice(0, 3) || []

  return (
    <Card padding="none">
      <div className="px-4 py-3 border-b border-gray-700 flex items-center gap-2">
        <Calendar size={16} className="text-primary-400" />
        <span className="font-medium text-white">Upcoming Expiries</span>
      </div>
      <div className="divide-y divide-gray-700/50">
        {upcomingExpiries.map((expiry, index) => (
          <div key={index} className="px-4 py-3 flex items-center justify-between">
            <div>
              <div className="font-medium text-white">
                {new Date(expiry.date).toLocaleDateString('en-IN', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                })}
              </div>
              <div className="text-xs text-gray-500">{expiry.day}</div>
            </div>
            <div className="text-right">
              <Badge
                variant={expiry.type === 'weekly' ? 'info' : 'warning'}
                size="sm"
              >
                {expiry.type}
              </Badge>
              <div className="text-xs text-gray-500 mt-1">
                {expiry.days_to_expiry} days
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

// Live Flow Feed
function LiveFlowFeed() {
  const { selectedSymbol } = useAppStore()
  const { isConnected } = useWebSocketContext()
  const { data, isLoading, refetch, isFetching } = useOptionsFlow(
    { symbol: selectedSymbol },
    1,
    8
  )

  return (
    <Card padding="none">
      <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap size={16} className="text-yellow-400" />
          <span className="font-medium text-white">Live Flow</span>
          {isConnected && (
            <Badge variant="success" size="sm" pulse>
              Live
            </Badge>
          )}
        </div>
        <IconButton onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
        </IconButton>
      </div>

      {isLoading ? (
        <div className="p-4 space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton width={60} height={20} />
                <Skeleton width={80} height={16} />
              </div>
              <Skeleton width={60} height={16} />
            </div>
          ))}
        </div>
      ) : (
        <div className="divide-y divide-gray-700/50">
          {data?.items.slice(0, 8).map((flow) => (
            <div
              key={flow.id}
              className={clsx(
                'px-4 py-2.5 flex items-center justify-between transition-colors',
                flow.is_unusual && 'bg-yellow-900/10'
              )}
            >
              <div className="flex items-center gap-3">
                <Badge variant={flow.option_type === 'CE' ? 'bullish' : 'bearish'} size="sm">
                  {flow.strike_price} {flow.option_type}
                </Badge>
                <span className="text-sm text-gray-400">
                  {new Date(flow.timestamp).toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-sm font-medium text-white tabular-nums">
                    ₹{flow.ltp?.toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-500 tabular-nums">
                    Vol: {flow.volume?.toLocaleString()}
                  </div>
                </div>
                {flow.is_unusual && (
                  <AlertTriangle size={14} className="text-yellow-400" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

// Unusual Activity Widget
function UnusualActivityWidget() {
  const { selectedSymbol } = useAppStore()
  const { data, isLoading } = useUnusualActivity(selectedSymbol, undefined, 5)

  return (
    <Card padding="none">
      <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} className="text-yellow-400" />
          <span className="font-medium text-white">Unusual Activity</span>
        </div>
        {data && data.length > 0 && (
          <Badge variant="warning" size="sm">
            {data.length} alerts
          </Badge>
        )}
      </div>

      {isLoading ? (
        <div className="p-4 space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} height={60} />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <NoActivityEmptyState />
      ) : (
        <div className="divide-y divide-gray-700/50">
          {data.map((activity) => (
            <div
              key={activity.id}
              className="px-4 py-3 hover:bg-gray-700/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-white">{activity.symbol}</span>
                    <Badge
                      variant={activity.option_type === 'CE' ? 'bullish' : 'bearish'}
                      size="sm"
                    >
                      {activity.strike_price} {activity.option_type}
                    </Badge>
                  </div>
                  <div className="text-sm text-gray-400">{activity.activity_type}</div>
                </div>
                <div className="text-right">
                  <Badge
                    variant={
                      activity.severity === 'HIGH' ? 'danger' :
                      activity.severity === 'MEDIUM' ? 'warning' : 'default'
                    }
                    size="sm"
                  >
                    {activity.severity}
                  </Badge>
                  <div className="text-xs text-gray-500 mt-1">
                    {activity.change_percentage && (
                      <span className={activity.change_percentage > 0 ? 'text-green-400' : 'text-red-400'}>
                        {activity.change_percentage > 0 ? '+' : ''}{activity.change_percentage.toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

// Quick Stats Row
function QuickStats() {
  const { selectedSymbol } = useAppStore()
  const { data: pcrData, isLoading: pcrLoading } = usePCR(selectedSymbol)
  const { data: flowData, isLoading: flowLoading } = useOptionsFlow({ symbol: selectedSymbol }, 1, 100)
  const { data: marketStatus } = useMarketStatus()

  const isLoading = pcrLoading || flowLoading

  if (isLoading) {
    return <SkeletonStats />
  }

  const totalCalls = flowData?.items.filter(f => f.option_type === 'CE').length || 0
  const totalPuts = flowData?.items.filter(f => f.option_type === 'PE').length || 0
  const unusualCount = flowData?.items.filter(f => f.is_unusual).length || 0
  const totalVolume = flowData?.items.reduce((sum, f) => sum + (f.volume || 0), 0) || 0

  return (
    <StatGroup columns={4}>
      <StatsCard
        title="Put-Call Ratio"
        value={pcrData?.oi_pcr?.toFixed(2) || '—'}
        trend={pcrData?.oi_pcr && pcrData.oi_pcr > 1 ? 'down' : 'up'}
        changeLabel={pcrData?.oi_pcr && pcrData.oi_pcr > 1 ? 'Bearish' : 'Bullish'}
        icon={<BarChart3 size={24} />}
        variant="gradient"
      />
      <StatsCard
        title="Call Entries"
        value={totalCalls}
        trend="up"
        icon={<TrendingUp size={24} />}
        variant="gradient"
      />
      <StatsCard
        title="Put Entries"
        value={totalPuts}
        trend="down"
        icon={<TrendingDown size={24} />}
        variant="gradient"
      />
      <StatsCard
        title="Unusual Alerts"
        value={unusualCount}
        trend={unusualCount > 5 ? 'up' : 'neutral'}
        icon={<AlertTriangle size={24} />}
        variant="gradient"
      />
    </StatGroup>
  )
}

// FII/DII Summary
function FIIDIISummary() {
  const { data, isLoading } = useFIIDII()

  if (isLoading) {
    return (
      <Card padding="md">
        <Skeleton height={16} className="w-32 mb-4" />
        <div className="space-y-3">
          <Skeleton height={24} />
          <Skeleton height={24} />
        </div>
      </Card>
    )
  }

  const latestFII = data?.find(d => d.category === 'FII')
  const latestDII = data?.find(d => d.category === 'DII')

  return (
    <Card padding="none">
      <div className="px-4 py-3 border-b border-gray-700 flex items-center gap-2">
        <Target size={16} className="text-primary-400" />
        <span className="font-medium text-white">FII/DII Activity</span>
      </div>
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-gray-400">FII Net</span>
          <span className={clsx(
            'font-semibold tabular-nums',
            (latestFII?.net_value || 0) > 0 ? 'text-green-400' : 'text-red-400'
          )}>
            {latestFII?.net_value ? (
              <>
                {latestFII.net_value > 0 ? '+' : ''}
                ₹{Math.abs(latestFII.net_value / 100).toFixed(0)} Cr
              </>
            ) : '—'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-400">DII Net</span>
          <span className={clsx(
            'font-semibold tabular-nums',
            (latestDII?.net_value || 0) > 0 ? 'text-green-400' : 'text-red-400'
          )}>
            {latestDII?.net_value ? (
              <>
                {latestDII.net_value > 0 ? '+' : ''}
                ₹{Math.abs(latestDII.net_value / 100).toFixed(0)} Cr
              </>
            ) : '—'}
          </span>
        </div>
      </div>
    </Card>
  )
}

// Main Dashboard Component
export default function Dashboard() {
  const { selectedSymbol } = useAppStore()

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 mt-1">
            Real-time options flow overview for <span className="text-primary-400 font-medium">{selectedSymbol}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" leftIcon={<Clock size={16} />} size="sm">
            Last updated: {new Date().toLocaleTimeString('en-IN')}
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <QuickStats />

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - PCR & Volume */}
        <div className="space-y-6">
          <PCRGauge />
          <VolumeComparison />
          <FIIDIISummary />
        </div>

        {/* Center Column - Live Flow */}
        <div className="lg:col-span-1">
          <LiveFlowFeed />
        </div>

        {/* Right Column - Unusual Activity & Expiries */}
        <div className="space-y-6">
          <UnusualActivityWidget />
          <ExpiryWidget />
        </div>
      </div>
    </div>
  )
}
