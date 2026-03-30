import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  'aria-label'?: string
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    children,
    className = '',
    disabled,
    ...props
  },
  ref,
) {
  const baseClasses =
    'inline-flex items-center justify-center font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'

  const variantClasses: Record<string, string> = {
    primary:
      'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500 dark:bg-blue-500 dark:hover:bg-blue-400',
    secondary:
      'bg-gray-600 hover:bg-gray-700 text-white focus:ring-gray-500 dark:bg-gray-500 dark:hover:bg-gray-400',
    outline:
      'border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-200',
  }

  const sizeClasses: Record<string, string> = {
    sm: 'px-3 py-2 text-sm min-h-[44px] min-w-[44px]',
    md: 'px-4 py-2 text-sm min-h-[44px]',
    lg: 'px-6 py-3 text-base min-h-[44px]',
  }

  const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`

  return (
    <button
      ref={ref}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin -ml-1 mr-3 h-4 w-4 text-current"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
          focusable="false"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  )
})
