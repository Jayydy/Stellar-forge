// Stellar network configuration
import { ENV } from './env'

export type Network = 'testnet' | 'mainnet'

export interface NetworkConfig {
  networkPassphrase: string
  horizonUrl: string
  sorobanRpcUrl: string
}

export const NETWORK_CONFIGS: Record<Network, NetworkConfig> = {
  testnet: {
    networkPassphrase: 'Test SDF Network ; September 2015',
    horizonUrl: 'https://horizon-testnet.stellar.org',
    sorobanRpcUrl: 'https://soroban-testnet.stellar.org',
  },
  mainnet: {
    networkPassphrase: 'Public Global Stellar Network ; September 2015',
    horizonUrl: 'https://horizon.stellar.org',
    sorobanRpcUrl: 'https://soroban-mainnet.stellar.org',
  },
}

export const STELLAR_CONFIG = {
  network: ENV.network,
  factoryContractId: ENV.factoryContractId,
  tokenWasmHash: ENV.tokenWasmHash,
  ...NETWORK_CONFIGS,
}
