import { useAppStore } from '../../store'
import { useGammaExposure, usePCR, useFIIDII } from '../../hooks/useOptionsFlow'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

function GammaExposureChart() {
  const { selectedSymbol } = useAppStore()
  const { data, isLoading } = useGammaExposure(selectedSymbol)

  if (isLoading) {
    return (
      <div className="card p-4 h-80">
        <div className="animate-pulse h-full bg-gray-700 rounded" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="card p-4 h-80 flex items-center justify-center text-gray-400">
        No gamma exposure data available
      </div>
    )
  }

  const chartData = data.levels.map((level) => ({
    strike: level.strike_price,
    callGex: level.call_gex / 1000000, // Convert to millions
    putGex: level.put_gex / 1000000,
    totalGex: level.total_gex / 1000000,
  }))

  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-700">
        <h3 className="font-medium text-white">Gamma Exposure (GEX)</h3>
        <p className="text-sm text-gray-400">
          {selectedSymbol} • Spot: ₹{data.underlying_price?.toLocaleString()}
        </p>
      </div>
      <div className="p-4 h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <XAxis
              dataKey="strike"
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              axisLine={{ stroke: '#374151' }}
            />
            <YAxis
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              axisLine={{ stroke: '#374151' }}
              tickFormatter={(value) => `${value}M`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '8px',
              }}
              labelStyle={{ color: '#f9fafb' }}
            />
            <ReferenceLine y={0} stroke="#6b7280" />
            {data.underlying_price && (
              <ReferenceLine
                x={data.underlying_price}
                stroke="#8b5cf6"
                strokeDasharray="3 3"
                label={{ value: 'Spot', position: 'top', fill: '#8b5cf6' }}
              />
            )}
            <Bar dataKey="callGex" name="Call GEX" fill="#22c55e" />
            <Bar dataKey="putGex" name="Put GEX" fill="#ef4444" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="px-4 py-3 border-t border-gray-700 flex items-center justify-between text-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-green-500 rounded" />
            <span className="text-gray-400">Call GEX</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-red-500 rounded" />
            <span className="text-gray-400">Put GEX</span>
          </div>
        </div>
        <div className="text-gray-400">
          Total GEX: <span className="text-white font-medium">{(data.total_gex / 1000000).toFixed(2)}M</span>
        </div>
      </div>
    </div>
  )
}

function PCRCard() {
  const { selectedSymbol } = useAppStore()
  const { data, isLoading } = usePCR(selectedSymbol)

  if (isLoading) {
    return (
      <div className="card p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-8 bg-gray-700 rounded w-1/2" />
          <div className="h-24 bg-gray-700 rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className="card p-4">
      <h3 className="font-medium text-white mb-4">Put-Call Ratio</h3>

      <div className="space-y-4">
        {/* OI PCR */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400">OI PCR</span>
            <span className="text-xl font-bold text-white">
              {data?.oi_pcr?.toFixed(2) || '—'}
            </span>
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                (data?.oi_pcr || 0) > 1 ? 'bg-red-500' : 'bg-green-500'
              }`}
              style={{
                width: `${Math.min((data?.oi_pcr || 0) * 50, 100)}%`,
              }}
            />
          </div>
        </div>

        {/* Volume PCR */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400">Volume PCR</span>
            <span className="text-xl font-bold text-white">
              {data?.volume_pcr?.toFixed(2) || '—'}
            </span>
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                (data?.volume_pcr || 0) > 1 ? 'bg-red-500' : 'bg-green-500'
              }`}
              style={{
                width: `${Math.min((data?.volume_pcr || 0) * 50, 100)}%`,
              }}
            />
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-700 text-sm text-gray-400">
        <p>
          PCR {'>'} 1 = Bearish sentiment<br />
          PCR {'<'} 1 = Bullish sentiment
        </p>
      </div>
    </div>
  )
}

function FIIDIICard() {
  const { data, isLoading } = useFIIDII()

  if (isLoading) {
    return (
      <div className="card p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-8 bg-gray-700 rounded w-1/2" />
          <div className="h-32 bg-gray-700 rounded" />
        </div>
      </div>
    )
  }

  // Get today's data
  const todayFII = data?.find((d) => d.category === 'FII' && d.segment === 'CASH')
  const todayDII = data?.find((d) => d.category === 'DII' && d.segment === 'CASH')

  return (
    <div className="card p-4">
      <h3 className="font-medium text-white mb-4">FII/DII Activity</h3>

      <div className="space-y-4">
        {/* FII */}
        <div className="p-3 bg-gray-700/50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400">FII (Cash)</span>
            <span
              className={`text-lg font-bold ${
                (todayFII?.net_value || 0) >= 0 ? 'text-green-400' : 'text-red-400'
              }`}
            >
              {todayFII?.net_value
                ? `₹${(todayFII.net_value / 100).toFixed(0)} Cr`
                : '—'}
            </span>
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>Buy: ₹{((todayFII?.buy_value || 0) / 100).toFixed(0)} Cr</span>
            <span>Sell: ₹{((todayFII?.sell_value || 0) / 100).toFixed(0)} Cr</span>
          </div>
        </div>

        {/* DII */}
        <div className="p-3 bg-gray-700/50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400">DII (Cash)</span>
            <span
              className={`text-lg font-bold ${
                (todayDII?.net_value || 0) >= 0 ? 'text-green-400' : 'text-red-400'
              }`}
            >
              {todayDII?.net_value
                ? `₹${(todayDII.net_value / 100).toFixed(0)} Cr`
                : '—'}
            </span>
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>Buy: ₹{((todayDII?.buy_value || 0) / 100).toFixed(0)} Cr</span>
            <span>Sell: ₹{((todayDII?.sell_value || 0) / 100).toFixed(0)} Cr</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Analytics() {
  const { selectedSymbol } = useAppStore()

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <p className="text-gray-400">Advanced analytics for {selectedSymbol}</p>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* GEX Chart - Takes 2 columns */}
        <div className="lg:col-span-2">
          <GammaExposureChart />
        </div>

        {/* Sidebar cards */}
        <div className="space-y-6">
          <PCRCard />
          <FIIDIICard />
        </div>
      </div>
    </div>
  )
}
