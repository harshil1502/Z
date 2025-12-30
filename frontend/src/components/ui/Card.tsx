/**
 * Reusable Card component with variants.
 */

import { ReactNode } from 'react'
import clsx from 'clsx'

interface CardProps {
  children: ReactNode
  className?: string
  variant?: 'default' | 'elevated' | 'glass' | 'gradient'
  padding?: 'none' | 'sm' | 'md' | 'lg'
  hover?: boolean
}

export function Card({
  children,
  className,
  variant = 'default',
  padding = 'md',
  hover = false,
}: CardProps) {
  return (
    <div
      className={clsx(
        'rounded-xl border transition-all duration-200',
        // Variants
        variant === 'default' && 'bg-gray-800 border-gray-700',
        variant === 'elevated' && 'bg-gray-800 border-gray-700 shadow-xl shadow-black/20',
        variant === 'glass' && 'bg-gray-800/50 border-gray-700/50 backdrop-blur-sm',
        variant === 'gradient' && 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700',
        // Padding
        padding === 'none' && '',
        padding === 'sm' && 'p-3',
        padding === 'md' && 'p-4',
        padding === 'lg' && 'p-6',
        // Hover
        hover && 'hover:border-gray-600 hover:shadow-lg hover:shadow-black/10 cursor-pointer',
        className
      )}
    >
      {children}
    </div>
  )
}

interface CardHeaderProps {
  children: ReactNode
  className?: string
  action?: ReactNode
}

export function CardHeader({ children, className, action }: CardHeaderProps) {
  return (
    <div
      className={clsx(
        'flex items-center justify-between pb-4 border-b border-gray-700',
        className
      )}
    >
      <div className="font-semibold text-white">{children}</div>
      {action && <div>{action}</div>}
    </div>
  )
}

interface CardContentProps {
  children: ReactNode
  className?: string
}

export function CardContent({ children, className }: CardContentProps) {
  return <div className={clsx('pt-4', className)}>{children}</div>
}

interface CardFooterProps {
  children: ReactNode
  className?: string
}

export function CardFooter({ children, className }: CardFooterProps) {
  return (
    <div className={clsx('pt-4 mt-4 border-t border-gray-700', className)}>
      {children}
    </div>
  )
}

export default Card
