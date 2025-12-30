/**
 * Simple SVG-based chart components.
 */

import { useMemo } from 'react'
import clsx from 'clsx'

// Mini Sparkline Chart
interface SparklineProps {
  data: number[]
  width?: number
  height?: number
  color?: 'primary' | 'bullish' | 'bearish' | 'auto'
  fillOpacity?: number
  className?: string
}

export function Sparkline({
  data,
  width = 100,
  height = 32,
  color = 'auto',
  fillOpacity = 0.1,
  className,
}: SparklineProps) {
  const { path, fillPath, strokeColor, isPositive } = useMemo(() => {
    if (data.length < 2) return { path: '', fillPath: '', strokeColor: 'text-gray-500', isPositive: true }

    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min || 1

    const points = data.map((value, index) => ({
      x: (index / (data.length - 1)) * width,
      y: height - ((value - min) / range) * (height - 4) - 2,
    }))

    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
    const fillPathD = `${pathD} L ${width} ${height} L 0 ${height} Z`

    const isPositive = data[data.length - 1] >= data[0]
    let strokeColor = 'text-gray-500'
    if (color === 'auto') {
      strokeColor = isPositive ? 'text-green-500' : 'text-red-500'
    } else if (color === 'bullish') {
      strokeColor = 'text-green-500'
    } else if (color === 'bearish') {
      strokeColor = 'text-red-500'
    } else {
      strokeColor = 'text-primary-500'
    }

    return { path: pathD, fillPath: fillPathD, strokeColor, isPositive }
  }, [data, width, height, color])

  if (data.length < 2) {
    return (
      <div
        className={clsx('flex items-center justify-center text-gray-500', className)}
        style={{ width, height }}
      >
        <span className="text-xs">No data</span>
      </div>
    )
  }

  return (
    <svg width={width} height={height} className={clsx(strokeColor, className)}>
      <defs>
        <linearGradient id={`gradient-${isPositive ? 'up' : 'down'}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="currentColor" stopOpacity={fillOpacity} />
          <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
        </linearGradient>
      </defs>
      <path
        d={fillPath}
        fill={`url(#gradient-${isPositive ? 'up' : 'down'})`}
      />
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// Bar Chart
interface BarChartData {
  label: string
  value: number
  color?: 'primary' | 'bullish' | 'bearish' | 'warning'
}

interface BarChartProps {
  data: BarChartData[]
  height?: number
  showLabels?: boolean
  showValues?: boolean
  className?: string
  orientation?: 'vertical' | 'horizontal'
}

export function BarChart({
  data,
  height = 200,
  showLabels = true,
  showValues = true,
  className,
  orientation = 'vertical',
}: BarChartProps) {
  const maxValue = Math.max(...data.map((d) => Math.abs(d.value)), 1)

  if (orientation === 'horizontal') {
    return (
      <div className={clsx('space-y-3', className)}>
        {data.map((item, index) => (
          <div key={index} className="space-y-1">
            {showLabels && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">{item.label}</span>
                {showValues && (
                  <span className="font-medium text-white tabular-nums">
                    {item.value.toLocaleString()}
                  </span>
                )}
              </div>
            )}
            <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
              <div
                className={clsx(
                  'h-full rounded-full transition-all duration-500',
                  item.color === 'bullish' && 'bg-green-500',
                  item.color === 'bearish' && 'bg-red-500',
                  item.color === 'warning' && 'bg-yellow-500',
                  (!item.color || item.color === 'primary') && 'bg-primary-500'
                )}
                style={{ width: `${(Math.abs(item.value) / maxValue) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className={clsx('flex items-end justify-between gap-2', className)} style={{ height }}>
      {data.map((item, index) => (
        <div key={index} className="flex-1 flex flex-col items-center gap-2">
          <div className="w-full flex justify-center" style={{ height: height - 24 }}>
            <div
              className={clsx(
                'w-full max-w-[40px] rounded-t-lg transition-all duration-500',
                item.color === 'bullish' && 'bg-green-500',
                item.color === 'bearish' && 'bg-red-500',
                item.color === 'warning' && 'bg-yellow-500',
                (!item.color || item.color === 'primary') && 'bg-primary-500'
              )}
              style={{ height: `${(Math.abs(item.value) / maxValue) * 100}%` }}
            />
          </div>
          {showLabels && (
            <span className="text-xs text-gray-400 truncate max-w-full">{item.label}</span>
          )}
        </div>
      ))}
    </div>
  )
}

// Gauge Chart for PCR, Sentiment, etc.
interface GaugeChartProps {
  value: number
  min?: number
  max?: number
  zones?: { min: number; max: number; color: string; label?: string }[]
  label?: string
  size?: number
  className?: string
}

export function GaugeChart({
  value,
  min = 0,
  max = 2,
  zones = [
    { min: 0, max: 0.7, color: '#22c55e', label: 'Bullish' },
    { min: 0.7, max: 1.3, color: '#f59e0b', label: 'Neutral' },
    { min: 1.3, max: 2, color: '#ef4444', label: 'Bearish' },
  ],
  label,
  size = 160,
  className,
}: GaugeChartProps) {
  const percentage = Math.min(Math.max((value - min) / (max - min), 0), 1)
  const angle = -135 + percentage * 270 // -135 to 135 degrees
  const radius = size / 2 - 20
  const cx = size / 2
  const cy = size / 2

  // Find current zone
  const currentZone = zones.find((z) => value >= z.min && value < z.max) || zones[zones.length - 1]

  return (
    <div className={clsx('relative inline-flex flex-col items-center', className)}>
      <svg width={size} height={size * 0.65}>
        {/* Background arc */}
        <path
          d={describeArc(cx, cy, radius, -135, 135)}
          fill="none"
          stroke="#374151"
          strokeWidth={8}
          strokeLinecap="round"
        />
        {/* Zone arcs */}
        {zones.map((zone, i) => {
          const startAngle = -135 + ((zone.min - min) / (max - min)) * 270
          const endAngle = -135 + ((zone.max - min) / (max - min)) * 270
          return (
            <path
              key={i}
              d={describeArc(cx, cy, radius, startAngle, endAngle)}
              fill="none"
              stroke={zone.color}
              strokeWidth={8}
              strokeLinecap="round"
              opacity={0.3}
            />
          )
        })}
        {/* Needle */}
        <line
          x1={cx}
          y1={cy}
          x2={cx + (radius - 10) * Math.cos((angle * Math.PI) / 180)}
          y2={cy + (radius - 10) * Math.sin((angle * Math.PI) / 180)}
          stroke="white"
          strokeWidth={3}
          strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r={6} fill="white" />
      </svg>
      <div className="text-center -mt-2">
        <div className="text-2xl font-bold text-white tabular-nums">{value.toFixed(2)}</div>
        {label && <div className="text-sm text-gray-400">{label}</div>}
        {currentZone.label && (
          <div className="text-sm font-medium" style={{ color: currentZone.color }}>
            {currentZone.label}
          </div>
        )}
      </div>
    </div>
  )
}

// Helper function for arc paths
function polarToCartesian(cx: number, cy: number, radius: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  }
}

function describeArc(cx: number, cy: number, radius: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, radius, endAngle)
  const end = polarToCartesian(cx, cy, radius, startAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1'
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`
}

// Mini donut chart
interface DonutChartProps {
  value: number
  max?: number
  size?: number
  strokeWidth?: number
  color?: 'primary' | 'bullish' | 'bearish' | 'warning'
  label?: string
  className?: string
}

export function DonutChart({
  value,
  max = 100,
  size = 80,
  strokeWidth = 8,
  color = 'primary',
  label,
  className,
}: DonutChartProps) {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (percentage / 100) * circumference

  return (
    <div className={clsx('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="none"
          className="text-gray-700"
          stroke="currentColor"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={clsx(
            'transition-all duration-500',
            color === 'primary' && 'text-primary-500',
            color === 'bullish' && 'text-green-500',
            color === 'bearish' && 'text-red-500',
            color === 'warning' && 'text-yellow-500'
          )}
          stroke="currentColor"
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-lg font-bold text-white tabular-nums">{percentage.toFixed(0)}%</div>
        {label && <div className="text-xs text-gray-400">{label}</div>}
      </div>
    </div>
  )
}

export default { Sparkline, BarChart, GaugeChart, DonutChart }
