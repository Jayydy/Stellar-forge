import React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  className = '',
  id,
  required,
  ...props
}) => {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
  const errorId = inputId ? `${inputId}-error` : undefined

  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
          {required && (
            <span aria-hidden="true" className="ml-1 text-red-600">
              *
            </span>
          )}
        </label>
      )}
      <input
        id={inputId}
        required={required}
        aria-required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error && errorId ? errorId : undefined}
        className={`block w-full px-3 py-3 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-base sm:text-sm min-h-[44px] bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-500 ${error ? 'border-red-300 dark:border-red-500' : ''} ${className}`}
        {...props}
      />
      {error && (
        <p id={errorId} role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  )
}
