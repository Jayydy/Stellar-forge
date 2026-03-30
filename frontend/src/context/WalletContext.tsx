import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { walletService } from '../services/wallet'

interface WalletState {
  address: string | null
  isConnected: boolean
  balance?: string
}

interface WalletContextValue {
  wallet: WalletState
  isConnecting: boolean
  error: string | null
  isInstalled: boolean
  connect: () => Promise<void>
  disconnect: () => void
}

const WalletContext = createContext<WalletContextValue | null>(null)

export function WalletProvider({ children }: { children: ReactNode }) {
  const [wallet, setWallet] = useState<WalletState>({
    address: null,
    isConnected: false,
    balance: undefined,
  })
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Start with sync window.freighter check; async check updates it once resolved
  const [isInstalled, setIsInstalled] = useState<boolean>(walletService.isInstalled())

  const fetchBalance = async (address: string) => {
    try {
      const balance = await walletService.getBalance(address)
      setWallet((prev) => ({ ...prev, balance }))
    } catch (err) {
      console.error('Failed to fetch balance:', err)
    }
  }

  const connect = async () => {
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
  }

  const disconnect = () => {
    walletService.disconnect()
    setWallet({ address: null, isConnected: false, balance: undefined })
    setError(null)
  }

  useEffect(() => {
    const init = async () => {
      // Async install check — more reliable than window.freighter sniff
      const installed = await walletService.isInstalledAsync()
      setIsInstalled(installed)

      if (!installed) return

      try {
        const address = await walletService.checkExistingConnection()
        if (address) {
          setWallet({ address, isConnected: true, balance: undefined })
          await fetchBalance(address)
        }
      } catch (err) {
        console.error('Failed to check existing connection:', err)
      }
    }

    init()
  }, [])

  return (
    <WalletContext.Provider
      value={{
        wallet,
        isConnecting,
        error,
        isInstalled,
        connect,
        disconnect,
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}

export function useWalletContext(): WalletContextValue {
  const ctx = useContext(WalletContext)
  if (!ctx) {
    throw new Error('useWalletContext must be used within a WalletProvider')
  }
  return ctx
}
