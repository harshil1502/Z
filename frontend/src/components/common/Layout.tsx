import { Outlet, Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Activity,
  BarChart3,
  Bell,
  Settings,
  Menu,
  X,
  TrendingUp,
  ChevronDown,
  Building2,
  Star
} from 'lucide-react'
import { useAppStore } from '../../store'
import { MarketStatusBadge, ConnectionStatus, IndicesBar, MarketStatusCard } from './MarketStatus'
import clsx from 'clsx'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Options Flow', href: '/flow', icon: Activity },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'FII/DII Flow', href: '/fiidii', icon: Building2 },
  { name: 'Watchlist', href: '/watchlist', icon: Star },
  { name: 'Alerts', href: '/alerts', icon: Bell },
  { name: 'Settings', href: '/settings', icon: Settings },
]

// Mobile navigation items (bottom bar)
const mobileNavigation = [
  { name: 'Home', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Flow', href: '/flow', icon: Activity },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Watchlist', href: '/watchlist', icon: Star },
  { name: 'More', href: '#', icon: Menu },
]

export default function Layout() {
  const location = useLocation()
  const { isSidebarOpen, toggleSidebar, selectedSymbol, setSelectedSymbol, isLiveUpdates, toggleLiveUpdates } = useAppStore()

  const symbols = ['NIFTY', 'BANKNIFTY', 'FINNIFTY', 'RELIANCE', 'TCS']

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Top Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-gray-800/95 backdrop-blur border-b border-gray-700">
        <div className="flex items-center justify-between px-4 h-14">
          {/* Left section */}
          <div className="flex items-center gap-4">
            <button
              onClick={toggleSidebar}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg hidden lg:flex"
            >
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            <Link to="/" className="flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-primary-500" />
              <span className="font-bold text-lg text-white">Z</span>
              <span className="text-gray-400 text-sm hidden sm:block">Financial Intel</span>
            </Link>
          </div>

          {/* Center section - Symbol selector */}
          <div className="hidden md:flex items-center gap-2">
            {symbols.map((symbol) => (
              <button
                key={symbol}
                onClick={() => setSelectedSymbol(symbol)}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  selectedSymbol === symbol
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                )}
              >
                {symbol}
              </button>
            ))}
          </div>

          {/* Mobile symbol selector dropdown */}
          <div className="md:hidden">
            <select
              value={selectedSymbol}
              onChange={(e) => setSelectedSymbol(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white focus:ring-2 focus:ring-primary-500"
            >
              {symbols.map((symbol) => (
                <option key={symbol} value={symbol}>{symbol}</option>
              ))}
            </select>
          </div>

          {/* Right section */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Market Status Badge - hidden on small screens */}
            <div className="hidden sm:block">
              <MarketStatusBadge />
            </div>

            {/* Live connection indicator */}
            <ConnectionStatus />

            {/* Alerts */}
            <Link
              to="/alerts"
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg relative"
            >
              <Bell size={20} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </Link>

            {/* Settings - hidden on mobile (available in more menu) */}
            <Link
              to="/settings"
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg hidden sm:flex"
            >
              <Settings size={20} />
            </Link>
          </div>
        </div>

        {/* Indices Bar - scrollable on mobile */}
        <div className="px-4 border-t border-gray-700 bg-gray-800/50 overflow-x-auto scrollbar-hide">
          <IndicesBar />
        </div>
      </header>

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed left-0 top-24 bottom-0 z-40 w-64 bg-gray-800 border-r border-gray-700 transition-transform duration-300',
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <nav className="p-4 space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href
            return (
              <Link
                key={item.name}
                to={item.href}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary-600/20 text-primary-400'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                )}
              >
                <item.icon size={18} />
                {item.name}
              </Link>
            )
          })}
        </nav>

        {/* Market Status Card */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-700">
          <MarketStatusCard />
        </div>
      </aside>

      {/* Sidebar overlay for mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Main content */}
      <main
        className={clsx(
          'pt-24 min-h-screen transition-all duration-300 pb-20 lg:pb-0',
          isSidebarOpen ? 'lg:ml-64' : 'ml-0'
        )}
      >
        <div className="p-4 sm:p-6">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="mobile-nav lg:hidden">
        {mobileNavigation.map((item) => {
          const isActive = location.pathname === item.href ||
            (item.href === '/dashboard' && location.pathname === '/')
          const isMore = item.name === 'More'

          if (isMore) {
            return (
              <button
                key={item.name}
                onClick={toggleSidebar}
                className={clsx('mobile-nav-item', isSidebarOpen && 'active')}
              >
                <item.icon size={20} />
                <span>{item.name}</span>
              </button>
            )
          }

          return (
            <Link
              key={item.name}
              to={item.href}
              className={clsx('mobile-nav-item', isActive && 'active')}
            >
              <item.icon size={20} />
              <span>{item.name}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
