import { useParams } from 'react-router-dom'
import { useOptionsChain, useExpiries } from '../../hooks/useOptionsFlow'
import { useState } from 'react'
import clsx from 'clsx'

export default function OptionsChain() {
  const { symbol } = useParams<{ symbol: string }>()
  const [selectedExpiry, setSelectedExpiry] = useState<string | undefined>()

  const { data: expiries } = useExpiries(symbol || '')
  const { data, isLoading } = useOptionsChain(symbol || '', selectedExpiry)

  if (!symbol) {
    return <div className="text-center text-gray-400 py-8">No symbol selected</div>
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-700 rounded w-1/4 mb-4" />
          <div className="h-96 bg-gray-700 rounded" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{symbol} Options Chain</h1>
          <p className="text-gray-400">
            Spot: ₹{data?.underlying_price?.toLocaleString()} • PCR: {data?.pcr?.toFixed(2)}
          </p>
        </div>

        {/* Expiry Selector */}
        <div className="flex items-center gap-2">
          {expiries?.slice(0, 5).map((exp) => (
            <button
              key={exp}
              onClick={() => setSelectedExpiry(exp)}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                (selectedExpiry || expiries[0]) === exp
                  ? 'bg-primary-600 text-white'
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

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <p className="text-sm text-gray-400">Total CE OI</p>
          <p className="text-xl font-bold text-green-400">
            {data?.total_ce_oi?.toLocaleString()}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-400">Total PE OI</p>
          <p className="text-xl font-bold text-red-400">
            {data?.total_pe_oi?.toLocaleString()}
          </p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-400">PCR (OI)</p>
          <p className="text-xl font-bold text-white">{data?.pcr?.toFixed(2)}</p>
        </div>
        <div className="card p-4">
          <p className="text-sm text-gray-400">Max Pain</p>
          <p className="text-xl font-bold text-yellow-400">
            ₹{data?.max_pain?.toLocaleString() || '—'}
          </p>
        </div>
      </div>

      {/* Options Chain Table */}
      <div className="card overflow-hidden">
        <div className="table-container">
          <table className="table text-xs">
            <thead>
              <tr>
                {/* Call side */}
                <th className="text-right bg-green-900/20">OI Chg</th>
                <th className="text-right bg-green-900/20">OI</th>
                <th className="text-right bg-green-900/20">Volume</th>
                <th className="text-right bg-green-900/20">IV</th>
                <th className="text-right bg-green-900/20">LTP</th>
                {/* Strike */}
                <th className="text-center bg-gray-700">Strike</th>
                {/* Put side */}
                <th className="text-left bg-red-900/20">LTP</th>
                <th className="text-left bg-red-900/20">IV</th>
                <th className="text-left bg-red-900/20">Volume</th>
                <th className="text-left bg-red-900/20">OI</th>
                <th className="text-left bg-red-900/20">OI Chg</th>
              </tr>
            </thead>
            <tbody>
              {data?.strikes.map((strike) => {
                const isITMCall =
                  data.underlying_price && strike.strike_price < data.underlying_price
                const isITMPut =
                  data.underlying_price && strike.strike_price > data.underlying_price
                const isATM =
                  data.underlying_price &&
                  Math.abs(strike.strike_price - data.underlying_price) < 50

                return (
                  <tr
                    key={strike.strike_price}
                    className={clsx(isATM && 'bg-primary-900/20 border-y border-primary-700')}
                  >
                    {/* Call side */}
                    <td
                      className={clsx(
                        'text-right tabular-nums',
                        isITMCall && 'bg-green-900/10',
                        (strike.ce_oi_change || 0) > 0 && 'text-green-400',
                        (strike.ce_oi_change || 0) < 0 && 'text-red-400'
                      )}
                    >
                      {strike.ce_oi_change?.toLocaleString()}
                    </td>
                    <td
                      className={clsx(
                        'text-right tabular-nums',
                        isITMCall && 'bg-green-900/10'
                      )}
                    >
                      {strike.ce_oi?.toLocaleString()}
                    </td>
                    <td
                      className={clsx(
                        'text-right tabular-nums',
                        isITMCall && 'bg-green-900/10'
                      )}
                    >
                      {strike.ce_volume?.toLocaleString()}
                    </td>
                    <td
                      className={clsx(
                        'text-right tabular-nums',
                        isITMCall && 'bg-green-900/10'
                      )}
                    >
                      {strike.ce_iv?.toFixed(1)}%
                    </td>
                    <td
                      className={clsx(
                        'text-right tabular-nums font-medium',
                        isITMCall && 'bg-green-900/10 text-green-400'
                      )}
                    >
                      {strike.ce_ltp?.toFixed(2)}
                    </td>

                    {/* Strike */}
                    <td
                      className={clsx(
                        'text-center font-bold',
                        isATM ? 'text-primary-400' : 'text-white'
                      )}
                    >
                      {strike.strike_price}
                    </td>

                    {/* Put side */}
                    <td
                      className={clsx(
                        'text-left tabular-nums font-medium',
                        isITMPut && 'bg-red-900/10 text-red-400'
                      )}
                    >
                      {strike.pe_ltp?.toFixed(2)}
                    </td>
                    <td
                      className={clsx(
                        'text-left tabular-nums',
                        isITMPut && 'bg-red-900/10'
                      )}
                    >
                      {strike.pe_iv?.toFixed(1)}%
                    </td>
                    <td
                      className={clsx(
                        'text-left tabular-nums',
                        isITMPut && 'bg-red-900/10'
                      )}
                    >
                      {strike.pe_volume?.toLocaleString()}
                    </td>
                    <td
                      className={clsx(
                        'text-left tabular-nums',
                        isITMPut && 'bg-red-900/10'
                      )}
                    >
                      {strike.pe_oi?.toLocaleString()}
                    </td>
                    <td
                      className={clsx(
                        'text-left tabular-nums',
                        isITMPut && 'bg-red-900/10',
                        (strike.pe_oi_change || 0) > 0 && 'text-green-400',
                        (strike.pe_oi_change || 0) < 0 && 'text-red-400'
                      )}
                    >
                      {strike.pe_oi_change?.toLocaleString()}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
