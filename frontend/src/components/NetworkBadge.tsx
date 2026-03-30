import { useNetwork } from '../context/NetworkContext'
import type { Network } from '../context/NetworkContext'

const BADGE_COLORS: Record<Network, string> = {
  testnet: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  mainnet: 'bg-green-100 text-green-800 border-green-300',
}

const DOT_COLORS: Record<Network, string> = {
  testnet: 'bg-yellow-500',
  mainnet: 'bg-green-500',
}

const LABELS: Record<Network, string> = {
  testnet: 'Testnet',
  mainnet: 'Mainnet',
}

/**
 * NetworkBadge — read-only pill showing the active app network.
 * Reads Freighter's network via the mismatch hook in NetworkContext.
 */
export const NetworkBadge: React.FC = () => {
  const { network } = useNetwork()

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold select-none ${BADGE_COLORS[network]}`}
      aria-label={`Active network: ${LABELS[network]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${DOT_COLORS[network]}`} aria-hidden="true" />
      {LABELS[network]}
    </span>
  )
}

/**
 * NetworkMismatchBanner — full-width warning shown when Freighter's network
 * doesn't match the app's configured network. Blocks write operations.
 */
export const NetworkMismatchBanner: React.FC = () => {
  const { network, mismatch } = useNetwork()

  if (!mismatch.isMismatch) return null

  const expected = network === 'mainnet' ? 'Mainnet' : 'Testnet'
  const freighterLabel = mismatch.freighterNetwork ?? 'a different network'

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="w-full bg-red-50 border-b border-red-200 px-4 py-3 flex items-center gap-3"
    >
      <span className="flex-shrink-0 text-red-500" aria-hidden="true">
        <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        </svg>
      </span>
      <p className="text-sm text-red-800 flex-1">
        <span className="font-semibold">Network mismatch:</span> Your Freighter wallet is on{' '}
        <span className="font-medium">{freighterLabel}</span> but the app is set to{' '}
        <span className="font-medium">{expected}</span>. Switch your Freighter wallet to{' '}
        {expected} to continue.
      </p>
      <button
        onClick={mismatch.refresh}
        className="flex-shrink-0 text-xs text-red-700 underline hover:text-red-900 focus:outline-none focus:ring-2 focus:ring-red-500 rounded"
        aria-label="Re-check network"
      >
        Re-check
      </button>
    </div>
  )
}
