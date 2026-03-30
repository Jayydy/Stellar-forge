import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { stellarService } from '../services/stellar'
import { STELLAR_CONFIG } from '../config/stellar'
import type { TokenInfo } from '../types'

// ── Module-level cache keyed by creator address ('' = all tokens) ─────────────
// Shared across all hook instances — any component mounting within the TTL
// window reuses the same result without an extra network round-trip.

const CACHE_TTL_MS = 30_000

interface CacheEntry {
  tokens: TokenInfo[]
  fetchedAt: number
}

const cache = new Map<string, CacheEntry>()

/** Exposed for testing only */
export function _clearCache() {
  cache.clear()
}

// ── Parallel token fetcher ────────────────────────────────────────────────────

async function fetchAllTokens(creator?: string): Promise<TokenInfo[]> {
  const contractId = STELLAR_CONFIG.factoryContractId
  if (!contractId) throw new Error('VITE_FACTORY_CONTRACT_ID is not configured')

  if (creator) {
    return stellarService.getTokensByCreator(creator)
  }

  // Fetch all: collect unique token addresses from token_created events,
  // then resolve each in parallel (failed resolutions are silently dropped).
  const { events } = await stellarService.getContractEvents(contractId, 100)
  const addresses = [
    ...new Set(
      events
        .filter((e) => e.type === 'token_created')
        .map((e) => e.data.tokenAddress)
        .filter((addr): addr is string => !!addr),
    ),
  ]

  const results = await Promise.allSettled(
    addresses.map((addr) => stellarService.getTokenInfo(addr)),
  )

  return results
    .filter((r): r is PromiseFulfilledResult<TokenInfo> => r.status === 'fulfilled')
    .map((r) => r.value)
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UseTokensResult {
  /** Tokens for the current page */
  tokens: TokenInfo[]
  /** All fetched tokens (unsliced) */
  allTokens: TokenInfo[]
  isLoading: boolean
  error: Error | null
  /** Current 1-based page number */
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
  setPage: (page: number) => void
  setPageSize: (size: number) => void
  /** Bypass cache and re-fetch */
  refresh: () => void
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useTokens(creator?: string): UseTokensResult {
  const cacheKey = creator ?? ''

  const [allTokens, setAllTokens] = useState<TokenInfo[]>(() => cache.get(cacheKey)?.tokens ?? [])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [page, setPageRaw] = useState(1)
  const [pageSize, setPageSizeRaw] = useState(10)

  // Prevent duplicate in-flight requests when multiple components mount at once
  const fetchingRef = useRef(false)

  const load = useCallback(
    async (bypassCache: boolean) => {
      const now = Date.now()
      const hit = cache.get(cacheKey)

      if (!bypassCache && hit && now - hit.fetchedAt < CACHE_TTL_MS) {
        setAllTokens(hit.tokens)
        return
      }

      if (fetchingRef.current) return
      fetchingRef.current = true

      setIsLoading(true)
      setError(null)

      try {
        const result = await fetchAllTokens(creator)
        cache.set(cacheKey, { tokens: result, fetchedAt: Date.now() })
        setAllTokens(result)
        // Reset to first page whenever data is refreshed
        setPageRaw(1)
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)))
      } finally {
        setIsLoading(false)
        fetchingRef.current = false
      }
    },
    [cacheKey, creator],
  )

  useEffect(() => {
    load(false)
  }, [load])

  const refresh = useCallback(() => load(true), [load])

  const totalCount = allTokens.length
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))

  const setPage = useCallback(
    (p: number) => setPageRaw(Math.min(Math.max(1, p), totalPages)),
    [totalPages],
  )

  const setPageSize = useCallback((size: number) => {
    setPageSizeRaw(Math.max(1, size))
    setPageRaw(1)
  }, [])

  const tokens = useMemo(() => {
    const start = (page - 1) * pageSize
    return allTokens.slice(start, start + pageSize)
  }, [allTokens, page, pageSize])

  return {
    tokens,
    allTokens,
    isLoading,
    error,
    page,
    pageSize,
    totalCount,
    totalPages,
    setPage,
    setPageSize,
    refresh,
  }
}
