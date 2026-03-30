import { useState, useMemo, useCallback, memo } from 'react'
import type { TokenInfo, SortOrder } from '../types'
import { applyFilters } from '../utils/tokenFilters'
import { useDebounce } from '../hooks/useDebounce'
import { Input } from './UI/Input'
import { Card } from './UI/Card'

interface DashboardProps {
  tokens?: TokenInfo[]
}

/**
 * Memoized with React.memo — re-renders only when the tokens prop changes.
 * Internal filter/sort state changes are isolated here and don't propagate upward.
 *
 * filteredTokens is wrapped in useMemo so the applyFilters computation only
 * re-runs when tokens, search, creator, or sort actually change.
 *
 * Event handlers are wrapped in useCallback so their references stay stable
 * across renders, which is important if they are ever passed to memoized children.
 */
const Dashboard: React.FC<DashboardProps> = memo(({ tokens }) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [creatorFilter, setCreatorFilter] = useState('')
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest')

  const debouncedSearch = useDebounce(searchQuery, 300)
  const debouncedCreator = useDebounce(creatorFilter, 300)

  // Expensive filter + sort — only recomputes when inputs change
  const filteredTokens = useMemo(
    () => applyFilters(tokens, debouncedSearch, debouncedCreator, sortOrder),
    [tokens, debouncedSearch, debouncedCreator, sortOrder],
  )

  const isFilterActive = debouncedSearch !== '' || debouncedCreator !== ''

  // Stable callback references so child inputs don't re-render unnecessarily
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }, [])

  const handleCreatorChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setCreatorFilter(e.target.value)
  }, [])

  const handleSortChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortOrder(e.target.value as SortOrder)
  }, [])

  return (
    <div className="space-y-4">
      {/* FilterBar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 min-w-0">
          <Input
            label="Search by name or symbol"
            value={searchQuery}
            onChange={handleSearchChange}
          />
        </div>
        <div className="flex-1 min-w-0">
          <Input
            label="Filter by creator address"
            value={creatorFilter}
            onChange={handleCreatorChange}
          />
        </div>
        <div className="space-y-1 w-full sm:w-auto sm:min-w-[180px]">
          <label htmlFor="sort-order" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Sort order
          </label>
          <select
            id="sort-order"
            value={sortOrder}
            onChange={handleSortChange}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm bg-white"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="alphabetical">Alphabetical</option>
          </select>
        </div>
      </div>

      {filteredTokens.length === 0 ? (
        <p className="text-center text-gray-500 dark:text-gray-400 py-8 text-sm sm:text-base">
          {isFilterActive
            ? 'No tokens match your search.'
            : 'No tokens have been deployed yet.'}
        </p>
      ) : (
        <ul className="space-y-3">
          {filteredTokens.map((token, i) => (
            <li key={i}>
              <Card>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white break-words">{token.name}</span>
                    <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">({token.symbol})</span>
                  </div>
                  <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">Decimals: {token.decimals}</span>
                </div>
                <div className="mt-2 text-sm text-gray-600 dark:text-gray-300 space-y-1">
                  <div>
                    <span className="font-medium">Total Supply:</span> {token.totalSupply}
                  </div>
                  <div className="break-all sm:truncate">
                    <span className="font-medium">Creator:</span>{' '}
                    <span className="font-mono text-xs">{token.creator}</span>
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
})

Dashboard.displayName = 'Dashboard'

export { Dashboard }
