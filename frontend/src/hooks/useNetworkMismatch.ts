import { useState, useEffect, useCallback } from 'react'
import { getNetworkDetails } from '@stellar/freighter-api'
import { useNetwork } from '../context/NetworkContext'
import { STELLAR_CONFIG } from '../config/stellar'

export interface NetworkMismatchState {
  /** Network name reported by Freighter (e.g. "TESTNET") */
  freighterNetwork: string | null
  /** Whether Freighter's passphrase differs from the app's expected passphrase */
  isMismatch: boolean
  /** Re-check manually (e.g. after user acts on the warning) */
  refresh: () => void
}

const POLL_INTERVAL_MS = 5_000

export function useNetworkMismatch(): NetworkMismatchState {
  const { network } = useNetwork()
  const [freighterNetwork, setFreighterNetwork] = useState<string | null>(null)
  const [isMismatch, setIsMismatch] = useState(false)

  const check = useCallback(async () => {
    try {
      const details = await getNetworkDetails()
      if (details.error) {
        // Freighter not available — clear mismatch
        setFreighterNetwork(null)
        setIsMismatch(false)
        return
      }

      const expectedPassphrase = STELLAR_CONFIG[network].networkPassphrase
      setFreighterNetwork(details.network ?? null)
      setIsMismatch(details.networkPassphrase !== expectedPassphrase)
    } catch {
      setFreighterNetwork(null)
      setIsMismatch(false)
    }
  }, [network])

  useEffect(() => {
    check()
    const id = setInterval(check, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [check])

  return { freighterNetwork, isMismatch, refresh: check }
}
