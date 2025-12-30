/**
 * Reusable Button component with variants and states.
 */

import { ButtonHTMLAttributes, forwardRef, ReactNode } from 'react'
import clsx from 'clsx'
import { Loader2 } from 'lucide-react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
  size?: 'xs' | 'sm' | 'md' | 'lg'
  isLoading?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={clsx(
          'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          // Variants
          variant === 'primary' &&
            'bg-primary-600 text-white hover:bg-primary-500 focus:ring-primary-500 shadow-lg shadow-primary-600/25',
          variant === 'secondary' &&
            'bg-gray-700 text-gray-100 hover:bg-gray-600 focus:ring-gray-500',
          variant === 'ghost' &&
            'bg-transparent text-gray-300 hover:bg-gray-800 hover:text-white focus:ring-gray-500',
          variant === 'danger' &&
            'bg-red-600 text-white hover:bg-red-500 focus:ring-red-500 shadow-lg shadow-red-600/25',
          variant === 'success' &&
            'bg-green-600 text-white hover:bg-green-500 focus:ring-green-500 shadow-lg shadow-green-600/25',
          // Sizes
          size === 'xs' && 'px-2.5 py-1.5 text-xs gap-1',
          size === 'sm' && 'px-3 py-2 text-sm gap-1.5',
          size === 'md' && 'px-4 py-2.5 text-sm gap-2',
          size === 'lg' && 'px-6 py-3 text-base gap-2',
          className
        )}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="animate-spin" size={size === 'xs' ? 12 : size === 'sm' ? 14 : 16} />
        ) : (
          leftIcon
        )}
        {children}
        {!isLoading && rightIcon}
      </button>
    )
  }
)

Button.displayName = 'Button'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ children, className, variant = 'ghost', size = 'md', isLoading, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={clsx(
          'inline-flex items-center justify-center rounded-lg transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          // Variants
          variant === 'primary' && 'bg-primary-600 text-white hover:bg-primary-500 focus:ring-primary-500',
          variant === 'secondary' && 'bg-gray-700 text-gray-100 hover:bg-gray-600 focus:ring-gray-500',
          variant === 'ghost' && 'text-gray-400 hover:bg-gray-800 hover:text-white focus:ring-gray-500',
          variant === 'danger' && 'text-red-400 hover:bg-red-900/50 focus:ring-red-500',
          // Sizes
          size === 'sm' && 'p-1.5',
          size === 'md' && 'p-2',
          size === 'lg' && 'p-3',
          className
        )}
        {...props}
      >
        {isLoading ? <Loader2 className="animate-spin" size={16} /> : children}
      </button>
    )
  }
)

IconButton.displayName = 'IconButton'

export default Button
