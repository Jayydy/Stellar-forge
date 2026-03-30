import { useState, useEffect, useCallback, useRef } from 'react'
import { STELLAR_CONFIG } from '../config/stellar'
import type { FactoryState } from '../types'

// ── Module-level cache ────────────────────────────────────────────────────────
// Shared across all hook instances so any component mounting after the first
// fetch within the TTL window reuses the same result without a network call.

const CACHE_TTL_MS = 30_000

interface CacheEntry {
  state: FactoryState
  fetchedAt: number // Date.now()
}

let cache: CacheEntry | null = null

// ── RPC helpers ───────────────────────────────────────────────────────────────

function getRpcUrl(): string {
  const network = STELLAR_CONFIG.network as 'testnet' | 'mainnet'
  return STELLAR_CONFIG[network].sorobanRpcUrl
}

async function rpcSimulate(contractId: string, method: string): Promise<unknown> {
  const { xdr, Contract } = await import('stellar-sdk')

  const contract = new Contract(contractId)
  const tx = contract.call(method)

  const res = await fetch(getRpcUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'simulateTransaction',
      params: { transaction: tx.toXDR() },
    }),
  })

  if (!res.ok) throw new Error(`RPC HTTP error ${res.status}`)
  const json = await res.json()
  if (json.error) throw new Error(json.error.message ?? 'RPC error')

  // simulateTransaction returns results[0].xdr — a base64 ScVal
  const resultXdr: string = json.result?.results?.[0]?.xdr
  if (!resultXdr) throw new Error('No result returned from simulateTransaction')

  return xdr.ScVal.fromXDR(resultXdr, 'base64')
}

// ── XDR → FactoryState decoder ────────────────────────────────────────────────

async function decodeFactoryState(scVal: unknown): Promise<FactoryState> {
  const { xdr } = await import('stellar-sdk')

  // get_state() returns a contracttype struct encoded as ScvMap
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const val = scVal as any
  if (val.switch() !== xdr.ScValType.scvMap()) {
    throw new Error('Unexpected ScVal type for FactoryState')
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const map: Map<string, any> = new Map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (val.map() as any[]).map((entry: any) => [entry.key().sym().toString() as string, entry.val()]),
  )

  function getAddress(key: string): string {
    const v = map.get(key)
    if (!v) throw new Error(`Missing field: ${key}`)
    const addr = v.address()
    if (addr.switch() === xdr.ScAddressType.scAddressTypeAccount()) {
      return addr.accountId().publicKey().toString()
    }
    return [...new Uint8Array(addr.contractId() as ArrayBuffer)]
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  }

  function getI128(key: string): bigint {
    const v = map.get(key)
    if (!v) throw new Error(`Missing field: ${key}`)
    const hi = BigInt(v.i128().hi().toString())
    const lo = BigInt(v.i128().lo().toString())
    return (hi << 64n) | lo
  }

  function getU32(key: string): number {
    const v = map.get(key)
    if (!v) throw new Error(`Missing field: ${key}`)
    return v.u32() as number
  }

  function getBool(key: string): boolean {
    const v = map.get(key)
    if (!v) throw new Error(`Missing field: ${key}`)
    return v.b() as boolean
  }

  return {
    admin: getAddress('admin'),
    treasury: getAddress('treasury'),
    baseFee: getI128('base_fee').toString(),
    metadataFee: getI128('metadata_fee').toString(),
    tokenCount: getU32('token_count'),
    paused: getBool('paused'),
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

interface UseFactoryStateResult {
  state: FactoryState | null
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

export function useFactoryState(): UseFactoryStateResult {
  const [state, setState] = useState<FactoryState | null>(cache?.state ?? null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Tracks whether a fetch is already in-flight to avoid duplicate requests
  // when multiple components mount simultaneously.
  const fetchingRef = useRef(false)

  const fetchState = useCallback(async (bypassCache: boolean) => {
    const now = Date.now()

    if (!bypassCache && cache && now - cache.fetchedAt < CACHE_TTL_MS) {
      setState(cache.state)
      return
    }

    if (fetchingRef.current) return
    fetchingRef.current = true

    setIsLoading(true)
    setError(null)

    try {
      const contractId = STELLAR_CONFIG.factoryContractId
      if (!contractId) throw new Error('VITE_FACTORY_CONTRACT_ID is not configured')

      const scVal = await rpcSimulate(contractId, 'get_state')
      const decoded = await decodeFactoryState(scVal)

      cache = { state: decoded, fetchedAt: Date.now() }
      setState(decoded)
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setIsLoading(false)
      fetchingRef.current = false
    }
  }, [])

  // Initial fetch on mount
  useEffect(() => {
    fetchState(false)
  }, [fetchState])

  const refetch = useCallback(() => {
    fetchState(true)
  }, [fetchState])

  return { state, isLoading, error, refetch }
}
