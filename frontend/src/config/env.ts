// Environment variable validation

export const ENV = {
  network: import.meta.env.VITE_NETWORK || 'testnet',
  factoryContractId: import.meta.env.VITE_FACTORY_CONTRACT_ID ?? '',
  tokenWasmHash: import.meta.env.VITE_TOKEN_WASM_HASH ?? '',
  ipfsApiKey: import.meta.env.VITE_IPFS_API_KEY ?? '',
  ipfsApiSecret: import.meta.env.VITE_IPFS_API_SECRET ?? '',
} as const

export const isFactoryConfigured = (): boolean => Boolean(ENV.factoryContractId)
export const isIpfsConfigured = (): boolean => Boolean(ENV.ipfsApiKey && ENV.ipfsApiSecret)
