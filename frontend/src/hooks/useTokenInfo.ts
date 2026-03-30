import { useState, useEffect, useCallback, useRef } from 'react'
import { stellarService } from '../services/stellar'
import type { TokenInfo } from '../types'

// ── Module-level cache keyed by token address ─────────────────────────────────
// Shared across all hook instances so multiple components showing the same
// token don't each fire a separate RPC call within the TTL window.

const CACHE_TTL_MS = 30_000

interface CacheEntry {
  info: TokenInfo
  fetchedAt: number
}

const cache = new Map<string, CacheEntry>()

/** Exposed for testing only */
export function _clearTokenInfoCache() {
  cache.clear()
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UseTokenInfoResult {
  token: TokenInfo | null
  isLoading: boolean
  error: Error | null
  /** Bypass cache and re-fetch */
  refresh: () => void
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Fetches and caches the on-chain details for a single token by its contract address.
 * Returns null while loading or when address is empty.
 */
export function useTokenInfo(address: string): UseTokenInfoResult {
  const [token, setToken] = useState<TokenInfo | null>(() => cache.get(address)?.info ?? null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Guard against duplicate in-flight requests
  const fetchingRef = useRef(false)

  const load = useCallback(
    async (bypassCache: boolean) => {
      if (!address) {
        setToken(null)
        return
      }

      const now = Date.now()
      const hit = cache.get(address)

      if (!bypassCache && hit && now - hit.fetchedAt < CACHE_TTL_MS) {
        setToken(hit.info)
        return
      }

      if (fetchingRef.current) return
      fetchingRef.current = true

      setIsLoading(true)
      setError(null)

      try {
        const info = await stellarService.getTokenInfo(address)
        cache.set(address, { info, fetchedAt: Date.now() })
        setToken(info)
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)))
      } finally {
        setIsLoading(false)
        fetchingRef.current = false
      }
    },
    [address],
  )

  // Re-run whenever the address changes
  useEffect(() => {
    load(false)
  }, [load])

  const refresh = useCallback(() => load(true), [load])

  return { token, isLoading, error, refresh }
}
