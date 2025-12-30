import { useAppStore } from '../../store'
import { useOptionsFlow, useUnusualActivity, usePCR } from '../../hooks/useOptionsFlow'
import { TrendingUp, TrendingDown, Activity, AlertTriangle, BarChart3 } from 'lucide-react'
import clsx from 'clsx'

// Stat Card Component
function StatCard({
  title,
  value,
  change,
  changeType,
  icon: Icon,
}: {
  title: string
  value: string | number
  change?: string
  changeType?: 'positive' | 'negative' | 'neutral'
  icon: React.ElementType
}) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
          {change && (
            <p
              className={clsx(
                'text-sm mt-1',
                changeType === 'positive' && 'text-green-400',
                changeType === 'negative' && 'text-red-400',
                changeType === 'neutral' && 'text-yellow-400'
              )}
            >
              {change}
            </p>
          )}
        </div>
        <div className="p-3 bg-gray-700/50 rounded-lg">
          <Icon className="h-6 w-6 text-primary-400" />
        </div>
      </div>
    </div>
  )
}

// Recent Flow Table
function RecentFlowTable() {
  const { data, isLoading } = useOptionsFlow({}, 1, 10)

  if (isLoading) {
    return (
      <div className="card p-4">
        <div className="animate-pulse space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-700 rounded" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-700">
        <h3 className="font-medium text-white">Recent Options Flow</h3>
      </div>
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Strike</th>
              <th>Type</th>
              <th className="text-right">LTP</th>
              <th className="text-right">Volume</th>
              <th className="text-right">OI</th>
            </tr>
          </thead>
          <tbody>
            {data?.items.map((flow) => (
              <tr key={flow.id}>
                <td className="font-medium text-white">{flow.symbol}</td>
                <td className="tabular-nums">{flow.strike_price}</td>
                <td>
                  <span
                    className={clsx(
                      'badge',
                      flow.option_type === 'CE' ? 'badge-bullish' : 'badge-bearish'
                    )}
                  >
                    {flow.option_type}
                  </span>
                </td>
                <td className="text-right tabular-nums">{flow.ltp?.toFixed(2)}</td>
                <td className="text-right tabular-nums">{flow.volume?.toLocaleString()}</td>
                <td className="text-right tabular-nums">{flow.oi?.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Unusual Activity List
function UnusualActivityList() {
  const { data, isLoading } = useUnusualActivity(undefined, undefined, 5)

  if (isLoading) {
    return (
      <div className="card p-4">
        <div className="animate-pulse space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-700 rounded" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
        <h3 className="font-medium text-white">Unusual Activity</h3>
        <span className="badge badge-unusual">
          <AlertTriangle size={12} className="mr-1" />
          {data?.length || 0} alerts
        </span>
      </div>
      <div className="divide-y divide-gray-700">
        {data?.length === 0 ? (
          <div className="p-4 text-center text-gray-400">
            No unusual activity detected
          </div>
        ) : (
          data?.map((activity) => (
            <div key={activity.id} className="p-4 hover:bg-gray-800/50 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">{activity.symbol}</span>
                    <span
                      className={clsx(
                        'badge',
                        activity.option_type === 'CE' ? 'badge-bullish' : 'badge-bearish'
                      )}
                    >
                      {activity.strike_price} {activity.option_type}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mt-1">{activity.activity_type}</p>
                </div>
                <div className="text-right">
                  <span
                    className={clsx(
                      'badge',
                      activity.severity === 'HIGH' && 'bg-red-900/50 text-red-400',
                      activity.severity === 'MEDIUM' && 'bg-yellow-900/50 text-yellow-400',
                      activity.severity === 'LOW' && 'bg-gray-700 text-gray-400'
                    )}
                  >
                    {activity.severity}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { selectedSymbol } = useAppStore()
  const { data: pcrData } = usePCR(selectedSymbol)

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400">Options flow overview for {selectedSymbol}</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="OI Put-Call Ratio"
          value={pcrData?.oi_pcr?.toFixed(2) || '—'}
          change={pcrData?.oi_pcr && pcrData.oi_pcr > 1 ? 'Bearish' : 'Bullish'}
          changeType={pcrData?.oi_pcr && pcrData.oi_pcr > 1 ? 'negative' : 'positive'}
          icon={BarChart3}
        />
        <StatCard
          title="Volume PCR"
          value={pcrData?.volume_pcr?.toFixed(2) || '—'}
          changeType="neutral"
          icon={Activity}
        />
        <StatCard
          title="CE Volume"
          value="—"
          icon={TrendingUp}
        />
        <StatCard
          title="PE Volume"
          value="—"
          icon={TrendingDown}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Flow - Takes 2 columns */}
        <div className="lg:col-span-2">
          <RecentFlowTable />
        </div>

        {/* Unusual Activity - Takes 1 column */}
        <div>
          <UnusualActivityList />
        </div>
      </div>
    </div>
  )
}
