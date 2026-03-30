import React from 'react'

interface MissingVar {
  key: string
  description: string
}

interface Props {
  missing: MissingVar[]
}

export function MisconfigurationScreen({ missing }: Props) {
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-lg w-full p-8">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl" aria-hidden="true">⚠️</span>
          <h1 className="text-xl font-bold text-red-600 dark:text-red-400">App Misconfiguration</h1>
        </div>
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          The following required environment variables are not set. Copy{' '}
          <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded text-sm">.env.example</code> to{' '}
          <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded text-sm">.env</code> and fill in the values.
        </p>
        <ul className="space-y-2 mb-6">
          {missing.map((item) => (
            <li key={item.key} className="flex items-start gap-2 text-sm text-gray-800 dark:text-gray-200">
              <span className="text-red-500 mt-0.5">•</span>
              <div>
                <code className="block font-mono font-semibold">{item.key}</code>
                <span className="text-xs text-gray-600 dark:text-gray-400">{item.description}</span>
              </div>
            </li>
          ))}
        </ul>
        <a
          href="https://github.com/Stellar-forge/Stellar-forge#environment-variables"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          View setup instructions →
        </a>
      </div>
    </div>
  )
}
