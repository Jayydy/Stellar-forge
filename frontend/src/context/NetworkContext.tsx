import { createContext, useContext, useCallback, ReactNode } from 'react'
import { STELLAR_CONFIG } from '../config/stellar'
import { useLocalStorage } from '../hooks/useLocalStorage'

export type Network = 'testnet' | 'mainnet'

const STORAGE_KEY = 'stellarforge_network'

interface NetworkContextValue {
  network: Network
  switchNetwork: (n: Network) => void
  rpcUrl: string
  horizonUrl: string
  networkPassphrase: string
}

const NetworkContext = createContext<NetworkContextValue | null>(null)

export function NetworkProvider({ children }: { children: ReactNode }) {
  const [network, setNetwork] = useLocalStorage<Network>(
    STORAGE_KEY,
    (STELLAR_CONFIG.network as Network) ?? 'testnet',
  )

  const switchNetwork = useCallback(
    (n: Network) => {
      setNetwork(n)
    },
    [setNetwork],
  )

  const cfg = STELLAR_CONFIG[network]

  return (
    <NetworkContext.Provider
      value={{
        network,
        switchNetwork,
        rpcUrl: cfg.sorobanRpcUrl,
        horizonUrl: cfg.horizonUrl,
        networkPassphrase: cfg.networkPassphrase,
      }}
    >
      {children}
    </NetworkContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useNetwork(): NetworkContextValue {
  const ctx = useContext(NetworkContext)
  if (!ctx) throw new Error('useNetwork must be used within a NetworkProvider')
  return ctx
}
