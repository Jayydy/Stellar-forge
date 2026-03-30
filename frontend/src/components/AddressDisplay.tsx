import { truncateAddress, stellarExplorerUrl } from '../utils/formatting'
import { CopyButton } from './CopyButton'
import type { Network } from '../context/NetworkContext'

interface AddressDisplayProps {
  address: string
  type: 'account' | 'contract'
  showCopy?: boolean
  showExplorer?: boolean
  network?: Network
}

export const AddressDisplay = ({
  address,
  type,
  showCopy = true,
  showExplorer = true,
  network = 'testnet',
}: AddressDisplayProps) => {
  return (
    <span className="inline-flex items-center gap-1 font-mono text-sm">
      <span title={address}>{truncateAddress(address)}</span>

      {showCopy && (
        <CopyButton value={address} ariaLabel="Copy address" />
      )}


      {showExplorer && (
        <a
          href={stellarExplorerUrl(type, address, network)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View on Stellar Explorer"
          className="text-gray-400 hover:text-blue-500 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
            <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
          </svg>
        </a>
      )}
    </span>
  )
}
