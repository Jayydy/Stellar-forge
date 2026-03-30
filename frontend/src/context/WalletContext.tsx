import { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react'
import { walletService } from '../services/wallet'
import { useNetwork } from './NetworkContext'

function useNetworkSafe() {
  try {
    return useNetwork()
  } catch {
    return { network: 'testnet' as const }
  }
}

interface WalletState {
  address: string | null
  isConnected: boolean
  balance: string | undefined
}

interface WalletContextValue {
  wallet: WalletState
  isConnecting: boolean
  error: string | null
  isInstalled: boolean
  connect: () => Promise<void>
  disconnect: () => void
  refreshBalance: () => Promise<void>
}

const WalletContext = createContext<WalletContextValue | null>(null)

export function WalletProvider({ children }: { children: ReactNode }) {
  const { network } = useNetworkSafe()
  const [wallet, setWallet] = useState<WalletState>({
    address: null,
    isConnected: false,
    balance: undefined,
  })
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isInstalled, setIsInstalled] = useState<boolean>(true)

  // Stable callback — only recreated when network changes
  const fetchBalance = useCallback(async (address: string) => {
    try {
      const balance = await walletService.getBalance(address, network)
      setWallet((prev: WalletState) => ({ ...prev, balance }))
    } catch {
      // Balance fetch failure is non-critical; wallet remains connected
    }
  }, [network])

  // Stable callback — only recreated when fetchBalance changes (i.e. network switch)
  const connect = useCallback(async () => {
    setIsConnecting(true)
    setError(null)
    try {
      const address = await walletService.connect()
      setWallet({ address, isConnected: true, balance: undefined })
      await fetchBalance(address)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect wallet')
      setWallet({ address: null, isConnected: false, balance: undefined })
    } finally {
      setIsConnecting(false)
    }
  }, [fetchBalance])

  // Stable callback — no dependencies, reference never changes after mount
  const disconnect = useCallback(() => {
    walletService.disconnect()
    setWallet({ address: null, isConnected: false, balance: undefined })
    setError(null)
  }, [])

  useEffect(() => {
    const initWallet = async () => {
      const installed = await walletService.isInstalled()
      setIsInstalled(installed)

      if (!installed) return

      try {
        const address = await walletService.checkExistingConnection()
        if (address) {
          setWallet({ address, isConnected: true, balance: undefined })
          await fetchBalance(address)
        }
      } catch {
        // Existing connection check failed silently; user can connect manually
      }
    }

    initWallet()
  }, [fetchBalance])

  // Refresh balance when network changes
  useEffect(() => {
    if (wallet.isConnected && wallet.address) {
      fetchBalance(wallet.address)
    }
  }, [network, fetchBalance, wallet.isConnected, wallet.address])

  // Stable callback — only recreated when fetchBalance or wallet.address changes
  const refreshBalance = useCallback(
    () => (wallet.address ? fetchBalance(wallet.address) : Promise.resolve()),
    [fetchBalance, wallet.address],
  )

  // Memoized context value — consumers only re-render when something actually changes
  const value = useMemo<WalletContextValue>(
    () => ({ wallet, isConnecting, error, isInstalled, connect, disconnect, refreshBalance }),
    [wallet, isConnecting, error, isInstalled, connect, disconnect, refreshBalance],
  )

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useWalletContext(): WalletContextValue {
  const ctx = useContext(WalletContext)
  if (!ctx) {
    throw new Error('useWalletContext must be used within a WalletProvider')
  }
  return ctx
}
