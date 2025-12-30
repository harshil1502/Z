/**
 * Progress bar and indicator components.
 */

import clsx from 'clsx'

interface ProgressBarProps {
  value: number
  max?: number
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'bullish' | 'bearish'
  size?: 'xs' | 'sm' | 'md' | 'lg'
  showLabel?: boolean
  label?: string
  animated?: boolean
  className?: string
}

export function ProgressBar({
  value,
  max = 100,
  color = 'primary',
  size = 'md',
  showLabel = false,
  label,
  animated = false,
  className,
}: ProgressBarProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

  return (
    <div className={clsx('w-full', className)}>
      {(showLabel || label) && (
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-gray-400">{label}</span>
          {showLabel && (
            <span className="text-sm font-medium text-gray-300">{percentage.toFixed(0)}%</span>
          )}
        </div>
      )}
      <div
        className={clsx(
          'w-full bg-gray-700 rounded-full overflow-hidden',
          size === 'xs' && 'h-1',
          size === 'sm' && 'h-2',
          size === 'md' && 'h-3',
          size === 'lg' && 'h-4'
        )}
      >
        <div
          className={clsx(
            'h-full rounded-full transition-all duration-500 ease-out',
            color === 'primary' && 'bg-primary-500',
            color === 'success' && 'bg-green-500',
            color === 'warning' && 'bg-yellow-500',
            color === 'danger' && 'bg-red-500',
            color === 'bullish' && 'bg-green-500',
            color === 'bearish' && 'bg-red-500',
            animated && 'animate-pulse'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

interface DualProgressBarProps {
  leftValue: number
  rightValue: number
  leftLabel?: string
  rightLabel?: string
  leftColor?: 'bullish' | 'bearish' | 'primary' | 'secondary'
  rightColor?: 'bullish' | 'bearish' | 'primary' | 'secondary'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function DualProgressBar({
  leftValue,
  rightValue,
  leftLabel = 'Calls',
  rightLabel = 'Puts',
  leftColor = 'bullish',
  rightColor = 'bearish',
  size = 'md',
  className,
}: DualProgressBarProps) {
  const total = leftValue + rightValue
  const leftPercentage = total > 0 ? (leftValue / total) * 100 : 50
  const rightPercentage = total > 0 ? (rightValue / total) * 100 : 50

  return (
    <div className={clsx('w-full', className)}>
      <div className="flex items-center justify-between mb-2 text-sm">
        <div className="flex items-center gap-2">
          <span
            className={clsx(
              'w-2 h-2 rounded-full',
              leftColor === 'bullish' && 'bg-green-500',
              leftColor === 'bearish' && 'bg-red-500',
              leftColor === 'primary' && 'bg-primary-500',
              leftColor === 'secondary' && 'bg-gray-500'
            )}
          />
          <span className="text-gray-400">{leftLabel}</span>
          <span className="font-medium text-white tabular-nums">
            {leftValue.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-medium text-white tabular-nums">
            {rightValue.toLocaleString()}
          </span>
          <span className="text-gray-400">{rightLabel}</span>
          <span
            className={clsx(
              'w-2 h-2 rounded-full',
              rightColor === 'bullish' && 'bg-green-500',
              rightColor === 'bearish' && 'bg-red-500',
              rightColor === 'primary' && 'bg-primary-500',
              rightColor === 'secondary' && 'bg-gray-500'
            )}
          />
        </div>
      </div>
      <div
        className={clsx(
          'w-full flex rounded-full overflow-hidden',
          size === 'sm' && 'h-2',
          size === 'md' && 'h-3',
          size === 'lg' && 'h-4'
        )}
      >
        <div
          className={clsx(
            'transition-all duration-500',
            leftColor === 'bullish' && 'bg-green-500',
            leftColor === 'bearish' && 'bg-red-500',
            leftColor === 'primary' && 'bg-primary-500',
            leftColor === 'secondary' && 'bg-gray-500'
          )}
          style={{ width: `${leftPercentage}%` }}
        />
        <div
          className={clsx(
            'transition-all duration-500',
            rightColor === 'bullish' && 'bg-green-500',
            rightColor === 'bearish' && 'bg-red-500',
            rightColor === 'primary' && 'bg-primary-500',
            rightColor === 'secondary' && 'bg-gray-500'
          )}
          style={{ width: `${rightPercentage}%` }}
        />
      </div>
    </div>
  )
}

interface CircularProgressProps {
  value: number
  max?: number
  size?: number
  strokeWidth?: number
  color?: 'primary' | 'success' | 'warning' | 'danger'
  showLabel?: boolean
  className?: string
}

export function CircularProgress({
  value,
  max = 100,
  size = 64,
  strokeWidth = 4,
  color = 'primary',
  showLabel = true,
  className,
}: CircularProgressProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (percentage / 100) * circumference

  return (
    <div className={clsx('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="none"
          className="text-gray-700"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={clsx(
            'transition-all duration-500',
            color === 'primary' && 'text-primary-500',
            color === 'success' && 'text-green-500',
            color === 'warning' && 'text-yellow-500',
            color === 'danger' && 'text-red-500'
          )}
        />
      </svg>
      {showLabel && (
        <span className="absolute text-sm font-semibold text-white">
          {percentage.toFixed(0)}%
        </span>
      )}
    </div>
  )
}

export default ProgressBar
