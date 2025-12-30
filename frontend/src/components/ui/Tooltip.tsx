/**
 * Tooltip component for additional context.
 */

import { ReactNode, useState, useRef, useEffect } from 'react'
import clsx from 'clsx'

interface TooltipProps {
  children: ReactNode
  content: ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
  delay?: number
  className?: string
}

export function Tooltip({
  children,
  content,
  position = 'top',
  delay = 200,
  className,
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true)
    }, delay)
  }

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setIsVisible(false)
  }

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {isVisible && (
        <div
          className={clsx(
            'absolute z-50 px-3 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg shadow-lg border border-gray-700',
            'animate-in fade-in-0 zoom-in-95 duration-200',
            // Positions
            position === 'top' && 'bottom-full left-1/2 -translate-x-1/2 mb-2',
            position === 'bottom' && 'top-full left-1/2 -translate-x-1/2 mt-2',
            position === 'left' && 'right-full top-1/2 -translate-y-1/2 mr-2',
            position === 'right' && 'left-full top-1/2 -translate-y-1/2 ml-2',
            className
          )}
        >
          {content}
          {/* Arrow */}
          <div
            className={clsx(
              'absolute w-2 h-2 bg-gray-900 border-gray-700 rotate-45',
              position === 'top' && 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 border-r border-b',
              position === 'bottom' && 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 border-l border-t',
              position === 'left' && 'right-0 top-1/2 -translate-y-1/2 translate-x-1/2 border-t border-r',
              position === 'right' && 'left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 border-b border-l'
            )}
          />
        </div>
      )}
    </div>
  )
}

export default Tooltip
