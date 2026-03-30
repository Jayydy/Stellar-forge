import React from 'react'
import { useWallet } from '../../hooks/useWallet'
import { truncateAddress } from '../../utils/formatting'
import { Button } from './Button'
import { Spinner } from './Spinner'

export const WalletButton: React.FC = () => {
  const { wallet, isConnecting, isInstalled, error, connect, disconnect } = useWallet()

  if (!isInstalled) {
    return (
      <a
        href="https://www.freighter.app/"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors min-h-[44px]"
      >
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Install Freighter
      </a>
    )
  }

  if (isConnecting) {
    return (
      <Button disabled size="sm" aria-label="Connecting wallet" className="shrink-0">
        <Spinner size="sm" label="Connecting wallet" />
        <span className="ml-2 hidden sm:inline">Connecting…</span>
      </Button>
    )
  }

  if (wallet.isConnected && wallet.address) {
    return (
      <div className="flex items-center gap-2">
        <span
          className="hidden md:block font-mono text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded"
          title={wallet.address}
        >
          {truncateAddress(wallet.address)}
        </span>
        <Button onClick={disconnect} variant="outline" size="sm" aria-label="Disconnect wallet" className="shrink-0">
          Disconnect
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button onClick={connect} size="sm" aria-label="Connect wallet" className="shrink-0">
        Connect Wallet
      </Button>
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 max-w-[200px] text-right" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
