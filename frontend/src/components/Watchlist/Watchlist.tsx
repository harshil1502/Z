/**
 * Watchlist component for tracking favorite symbols.
 */

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '../../services/api'
import clsx from 'clsx'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Skeleton } from '../ui/Skeleton'
import { EmptyState } from '../ui/EmptyState'
import { Sparkline } from '../ui/Charts'
import {
  Star,
  Plus,
  Search,
  TrendingUp,
  TrendingDown,
  X,
  MoreVertical,
  Bell,
  ExternalLink,
  Trash2,
  GripVertical,
  Eye,
  Filter,
  SortAsc,
  SortDesc
} from 'lucide-react'

interface WatchlistItem {
  id: number
  symbol: string
  name: string
  ltp: number
  change: number
  changePercent: number
  volume: number
  high: number
  low: number
  open: number
  prevClose: number
  sparklineData: number[]
  hasAlert: boolean
}

interface WatchlistGroup {
  id: number
  name: string
  items: WatchlistItem[]
}

// Add symbol modal
function AddSymbolModal({
  isOpen,
  onClose,
  onAdd
}: {
  isOpen: boolean
  onClose: () => void
  onAdd: (symbol: string) => void
}) {
  const [search, setSearch] = useState('')
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null)

  // Mock search results - would come from API
  const searchResults = useMemo(() => {
    if (!search || search.length < 2) return []
    const allSymbols = [
      { symbol: 'NIFTY', name: 'NIFTY 50 Index' },
      { symbol: 'BANKNIFTY', name: 'Bank Nifty Index' },
      { symbol: 'RELIANCE', name: 'Reliance Industries Ltd' },
      { symbol: 'TCS', name: 'Tata Consultancy Services' },
      { symbol: 'INFY', name: 'Infosys Limited' },
      { symbol: 'HDFCBANK', name: 'HDFC Bank Limited' },
      { symbol: 'ICICIBANK', name: 'ICICI Bank Limited' },
      { symbol: 'SBIN', name: 'State Bank of India' },
      { symbol: 'TATAMOTORS', name: 'Tata Motors Limited' },
      { symbol: 'BHARTIARTL', name: 'Bharti Airtel Limited' }
    ]
    return allSymbols.filter(
      s => s.symbol.toLowerCase().includes(search.toLowerCase()) ||
           s.name.toLowerCase().includes(search.toLowerCase())
    )
  }, [search])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-gray-900 rounded-xl shadow-2xl w-full max-w-md mx-4 border border-gray-800">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <h3 className="text-lg font-semibold text-white">Add to Watchlist</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="p-4">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search symbols..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              autoFocus
            />
          </div>
        </div>

        {/* Results */}
        <div className="max-h-64 overflow-y-auto px-4 pb-4">
          {searchResults.length > 0 ? (
            <div className="space-y-1">
              {searchResults.map((result) => (
                <button
                  key={result.symbol}
                  onClick={() => setSelectedSymbol(result.symbol)}
                  className={clsx(
                    'w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors',
                    selectedSymbol === result.symbol
                      ? 'bg-primary-600 text-white'
                      : 'hover:bg-gray-800 text-gray-300'
                  )}
                >
                  <div className="text-left">
                    <p className="font-medium">{result.symbol}</p>
                    <p className="text-sm opacity-70">{result.name}</p>
                  </div>
                  {selectedSymbol === result.symbol && (
                    <Star size={16} className="fill-current" />
                  )}
                </button>
              ))}
            </div>
          ) : search.length >= 2 ? (
            <p className="text-center text-gray-500 py-4">No symbols found</p>
          ) : (
            <p className="text-center text-gray-500 py-4">Type to search symbols</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-800">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => {
              if (selectedSymbol) {
                onAdd(selectedSymbol)
                onClose()
              }
            }}
            disabled={!selectedSymbol}
          >
            <Plus size={16} />
            Add Symbol
          </Button>
        </div>
      </div>
    </div>
  )
}

// Individual watchlist item card
function WatchlistItemCard({
  item,
  onRemove,
  onSetAlert
}: {
  item: WatchlistItem
  onRemove: () => void
  onSetAlert: () => void
}) {
  const [showMenu, setShowMenu] = useState(false)
  const isPositive = item.change >= 0

  return (
    <Card className="group relative overflow-hidden hover:border-gray-600 transition-colors">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <Link
              to={`/options/${item.symbol}`}
              className="font-semibold text-white hover:text-primary-400 transition-colors"
            >
              {item.symbol}
            </Link>
            <p className="text-xs text-gray-500 truncate max-w-[120px]">{item.name}</p>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreVertical size={16} />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-8 z-20 bg-gray-800 rounded-lg shadow-xl border border-gray-700 py-1 min-w-[140px]">
                  <Link
                    to={`/options/${item.symbol}`}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700"
                  >
                    <ExternalLink size={14} />
                    View Chain
                  </Link>
                  <button
                    onClick={() => { onSetAlert(); setShowMenu(false) }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700"
                  >
                    <Bell size={14} />
                    Set Alert
                  </button>
                  <hr className="my-1 border-gray-700" />
                  <button
                    onClick={() => { onRemove(); setShowMenu(false) }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-gray-700"
                  >
                    <Trash2 size={14} />
                    Remove
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Price */}
        <div className="flex items-end justify-between mb-3">
          <div>
            <p className="text-2xl font-bold text-white tabular-nums">
              ₹{item.ltp.toLocaleString()}
            </p>
            <div className={clsx(
              'flex items-center gap-1 text-sm',
              isPositive ? 'text-green-400' : 'text-red-400'
            )}>
              {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              <span className="tabular-nums">
                {isPositive ? '+' : ''}{item.change.toFixed(2)} ({item.changePercent.toFixed(2)}%)
              </span>
            </div>
          </div>
          <Sparkline
            data={item.sparklineData}
            width={60}
            height={28}
            color={isPositive ? '#22c55e' : '#ef4444'}
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div>
            <p className="text-gray-500">Volume</p>
            <p className="text-gray-300 tabular-nums">{(item.volume / 100000).toFixed(1)}L</p>
          </div>
          <div>
            <p className="text-gray-500">High</p>
            <p className="text-gray-300 tabular-nums">₹{item.high.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-gray-500">Low</p>
            <p className="text-gray-300 tabular-nums">₹{item.low.toLocaleString()}</p>
          </div>
        </div>

        {/* Alert indicator */}
        {item.hasAlert && (
          <div className="absolute top-2 right-2">
            <Bell size={12} className="text-yellow-400 fill-yellow-400" />
          </div>
        )}
      </div>
    </Card>
  )
}

// Empty watchlist state
function EmptyWatchlist({ onAdd }: { onAdd: () => void }) {
  return (
    <Card className="p-8 text-center">
      <div className="inline-flex p-4 rounded-full bg-gray-800 mb-4">
        <Star size={32} className="text-gray-500" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">Your watchlist is empty</h3>
      <p className="text-gray-400 mb-6 max-w-sm mx-auto">
        Add symbols to track their performance and get quick access to options chains.
      </p>
      <Button onClick={onAdd}>
        <Plus size={16} />
        Add Your First Symbol
      </Button>
    </Card>
  )
}

export default function Watchlist() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortBy, setSortBy] = useState<'symbol' | 'change' | 'volume'>('symbol')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const queryClient = useQueryClient()

  // Fetch watchlist
  const { data: watchlist, isLoading } = useQuery({
    queryKey: ['watchlist'],
    queryFn: () => api.getWatchlist(),
    staleTime: 30 * 1000 // 30 seconds
  })

  // Add to watchlist
  const addMutation = useMutation({
    mutationFn: (symbol: string) => api.addToWatchlist(symbol),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] })
    }
  })

  // Remove from watchlist
  const removeMutation = useMutation({
    mutationFn: (id: number) => api.removeFromWatchlist(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] })
    }
  })

  // Sort items
  const sortedItems = useMemo(() => {
    if (!watchlist?.items) return []
    return [...watchlist.items].sort((a, b) => {
      let comparison = 0
      switch (sortBy) {
        case 'symbol':
          comparison = a.symbol.localeCompare(b.symbol)
          break
        case 'change':
          comparison = a.changePercent - b.changePercent
          break
        case 'volume':
          comparison = a.volume - b.volume
          break
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })
  }, [watchlist?.items, sortBy, sortOrder])

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('asc')
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">Watchlist</h1>
            {watchlist?.items && (
              <Badge variant="neutral">{watchlist.items.length} symbols</Badge>
            )}
          </div>
          <p className="text-gray-400 mt-1">
            Track your favorite symbols and access their options chains
          </p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)}>
          <Plus size={16} />
          Add Symbol
        </Button>
      </div>

      {/* Controls */}
      {watchlist?.items && watchlist.items.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleSort('symbol')}
              className={clsx(
                'flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors',
                sortBy === 'symbol' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
              )}
            >
              Symbol
              {sortBy === 'symbol' && (sortOrder === 'asc' ? <SortAsc size={14} /> : <SortDesc size={14} />)}
            </button>
            <button
              onClick={() => toggleSort('change')}
              className={clsx(
                'flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors',
                sortBy === 'change' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
              )}
            >
              Change
              {sortBy === 'change' && (sortOrder === 'asc' ? <SortAsc size={14} /> : <SortDesc size={14} />)}
            </button>
            <button
              onClick={() => toggleSort('volume')}
              className={clsx(
                'flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors',
                sortBy === 'volume' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
              )}
            >
              Volume
              {sortBy === 'volume' && (sortOrder === 'asc' ? <SortAsc size={14} /> : <SortDesc size={14} />)}
            </button>
          </div>
          <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={clsx(
                'p-1.5 rounded',
                viewMode === 'grid' ? 'bg-gray-700 text-white' : 'text-gray-400'
              )}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <rect x="1" y="1" width="6" height="6" rx="1" />
                <rect x="9" y="1" width="6" height="6" rx="1" />
                <rect x="1" y="9" width="6" height="6" rx="1" />
                <rect x="9" y="9" width="6" height="6" rx="1" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={clsx(
                'p-1.5 rounded',
                viewMode === 'list' ? 'bg-gray-700 text-white' : 'text-gray-400'
              )}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <rect x="1" y="2" width="14" height="3" rx="1" />
                <rect x="1" y="7" width="14" height="3" rx="1" />
                <rect x="1" y="12" width="14" height="3" rx="1" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : !watchlist?.items || watchlist.items.length === 0 ? (
        <EmptyWatchlist onAdd={() => setIsAddModalOpen(true)} />
      ) : (
        <div className={clsx(
          viewMode === 'grid'
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
            : 'space-y-2'
        )}>
          {sortedItems.map((item) => (
            <WatchlistItemCard
              key={item.id}
              item={item}
              onRemove={() => removeMutation.mutate(item.id)}
              onSetAlert={() => {
                // Navigate to alerts with symbol pre-filled
              }}
            />
          ))}
        </div>
      )}

      {/* Add Symbol Modal */}
      <AddSymbolModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={(symbol) => addMutation.mutate(symbol)}
      />
    </div>
  )
}
