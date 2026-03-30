import {
  isConnected,
  getAddress,
  requestAccess,
  signTransaction as freighterSignTransaction,
  getNetworkDetails,
} from '@stellar/freighter-api'
import { STELLAR_CONFIG } from '../config/stellar'

const FREIGHTER_INSTALL_URL = 'https://www.freighter.app/'
const STORAGE_KEY = 'stellarforge_wallet_address'

export class WalletService {
  private connectedAddress: string | null = null

  constructor() {
    // Restore persisted address on init
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) this.connectedAddress = stored
    } catch { /* ignore */ }
  }

  /**
   * Synchronous check: Freighter injects window.freighter when installed.
   * Used for immediate UI decisions (show install prompt vs connect button).
   */
  isInstalled(): boolean {
    return typeof window !== 'undefined' && typeof window.freighter !== 'undefined'
  }

  /**
   * Async check using the Freighter API — more reliable than window check.
   */
  async isInstalledAsync(): Promise<boolean> {
    try {
      const result = await isConnected()
      return !result.error
    } catch {
      return false
    }
  }

  async connect(): Promise<string> {
    const installed = await this.isInstalledAsync()
    if (!installed) {
      throw new Error(
        `Freighter wallet is not installed. Please install it from ${FREIGHTER_INSTALL_URL}`
      )
    }

    // Verify the user is on the correct network before connecting
    await this.assertCorrectNetwork()

    try {
      const accessObj = await requestAccess()

      if (accessObj.error) {
        throw new Error(accessObj.error)
      }

      if (!accessObj.address) {
        throw new Error(
          `Freighter wallet is not available. Please install or unlock it from ${FREIGHTER_INSTALL_URL}`
        )
      }

      this.connectedAddress = accessObj.address
      this.persistAddress(accessObj.address)
      return accessObj.address
    } catch (error) {
      if (error instanceof Error) throw error
      throw new Error('Failed to connect to Freighter wallet')
    }
  }

  disconnect(): void {
    this.connectedAddress = null
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch { /* ignore */ }
  }

  async signTransaction(xdr: string): Promise<string> {
    const installed = await this.isInstalledAsync()
    if (!installed) {
      throw new Error('Freighter wallet is not installed')
    }

    if (!this.connectedAddress) {
      throw new Error('Wallet not connected. Please connect first.')
    }

    await this.assertCorrectNetwork()

    try {
      const network = this.getActiveNetwork()
      const networkPassphrase = STELLAR_CONFIG[network].networkPassphrase

      const signedResult = await freighterSignTransaction(xdr, {
        networkPassphrase,
        address: this.connectedAddress,
      })

      if (signedResult.error) {
        throw new Error(signedResult.error)
      }

      return signedResult.signedTxXdr
    } catch (error) {
      if (error instanceof Error) {
        if (
          error.message.toLowerCase().includes('network') ||
          error.message.toLowerCase().includes('passphrase')
        ) {
          const network = this.getActiveNetwork()
          throw new Error(
            `Network mismatch: Please switch Freighter to ${network}`
          )
        }
        throw new Error(`Failed to sign transaction: ${error.message}`)
      }
      throw new Error('Failed to sign transaction')
    }
  }

  async getBalance(address: string): Promise<string> {
    try {
      const network = this.getActiveNetwork()
      const horizonUrl = STELLAR_CONFIG[network].horizonUrl

      const response = await fetch(`${horizonUrl}/accounts/${address}`)

      if (!response.ok) {
        if (response.status === 404) {
          // Account not yet funded on the network
          return '0'
        }
        throw new Error(`Failed to fetch account: ${response.statusText}`)
      }

      const accountData = await response.json()

      const nativeBalance = accountData.balances?.find(
        (b: { asset_type: string; balance: string }) => b.asset_type === 'native'
      )

      return nativeBalance ? nativeBalance.balance : '0'
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to get balance: ${error.message}`)
      }
      throw new Error('Failed to get balance')
    }
  }

  async checkExistingConnection(): Promise<string | null> {
    const installed = await this.isInstalledAsync()
    if (!installed) return null

    try {
      const connectedResult = await isConnected()
      if (connectedResult.error || !connectedResult.isConnected) {
        this.clearPersistedAddress()
        return null
      }

      const addressObj = await getAddress()
      if (addressObj.error || !addressObj.address) {
        this.clearPersistedAddress()
        return null
      }

      this.connectedAddress = addressObj.address
      this.persistAddress(addressObj.address)
      return addressObj.address
    } catch (error) {
      console.error('Failed to check existing connection:', error)
    }

    return null
  }

  getConnectedAddress(): string | null {
    return this.connectedAddress
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private getActiveNetwork(): 'testnet' | 'mainnet' {
    try {
      const stored = localStorage.getItem('stellarforge_network')
      if (stored === 'mainnet' || stored === 'testnet') return stored
    } catch { /* ignore */ }
    return STELLAR_CONFIG.network as 'testnet' | 'mainnet'
  }

  /**
   * Checks that Freighter is set to the same network the app expects.
   * Throws a descriptive error on mismatch so the UI can surface it.
   */
  private async assertCorrectNetwork(): Promise<void> {
    try {
      const details = await getNetworkDetails()
      if (details.error) return // can't determine — let it proceed

      const expected = this.getActiveNetwork()
      const expectedPassphrase = STELLAR_CONFIG[expected].networkPassphrase

      if (details.networkPassphrase !== expectedPassphrase) {
        const label = expected === 'mainnet' ? 'Mainnet' : 'Testnet'
        throw new Error(
          `Network mismatch: Your Freighter wallet is on "${details.network}". ` +
          `Please switch it to Stellar ${label} and try again.`
        )
      }
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Network mismatch')) {
        throw error
      }
      // If we can't reach Freighter for network details, let the main call fail naturally
    }
  }

  private persistAddress(address: string): void {
    try {
      localStorage.setItem(STORAGE_KEY, address)
    } catch { /* ignore */ }
  }

  private clearPersistedAddress(): void {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch { /* ignore */ }
  }
}

export const walletService = new WalletService()
