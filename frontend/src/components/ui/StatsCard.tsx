/**
 * Stats Card component for displaying metrics.
 */

import { ReactNode } from 'react'
import clsx from 'clsx'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface StatsCardProps {
  title: string
  value: string | number
  change?: number
  changeLabel?: string
  trend?: 'up' | 'down' | 'neutral'
  icon?: ReactNode
  description?: string
  className?: string
  variant?: 'default' | 'gradient' | 'bordered'
  size?: 'sm' | 'md' | 'lg'
}

export function StatsCard({
  title,
  value,
  change,
  changeLabel,
  trend,
  icon,
  description,
  className,
  variant = 'default',
  size = 'md',
}: StatsCardProps) {
  const getTrendColor = () => {
    if (!trend) return 'text-gray-400'
    if (trend === 'up') return 'text-green-400'
    if (trend === 'down') return 'text-red-400'
    return 'text-yellow-400'
  }

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus

  return (
    <div
      className={clsx(
        'rounded-xl transition-all duration-200 hover:shadow-lg',
        variant === 'default' && 'bg-gray-800 border border-gray-700',
        variant === 'gradient' && 'bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700',
        variant === 'bordered' && 'bg-transparent border-2 border-gray-600',
        size === 'sm' && 'p-3',
        size === 'md' && 'p-4',
        size === 'lg' && 'p-6',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p
            className={clsx(
              'font-medium text-gray-400',
              size === 'sm' && 'text-xs',
              size === 'md' && 'text-sm',
              size === 'lg' && 'text-base'
            )}
          >
            {title}
          </p>
          <p
            className={clsx(
              'font-bold text-white tabular-nums mt-1',
              size === 'sm' && 'text-xl',
              size === 'md' && 'text-2xl',
              size === 'lg' && 'text-4xl'
            )}
          >
            {value}
          </p>
          {(change !== undefined || changeLabel) && (
            <div className={clsx('flex items-center gap-1 mt-2', getTrendColor())}>
              {trend && <TrendIcon size={size === 'sm' ? 12 : 14} />}
              <span className={clsx(size === 'sm' ? 'text-xs' : 'text-sm')}>
                {change !== undefined && (
                  <span className="font-medium">
                    {change > 0 ? '+' : ''}
                    {change}%
                  </span>
                )}
                {changeLabel && <span className="ml-1 text-gray-500">{changeLabel}</span>}
              </span>
            </div>
          )}
          {description && (
            <p className={clsx('text-gray-500 mt-2', size === 'sm' ? 'text-xs' : 'text-sm')}>
              {description}
            </p>
          )}
        </div>
        {icon && (
          <div
            className={clsx(
              'rounded-lg bg-gray-700/50 flex items-center justify-center',
              size === 'sm' && 'p-2',
              size === 'md' && 'p-3',
              size === 'lg' && 'p-4'
            )}
          >
            <div className="text-primary-400">{icon}</div>
          </div>
        )}
      </div>
    </div>
  )
}

interface MiniStatsProps {
  label: string
  value: string | number
  trend?: 'up' | 'down' | 'neutral'
  className?: string
}

export function MiniStats({ label, value, trend, className }: MiniStatsProps) {
  return (
    <div className={clsx('flex items-center justify-between', className)}>
      <span className="text-sm text-gray-400">{label}</span>
      <span
        className={clsx(
          'text-sm font-medium tabular-nums',
          trend === 'up' && 'text-green-400',
          trend === 'down' && 'text-red-400',
          !trend && 'text-white'
        )}
      >
        {value}
      </span>
    </div>
  )
}

interface StatGroupProps {
  children: ReactNode
  columns?: 2 | 3 | 4
  className?: string
}

export function StatGroup({ children, columns = 4, className }: StatGroupProps) {
  return (
    <div
      className={clsx(
        'grid gap-4',
        columns === 2 && 'grid-cols-1 sm:grid-cols-2',
        columns === 3 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
        columns === 4 && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
        className
      )}
    >
      {children}
    </div>
  )
}

export default StatsCard
