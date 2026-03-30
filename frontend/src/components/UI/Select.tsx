import React from 'react'

interface SelectOption {
  value: string | number
  label: string
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  options: SelectOption[]
  error?: string
  placeholder?: string
}

export const Select: React.FC<SelectProps> = ({
  label,
  options,
  error,
  placeholder,
  className = '',
  id,
  required,
  disabled,
  ...props
}) => {
  const selectId = id || label?.toLowerCase().replace(/\s+/g, '-')
  const errorId = selectId ? `${selectId}-error` : undefined

  return (
    <div className="space-y-1">
      {label && (
        <label
          htmlFor={selectId}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {label}
          {required && (
            <span aria-hidden="true" className="ml-1 text-red-600 dark:text-red-400">
              *
            </span>
          )}
        </label>
      )}
      <select
        id={selectId}
        required={required}
        disabled={disabled}
        aria-required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error && errorId ? errorId : undefined}
        className={`block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-500 disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:text-gray-500 dark:disabled:text-gray-600 disabled:cursor-not-allowed ${error ? 'border-red-300 dark:border-red-500' : ''} ${className}`}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p id={errorId} role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  )
}
