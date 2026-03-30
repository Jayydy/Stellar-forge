import { useState, useEffect, useCallback, useRef } from 'react'
import { STELLAR_CONFIG } from '../config/stellar'

// Dummy source account used only for simulation (no signing required)
const DUMMY_SOURCE = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5'

function getRpcUrl(): string {
  const network = STELLAR_CONFIG.network as 'testnet' | 'mainnet'
  return STELLAR_CONFIG[network].sorobanRpcUrl
}

function getNetworkPassphrase(): string {
  const network = STELLAR_CONFIG.network as 'testnet' | 'mainnet'
  return STELLAR_CONFIG[network].networkPassphrase
}

/**
 * Calls balance(address) on a Soroban token contract via simulateTransaction.
 * Returns '0' when the account has no balance or trustline.
 */
async function fetchBalance(tokenAddress: string, accountAddress: string): Promise<string> {
  const { xdr, Contract, Address, Account, TransactionBuilder } = await import('stellar-sdk')

  const contract = new Contract(tokenAddress)
  const op = contract.call('balance', Address.fromString(accountAddress).toScVal())

  const source = new Account(DUMMY_SOURCE, '0')
  const tx = new TransactionBuilder(source, {
    fee: '100',
    networkPassphrase: getNetworkPassphrase(),
  })
    .addOperation(op)
    .setTimeout(30)
    .build()

  const res = await fetch(getRpcUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'simulateTransaction',
      params: { transaction: tx.toEnvelope().toXDR('base64') },
    }),
  })

  if (!res.ok) throw new Error(`RPC HTTP error ${res.status}`)
  const json = await res.json()

  // A missing/zero balance returns an empty result, not an error
  const resultXdr: string | undefined = json.result?.results?.[0]?.xdr
  if (!resultXdr) return '0'

  const val = xdr.ScVal.fromXDR(resultXdr, 'base64')
  if (val.switch() === xdr.ScValType.scvI128()) {
    const hi = BigInt(val.i128().hi().toString())
    const lo = BigInt(val.i128().lo().toString())
    return ((hi << 64n) | lo).toString()
  }

  return '0'
}

// ── Hook ──────────────────────────────────────────────────────────────────────

interface UseTokenBalanceResult {
  balance: string
  isLoading: boolean
  error: Error | null
  refresh: () => void
}

export function useTokenBalance(
  tokenAddress: string,
  accountAddress: string,
): UseTokenBalanceResult {
  const [balance, setBalance] = useState('0')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const fetchingRef = useRef(false)

  const load = useCallback(async () => {
    if (!tokenAddress || !accountAddress) {
      setBalance('0')
      return
    }
    if (fetchingRef.current) return
    fetchingRef.current = true

    setIsLoading(true)
    setError(null)
    try {
      const result = await fetchBalance(tokenAddress, accountAddress)
      setBalance(result)
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)))
    } finally {
      setIsLoading(false)
      fetchingRef.current = false
    }
  }, [tokenAddress, accountAddress])

  useEffect(() => {
    load()
  }, [load])

  return { balance, isLoading, error, refresh: load }
}
