// Type definitions for Freighter API
declare module '@stellar/freighter-api' {
  export interface FreighterError {
    error?: string
  }

  export interface IsConnectedResponse extends FreighterError {
    isConnected: boolean
  }

  export interface IsAllowedResponse extends FreighterError {
    isAllowed: boolean
  }

  export interface RequestAccessResponse extends FreighterError {
    address: string
  }

  export interface GetAddressResponse extends FreighterError {
    address: string
  }

  export interface GetNetworkResponse extends FreighterError {
    network: string
    networkPassphrase: string
  }

  export interface GetNetworkDetailsResponse extends FreighterError {
    network: string
    networkUrl: string
    networkPassphrase: string
    sorobanRpcUrl?: string
  }

  export interface SignTransactionResponse extends FreighterError {
    signedTxXdr: string
    signerAddress: string
  }

  export interface SignAuthEntryResponse extends FreighterError {
    signedAuthEntry: string | null
    signerAddress: string
  }

  export interface SignMessageResponse extends FreighterError {
    signedMessage: string | null
    signerAddress: string
  }

  export interface AddTokenResponse extends FreighterError {
    contractId: string
  }

  export interface SignTransactionOptions {
    network?: string
    networkPassphrase?: string
    address?: string
  }

  export interface SignAuthEntryOptions {
    address: string
  }

  export interface SignMessageOptions {
    address: string
  }

  export interface AddTokenOptions {
    contractId: string
    networkPassphrase?: string
  }

  export function isConnected(): Promise<IsConnectedResponse>
  export function isAllowed(): Promise<IsAllowedResponse>
  export function setAllowed(): Promise<IsAllowedResponse>
  export function requestAccess(): Promise<RequestAccessResponse>
  export function getAddress(): Promise<GetAddressResponse>
  export function getNetwork(): Promise<GetNetworkResponse>
  export function getNetworkDetails(): Promise<GetNetworkDetailsResponse>
  export function signTransaction(
    xdr: string,
    opts?: SignTransactionOptions,
  ): Promise<SignTransactionResponse>
  export function signAuthEntry(
    authEntryXdr: string,
    opts: SignAuthEntryOptions,
  ): Promise<SignAuthEntryResponse>
  export function signMessage(
    message: string,
    opts: SignMessageOptions,
  ): Promise<SignMessageResponse>
  export function addToken(opts: AddTokenOptions): Promise<AddTokenResponse>

  export class WatchWalletChanges {
    constructor(timeout?: number)
    watch(
      callback: (result: { address: string; network: string; networkPassphrase: string }) => void,
    ): void
    stop(): void
  }

  const freighterApi: {
    isConnected: typeof isConnected
    isAllowed: typeof isAllowed
    setAllowed: typeof setAllowed
    requestAccess: typeof requestAccess
    getAddress: typeof getAddress
    getNetwork: typeof getNetwork
    getNetworkDetails: typeof getNetworkDetails
    signTransaction: typeof signTransaction
    signAuthEntry: typeof signAuthEntry
    signMessage: typeof signMessage
    addToken: typeof addToken
    WatchWalletChanges: typeof WatchWalletChanges
  }

  export default freighterApi
}

// Extend Window interface to include Freighter
declare global {
  interface Window {
    freighter?: unknown
  }
}
