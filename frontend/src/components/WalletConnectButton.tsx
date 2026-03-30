import { useWalletContext } from '../context/WalletContext'
import { truncateAddress, formatXLM } from '../utils/formatting'
import { Button } from './UI/Button'
import { Spinner } from './UI/Spinner'
import { CopyButton } from './CopyButton'

export const WalletConnectButton: React.FC = () => {
  const { wallet, isConnecting, isInstalled, connect, disconnect } = useWalletContext()

  // Wallet not installed state
  if (!isInstalled) {
    return (
      <a
        href="https://freighter.app"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Install Freighter wallet"
        className="text-blue-600 hover:text-blue-700 underline text-sm font-medium dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
      >
        Install Freighter
      </a>
    )
  }

  // Connecting state
  if (isConnecting) {
    return (
      <div className="inline-flex items-center gap-2">
        <Spinner size="sm" label="Connecting wallet" />
        <span className="text-sm text-gray-600 dark:text-gray-400">Connecting...</span>
      </div>
    )
  }

  // Connected state
  if (wallet.isConnected && wallet.address) {
    return (
      <div className="inline-flex items-center gap-3">
        <div className="flex flex-col items-end">
          <div className="inline-flex items-center gap-1">
            <span
              className="font-mono text-sm text-gray-700 dark:text-gray-300"
              title={wallet.address}
            >
              {truncateAddress(wallet.address)}
            </span>
            <CopyButton value={wallet.address} ariaLabel="Copy wallet address" />
          </div>
          {wallet.balance !== undefined ? (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formatXLM(wallet.balance)}
            </span>
          ) : (
            <span className="text-xs text-gray-400 dark:text-gray-500">Loading balance...</span>
          )}
        </div>
        <Button onClick={disconnect} variant="outline" size="sm" aria-label="Disconnect wallet">
          Disconnect
        </Button>
      </div>
    )
  }

  // Disconnected state (default)
  return (
    <Button onClick={connect} variant="primary" size="md" aria-label="Connect wallet">
      Connect Wallet
    </Button>
  )
}
