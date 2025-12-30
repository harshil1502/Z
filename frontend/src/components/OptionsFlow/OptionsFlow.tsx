import { useState } from 'react'
import { useOptionsFlow, useUnusualActivity, useExpiries } from '../../hooks/useOptionsFlow'
import { useAppStore } from '../../store'
import { Filter, RefreshCw, Download, AlertTriangle } from 'lucide-react'
import clsx from 'clsx'
import type { FlowFilters } from '../../types'

function FlowFiltersPanel({
  filters,
  onChange,
  onReset,
}: {
  filters: FlowFilters
  onChange: (filters: Partial<FlowFilters>) => void
  onReset: () => void
}) {
  const { selectedSymbol } = useAppStore()
  const { data: expiries } = useExpiries(selectedSymbol)

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-white flex items-center gap-2">
          <Filter size={16} />
          Filters
        </h3>
        <button onClick={onReset} className="text-sm text-primary-400 hover:text-primary-300">
          Reset
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {/* Expiry */}
        <div>
          <label className="block text-sm text-gray-400 mb-1">Expiry</label>
          <select
            value={filters.expiry || ''}
            onChange={(e) => onChange({ expiry: e.target.value || undefined })}
            className="input w-full"
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
          <label className="block text-sm text-gray-400 mb-1">Type</label>
          <select
            value={filters.option_type || ''}
            onChange={(e) =>
              onChange({
                option_type: (e.target.value as 'CE' | 'PE') || undefined,
              })
            }
            className="input w-full"
          >
            <option value="">All</option>
            <option value="CE">Calls (CE)</option>
            <option value="PE">Puts (PE)</option>
          </select>
        </div>

        {/* Min Volume */}
        <div>
          <label className="block text-sm text-gray-400 mb-1">Min Volume</label>
          <input
            type="number"
            value={filters.min_volume || ''}
            onChange={(e) =>
              onChange({
                min_volume: e.target.value ? parseInt(e.target.value) : undefined,
              })
            }
            placeholder="0"
            className="input w-full"
          />
        </div>

        {/* Min OI */}
        <div>
          <label className="block text-sm text-gray-400 mb-1">Min OI</label>
          <input
            type="number"
            value={filters.min_oi || ''}
            onChange={(e) =>
              onChange({
                min_oi: e.target.value ? parseInt(e.target.value) : undefined,
              })
            }
            placeholder="0"
            className="input w-full"
          />
        </div>

        {/* Unusual Only */}
        <div className="flex items-end">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={filters.unusual_only || false}
              onChange={(e) => onChange({ unusual_only: e.target.checked })}
              className="rounded border-gray-600 bg-gray-700 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-gray-300">Unusual Only</span>
          </label>
        </div>
      </div>
    </div>
  )
}

function FlowTable() {
  const { flowFilters, selectedSymbol } = useAppStore()
  const [page, setPage] = useState(1)
  const pageSize = 50

  const { data, isLoading, isFetching, refetch } = useOptionsFlow(
    { ...flowFilters, symbol: selectedSymbol },
    page,
    pageSize
  )

  return (
    <div className="card overflow-hidden">
      {/* Table Header */}
      <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="font-medium text-white">Options Flow</h3>
          {data && (
            <span className="text-sm text-gray-400">
              {data.total.toLocaleString()} entries
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="btn btn-secondary flex items-center gap-2"
            disabled={isFetching}
          >
            <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button className="btn btn-secondary flex items-center gap-2">
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Symbol</th>
              <th>Strike</th>
              <th>Expiry</th>
              <th>Type</th>
              <th className="text-right">LTP</th>
              <th className="text-right">Volume</th>
              <th className="text-right">OI</th>
              <th className="text-right">OI Chg</th>
              <th className="text-right">IV</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(10)].map((_, i) => (
                <tr key={i}>
                  {[...Array(11)].map((_, j) => (
                    <td key={j}>
                      <div className="h-4 bg-gray-700 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data?.items.length === 0 ? (
              <tr>
                <td colSpan={11} className="text-center py-8 text-gray-400">
                  No data found
                </td>
              </tr>
            ) : (
              data?.items.map((flow) => (
                <tr key={flow.id} className={flow.is_unusual ? 'bg-yellow-900/10' : ''}>
                  <td className="text-gray-400 text-xs">
                    {new Date(flow.timestamp).toLocaleTimeString('en-IN')}
                  </td>
                  <td className="font-medium text-white">{flow.symbol}</td>
                  <td className="tabular-nums">{flow.strike_price}</td>
                  <td className="text-gray-400">
                    {new Date(flow.expiry_date).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </td>
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
                  <td
                    className={clsx(
                      'text-right tabular-nums',
                      (flow.oi_change || 0) > 0 && 'text-green-400',
                      (flow.oi_change || 0) < 0 && 'text-red-400'
                    )}
                  >
                    {(flow.oi_change || 0) > 0 ? '+' : ''}
                    {flow.oi_change?.toLocaleString()}
                  </td>
                  <td className="text-right tabular-nums">{flow.iv?.toFixed(1)}%</td>
                  <td>
                    {flow.is_unusual && (
                      <span className="badge badge-unusual flex items-center gap-1">
                        <AlertTriangle size={12} />
                        {flow.unusual_flags?.severity}
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && data.total > pageSize && (
        <div className="px-4 py-3 border-t border-gray-700 flex items-center justify-between">
          <div className="text-sm text-gray-400">
            Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, data.total)} of{' '}
            {data.total}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              className="btn btn-secondary"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(page + 1)}
              disabled={!data.has_more}
              className="btn btn-secondary"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function OptionsFlow() {
  const { flowFilters, setFlowFilters, resetFlowFilters, selectedSymbol } = useAppStore()

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Options Flow</h1>
        <p className="text-gray-400">Real-time options flow for {selectedSymbol}</p>
      </div>

      {/* Filters */}
      <FlowFiltersPanel
        filters={flowFilters}
        onChange={setFlowFilters}
        onReset={resetFlowFilters}
      />

      {/* Flow Table */}
      <FlowTable />
    </div>
  )
}
