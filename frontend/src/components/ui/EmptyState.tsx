/**
 * Empty state component for when there's no data.
 */

import { ReactNode } from 'react'
import clsx from 'clsx'
import { Inbox, Search, Filter, AlertCircle, TrendingUp } from 'lucide-react'
import { Button } from './Button'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  variant?: 'default' | 'compact'
  className?: string
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  variant = 'default',
  className,
}: EmptyStateProps) {
  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center text-center',
        variant === 'default' && 'py-12 px-6',
        variant === 'compact' && 'py-6 px-4',
        className
      )}
    >
      {icon && (
        <div
          className={clsx(
            'rounded-full bg-gray-700/50 mb-4 flex items-center justify-center',
            variant === 'default' && 'p-4',
            variant === 'compact' && 'p-3'
          )}
        >
          <div className="text-gray-400">{icon}</div>
        </div>
      )}
      <h3
        className={clsx(
          'font-semibold text-gray-200',
          variant === 'default' && 'text-lg',
          variant === 'compact' && 'text-base'
        )}
      >
        {title}
      </h3>
      {description && (
        <p
          className={clsx(
            'text-gray-400 mt-1 max-w-sm',
            variant === 'default' && 'text-sm',
            variant === 'compact' && 'text-xs'
          )}
        >
          {description}
        </p>
      )}
      {action && (
        <Button
          variant="secondary"
          size={variant === 'compact' ? 'sm' : 'md'}
          onClick={action.onClick}
          className="mt-4"
        >
          {action.label}
        </Button>
      )}
    </div>
  )
}

// Pre-built empty states
export function NoDataEmptyState({ onRefresh }: { onRefresh?: () => void }) {
  return (
    <EmptyState
      icon={<Inbox size={24} />}
      title="No data available"
      description="There's no data to display at the moment. Try refreshing or check back later."
      action={onRefresh ? { label: 'Refresh', onClick: onRefresh } : undefined}
    />
  )
}

export function NoResultsEmptyState({ onClearFilters }: { onClearFilters?: () => void }) {
  return (
    <EmptyState
      icon={<Search size={24} />}
      title="No results found"
      description="We couldn't find any matches for your search. Try adjusting your filters."
      action={onClearFilters ? { label: 'Clear filters', onClick: onClearFilters } : undefined}
    />
  )
}

export function NoActivityEmptyState() {
  return (
    <EmptyState
      icon={<TrendingUp size={24} />}
      title="No unusual activity"
      description="The market is quiet. No unusual options activity detected at this time."
      variant="compact"
    />
  )
}

export function ErrorEmptyState({ onRetry }: { onRetry?: () => void }) {
  return (
    <EmptyState
      icon={<AlertCircle size={24} />}
      title="Something went wrong"
      description="We encountered an error loading this data. Please try again."
      action={onRetry ? { label: 'Try again', onClick: onRetry } : undefined}
    />
  )
}

export default EmptyState
