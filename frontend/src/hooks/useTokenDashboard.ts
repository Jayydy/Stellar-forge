import { useState, useEffect, useCallback, useRef } from 'react'
import { useStellarContext } from '../context/StellarContext'
import { useWalletContext } from '../context/WalletContext'
import { STELLAR_CONFIG } from '../config/stellar'
import type { TokenInfo } from '../types'

const PAGE_SIZE = 10

export interface TokenRow extends TokenInfo {
  /** Token contract address */
  address: string
}

export interface UseTokenDashboardResult {
  rows: TokenRow[]
  isLoading: boolean
  error: Error | null
  page: number
  totalPages: number
  totalCount: number
  pageSize: number
  setPage: (p: number) => void
  refresh: () => void
}

export function useTokenDashboard(): UseTokenDashboardResult {
  const { stellarService } = useStellarContext()
  const { wallet } = useWalletContext()

  const [allRows, setAllRows] = useState<TokenRow[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [page, setPageRaw] = useState(1)
  const fetchingRef = useRef(false)

  // Filter to only the connected wallet's tokens
  const myRows = allRows.filter(
    (r) => wallet.address && r.creator.toLowerCase() === wallet.address.toLowerCase(),
  )
  const totalCount = myRows.length
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  const setPage = useCallback(
    (p: number) => setPageRaw(Math.min(Math.max(1, p), totalPages)),
    [totalPages],
  )

  const load = useCallback(
    async (bypassCache = false) => {
      if (fetchingRef.current) return
      fetchingRef.current = true
      setIsLoading(true)
      setError(null)

      try {
        const contractId = STELLAR_CONFIG.factoryContractId
        if (!contractId) throw new Error('VITE_FACTORY_CONTRACT_ID is not configured')

        // Step 1: get total token count via get_state()
        const state = await stellarService.getFactoryState()
        const count = state.tokenCount

        if (count === 0) {
          setAllRows([])
          return
        }

        // Step 2: build index→address map from token_created events
        const { events } = await stellarService.getContractEvents(contractId, 200)
        const indexToAddress = new Map<number, string>()
        for (const e of events) {
          if (e.type === 'token_created' && e.data.tokenAddress) {
            const idx = e.data.index !== undefined ? Number(e.data.index) : -1
            if (idx >= 0) indexToAddress.set(idx, e.data.tokenAddress)
          }
        }

        // Step 3: fetch token info for all indices in parallel (1-based)
        const indices = Array.from({ length: count }, (_, i) => i + 1)
        const results = await Promise.allSettled(
          indices.map((i) => stellarService.getTokenInfo(i)),
        )

        // Step 4: assemble rows — client-side filter by creator happens in render
        const rows: TokenRow[] = results
          .map((r, i) => {
            if (r.status !== 'fulfilled') return null
            const address = indexToAddress.get(indices[i]) ?? ''
            if (!address) return null
            return { ...r.value, address } as TokenRow
          })
          .filter((r): r is TokenRow => r !== null)

        setAllRows(rows)
        if (bypassCache) setPageRaw(1)
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)))
      } finally {
        setIsLoading(false)
        fetchingRef.current = false
      }
    },
    [stellarService],
  )

  // Re-fetch when wallet connects; clear data when wallet disconnects or switches
  useEffect(() => {
    if (wallet.isConnected) {
      load()
    } else {
      setAllRows([])
      setError(null)
      setPageRaw(1)
    }
  }, [load, wallet.isConnected, wallet.address])

  const refresh = useCallback(() => load(true), [load])

  const start = (page - 1) * PAGE_SIZE
  const rows = myRows.slice(start, start + PAGE_SIZE)

  return {
    rows,
    isLoading,
    error,
    page,
    totalPages,
    totalCount,
    pageSize: PAGE_SIZE,
    setPage,
    refresh,
  }
}
