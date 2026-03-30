import { memo } from 'react'
import { Link } from 'react-router-dom'
import { formatAddress, formatTimestamp, timeAgo } from '../utils/formatting'
import { CopyButton } from './CopyButton'
import type { TokenRow } from '../hooks/useTokenDashboard'

interface TokenCardProps {
  token: TokenRow
}

/**
 * Memoized with React.memo — re-renders only when the token prop changes by reference.
 * This prevents unnecessary re-renders when parent state (filters, pagination) updates
 * but the individual token data hasn't changed.
 */
export const TokenCard: React.FC<TokenCardProps> = memo(({ token }) => {
  return (
    <li className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-3 sm:p-4 hover:shadow-md dark:hover:shadow-slate-900/50 transition-shadow">
      <div className="flex flex-col gap-3">
        {/* Token identity */}
        <div className="min-w-0 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-2">
            <Link
              to={`/tokens/${token.address}`}
              className="group flex items-baseline gap-2 hover:underline min-w-0"
            >
              <span className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 break-words">
                {token.name}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400 font-mono shrink-0">
                {token.symbol}
              </span>
            </Link>
            <Link
              to={`/tokens/${token.address}`}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium shrink-0 self-start sm:self-auto"
            >
              View details →
            </Link>
          </div>

          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
            <div>
              <dt className="inline">Decimals: </dt>
              <dd className="inline font-mono">{token.decimals}</dd>
            </div>

            {token.totalSupply && (
              <div>
                <dt className="inline">Supply: </dt>
                <dd className="inline font-mono break-all">{token.totalSupply}</dd>
              </div>
            )}

            {token.creator && (
              <div className="col-span-1 sm:col-span-2 flex items-center gap-1 min-w-0">
                <dt className="shrink-0">Creator:</dt>
                <dd className="font-mono truncate flex-1" title={token.creator}>
                  {formatAddress(token.creator)}
                </dd>
                <CopyButton value={token.creator} ariaLabel="Copy creator address" />
              </div>
            )}

            {token.createdAt > 0 && (
              <div className="col-span-1 sm:col-span-2">
                <dt className="inline">Created: </dt>
                <dd className="inline" title={formatTimestamp(token.createdAt)}>
                  {timeAgo(token.createdAt)}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Address row */}
        <div className="flex items-center gap-1 pt-2 border-t border-gray-100 dark:border-slate-700">
          <span
            className="text-xs font-mono text-gray-400 dark:text-gray-500 truncate flex-1"
            title={token.address}
          >
            {formatAddress(token.address)}
          </span>
          <CopyButton value={token.address} ariaLabel="Copy token address" />
        </div>
      </div>
    </li>
  )
})

TokenCard.displayName = 'TokenCard'
