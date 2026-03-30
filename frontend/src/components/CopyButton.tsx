import { useClipboard } from '../hooks/useClipboard'
import React, { FC } from 'react'

export interface CopyButtonProps {
  value: string;
  ariaLabel?: string;
  className?: string;
}

export const CopyButton: React.FC<CopyButtonProps> = ({
  value,
  ariaLabel = 'Copy to clipboard',
  className = '',
}) => {
  const { copied, copy } = useClipboard()

  const handleCopy = () => {
    copy(value)
  }

  const defaultClasses = 'p-1 rounded transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1'

  return (
    <button
      onClick={handleCopy}
      aria-label={copied ? 'Copied!' : ariaLabel}
      className={`text-gray-400 hover:text-gray-600 ${defaultClasses} ${className}`}
      type="button"
    >
      {copied ? (
        // Checkmark icon (from AddressDisplay)
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 00-1.414 0L8 12.586 4.707 9.293a1 1 0 00-1.414 1.414l4 4a1 1 0 001.414 0l8-8a1 1 0 000-1.414z" clipRule="evenodd" />
        </svg>
      ) : (
        // Copy icon (from AddressDisplay)
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
          <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
        </svg>
      )}
    </button>
  )
}

