/**
 * Reusable Badge component for status indicators.
 */

import { ReactNode } from 'react'
import clsx from 'clsx'

interface BadgeProps {
  children: ReactNode
  variant?: 'default' | 'bullish' | 'bearish' | 'warning' | 'info' | 'success' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  pulse?: boolean
  icon?: ReactNode
  className?: string
}

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  pulse = false,
  icon,
  className,
}: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center font-medium rounded-full',
        // Variants
        variant === 'default' && 'bg-gray-700 text-gray-300',
        variant === 'bullish' && 'bg-green-900/50 text-green-400 border border-green-800/50',
        variant === 'bearish' && 'bg-red-900/50 text-red-400 border border-red-800/50',
        variant === 'warning' && 'bg-yellow-900/50 text-yellow-400 border border-yellow-800/50',
        variant === 'info' && 'bg-blue-900/50 text-blue-400 border border-blue-800/50',
        variant === 'success' && 'bg-emerald-900/50 text-emerald-400 border border-emerald-800/50',
        variant === 'danger' && 'bg-rose-900/50 text-rose-400 border border-rose-800/50',
        // Sizes
        size === 'sm' && 'px-2 py-0.5 text-xs gap-1',
        size === 'md' && 'px-2.5 py-1 text-xs gap-1.5',
        size === 'lg' && 'px-3 py-1.5 text-sm gap-2',
        className
      )}
    >
      {pulse && (
        <span className="relative flex h-2 w-2">
          <span
            className={clsx(
              'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
              variant === 'bullish' && 'bg-green-400',
              variant === 'bearish' && 'bg-red-400',
              variant === 'warning' && 'bg-yellow-400',
              variant === 'info' && 'bg-blue-400',
              variant === 'success' && 'bg-emerald-400',
              variant === 'danger' && 'bg-rose-400',
              variant === 'default' && 'bg-gray-400'
            )}
          />
          <span
            className={clsx(
              'relative inline-flex rounded-full h-2 w-2',
              variant === 'bullish' && 'bg-green-400',
              variant === 'bearish' && 'bg-red-400',
              variant === 'warning' && 'bg-yellow-400',
              variant === 'info' && 'bg-blue-400',
              variant === 'success' && 'bg-emerald-400',
              variant === 'danger' && 'bg-rose-400',
              variant === 'default' && 'bg-gray-400'
            )}
          />
        </span>
      )}
      {icon}
      {children}
    </span>
  )
}

interface StatusDotProps {
  status: 'online' | 'offline' | 'warning' | 'busy'
  size?: 'sm' | 'md' | 'lg'
  pulse?: boolean
}

export function StatusDot({ status, size = 'md', pulse = false }: StatusDotProps) {
  return (
    <span className="relative flex">
      {pulse && (
        <span
          className={clsx(
            'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
            status === 'online' && 'bg-green-400',
            status === 'offline' && 'bg-gray-400',
            status === 'warning' && 'bg-yellow-400',
            status === 'busy' && 'bg-red-400'
          )}
        />
      )}
      <span
        className={clsx(
          'relative inline-flex rounded-full',
          status === 'online' && 'bg-green-400',
          status === 'offline' && 'bg-gray-400',
          status === 'warning' && 'bg-yellow-400',
          status === 'busy' && 'bg-red-400',
          size === 'sm' && 'h-1.5 w-1.5',
          size === 'md' && 'h-2 w-2',
          size === 'lg' && 'h-3 w-3'
        )}
      />
    </span>
  )
}

export default Badge
