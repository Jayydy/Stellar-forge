import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTokenDashboard } from '../hooks/useTokenDashboard'
import { useWalletContext } from '../context/WalletContext'
import { TokenCard } from './TokenCard'
import { Button } from './UI/Button'
import { SkeletonTokenCard } from './UI/Skeleton'
import { PaginationControls } from './UI/PaginationControls'

// ── Skeleton grid shown while loading ─────────────────────────────────────────

const LoadingSkeleton: React.FC = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" aria-busy="true" aria-label="Loading tokens">
    {Array.from({ length: 6 }).map((_, i) => (
      <SkeletonTokenCard key={i} />
    ))}
  </div>
)

// ── Empty state ───────────────────────────────────────────────────────────────

const EmptyState: React.FC<{ onCreateToken: () => void }> = ({ onCreateToken }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
    <div className="text-5xl" aria-hidden="true">🪙</div>
    <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">No tokens yet</h2>
    <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
      You haven't deployed any tokens from this wallet. Create your first token to get started.
    </p>
    <Button onClick={onCreateToken}>Create Token</Button>
  </div>
)

// ── Error state ───────────────────────────────────────────────────────────────

const ErrorState: React.FC<{ message: string; onRetry: () => void }> = ({ message, onRetry }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
    <div className="text-5xl" aria-hidden="true">⚠️</div>
    <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Failed to load tokens</h2>
    <p className="text-sm text-red-500 dark:text-red-400 max-w-sm break-words">{message}</p>
    <Button variant="outline" onClick={onRetry}>Retry</Button>
  </div>
)

// ── Not connected state ───────────────────────────────────────────────────────

const NotConnected: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
    <div className="text-5xl" aria-hidden="true">🔌</div>
    <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Wallet not connected</h2>
    <p className="text-sm text-gray-500 dark:text-gray-400">Connect your Freighter wallet to view your tokens.</p>
  </div>
)

// ── Main component ────────────────────────────────────────────────────────────

export const TokenDashboard: React.FC = () => {
  const { wallet } = useWalletContext()
  const navigate = useNavigate()
  const { rows, isLoading, error, page, totalPages, totalCount, setPage, refresh } =
    useTokenDashboard()

  const handleCreateToken = useCallback(() => navigate('/create'), [navigate])

  if (!wallet.isConnected) return <NotConnected />

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Tokens</h1>
          {!isLoading && !error && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {totalCount === 0
                ? 'No tokens deployed'
                : `${totalCount} token${totalCount !== 1 ? 's' : ''} deployed`}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={refresh} disabled={isLoading} aria-label="Refresh token list">
            Refresh
          </Button>
          <Button size="sm" onClick={handleCreateToken}>
            + Create Token
          </Button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : error ? (
        <ErrorState message={error.message} onRetry={refresh} />
      ) : rows.length === 0 ? (
        <EmptyState onCreateToken={handleCreateToken} />
      ) : (
        <>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 list-none p-0">
            {rows.map((token) => (
              <TokenCard key={token.address} token={token} />
            ))}
          </ul>

          {totalPages > 1 && (
            <PaginationControls
              page={page}
              totalPages={totalPages}
              totalCount={totalCount}
              pageSize={10}
              onPrev={() => setPage(page - 1)}
              onNext={() => setPage(page + 1)}
            />
          )}
        </>
      )}
    </div>
  )
}
