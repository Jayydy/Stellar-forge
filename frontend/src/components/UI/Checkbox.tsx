import React from 'react'

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

export const Checkbox: React.FC<CheckboxProps> = ({
  label,
  error,
  id,
  required,
  disabled,
  className = '',
  ...props
}) => {
  const checkboxId = id || label.toLowerCase().replace(/\s+/g, '-')
  const errorId = `${checkboxId}-error`

  return (
    <div className="space-y-1">
      <label
        htmlFor={checkboxId}
        className={`inline-flex items-center gap-2 text-sm font-medium ${disabled ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed' : 'text-gray-700 dark:text-gray-300 cursor-pointer'}`}
      >
        <input
          type="checkbox"
          id={checkboxId}
          required={required}
          disabled={disabled}
          aria-required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 disabled:cursor-not-allowed ${error ? 'border-red-300 dark:border-red-500' : ''} ${className}`}
          {...props}
        />
        {label}
        {required && (
          <span aria-hidden="true" className="text-red-600 dark:text-red-400">
            *
          </span>
        )}
      </label>
      {error && (
        <p id={errorId} role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  )
}
