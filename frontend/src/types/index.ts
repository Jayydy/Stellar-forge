// TypeScript type definitions

export interface TokenDeployParams {
  name: string
  symbol: string
  decimals: number
  initialSupply: string
  salt: string
  tokenWasmHash: string
  feePayment: string
  metadata?: {
    image: File
    description: string
  }
}

export interface DeploymentResult {
  tokenAddress: string
  transactionHash: string
  success: boolean
}

/**
 * TokenInfo matches the contract's TokenInfo struct.
 * All fields are required and correspond directly to contract storage.
 */
export interface TokenInfo {
  name: string
  symbol: string
  decimals: number
  creator: string
  createdAt: number // unix seconds (u64 from contract)
  totalSupply?: string // derived from events, not stored on contract
  metadataUri?: string // stored separately in contract
}

/**
 * FactoryState matches the contract's FactoryState struct.
 * All fields are required and correspond directly to contract storage.
 */
export interface FactoryState {
  admin: string // Stellar address
  paused: boolean
  treasury: string // Stellar address
  baseFee: string // i128 from contract, represented as string for precision
  metadataFee: string // i128 from contract, represented as string for precision
  tokenCount: number // u32 from contract
}

/**
 * ContractError maps contract error enum variants to their numeric codes.
 * Used for error handling and user-facing error messages.
 */
export type ContractError =
  | { code: 1; type: 'InsufficientFee'; message: string }
  | { code: 2; type: 'Unauthorized'; message: string }
  | { code: 3; type: 'InvalidParameters'; message: string }
  | { code: 4; type: 'TokenNotFound'; message: string }
  | { code: 5; type: 'MetadataAlreadySet'; message: string }
  | { code: 6; type: 'AlreadyInitialized'; message: string }
  | { code: 7; type: 'BurnAmountExceedsBalance'; message: string }
  | { code: 8; type: 'BurnNotEnabled'; message: string }
  | { code: 9; type: 'InvalidBurnAmount'; message: string }
  | { code: 10; type: 'ContractPaused'; message: string }

export interface IPFSMetadata {
  name?: string
  description?: string
  image?: string // ipfs:// URI
  [key: string]: unknown
}

export interface AppError {
  code: string
  message: string
}

export type SortOrder = 'newest' | 'oldest' | 'alphabetical'
export type ContractEventType =
  | 'token_created'
  | 'tokens_minted'
  | 'tokens_burned'
  | 'metadata_set'
  | 'fees_updated'

export interface ContractEvent {
  id: string
  type: ContractEventType
  ledger: number
  timestamp: number // unix seconds
  txHash: string
  data: Record<string, string>
}

export interface GetEventsResult {
  events: ContractEvent[]
  cursor: string | null // opaque cursor for pagination
}
