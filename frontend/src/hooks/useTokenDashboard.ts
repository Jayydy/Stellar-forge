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
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [page, setPageRaw] = useState(1)
  const fetchingRef = useRef(false)

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

        // 1. Get total token count via get_state()
        const state = await stellarService.getFactoryState()
        const count = state.tokenCount
        setTotalCount(count)

        if (count === 0) {
          setAllRows([])
          return
        }

        // 2. Build index→address map from token_created events
        //    The contract emits: (token_address, creator, index)
        const { events } = await stellarService.getContractEvents(contractId, 200)
        const indexToAddress = new Map<number, string>()
        for (const e of events) {
          if (e.type === 'token_created' && e.data.tokenAddress) {
            // index is stored in data — fall back to position if missing
            const idx = e.data.index !== undefined ? Number(e.data.index) : -1
            if (idx >= 0) indexToAddress.set(idx, e.data.tokenAddress)
          }
        }

        // 3. Fetch token info by index for all tokens (Promise.all for parallelism)
        //    Indices are 1-based in the contract (incremented before storing)
        const indices = Array.from({ length: count }, (_, i) => i + 1)
        const results = await Promise.allSettled(
          indices.map((i) => stellarService.getTokenInfo(i)),
        )

        const rows: TokenRow[] = results
          .map((r, i) => {
            if (r.status !== 'fulfilled') return null
            const info = r.value
            const address = indexToAddress.get(indices[i]) ?? ''
            if (!address) return null
            return { ...info, address } as TokenRow
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

  useEffect(() => {
    if (wallet.isConnected) load()
  }, [load, wallet.isConnected])

  const refresh = useCallback(() => load(true), [load])

  const start = (page - 1) * PAGE_SIZE
  const rows = allRows.slice(start, start + PAGE_SIZE)

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
