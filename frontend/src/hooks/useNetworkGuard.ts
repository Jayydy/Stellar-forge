import { useNetwork } from '../context/NetworkContext'

/**
 * Returns whether write operations should be blocked due to a network mismatch.
 * Use this in any form that submits on-chain transactions.
 */
export function useNetworkGuard(): { blocked: boolean; reason: string | null } {
  const { mismatch, network } = useNetwork()

  if (mismatch.isMismatch) {
    const expected = network === 'mainnet' ? 'Mainnet' : 'Testnet'
    return {
      blocked: true,
      reason: `Switch Freighter to ${expected} to continue.`,
    }
  }

  return { blocked: false, reason: null }
}
