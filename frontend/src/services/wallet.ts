import {
  isConnected,
  getAddress,
  signTransaction as freighterSignTransaction,
  getNetworkDetails,
} from '@stellar/freighter-api'
import { NETWORK_CONFIGS } from '../config/stellar'

interface HorizonBalance {
  asset_type: string
  balance: string
}

interface HorizonAccountResponse {
  balances: HorizonBalance[]
}

const FREIGHTER_INSTALL_URL = 'https://www.freighter.app/'
const STORAGE_KEY = 'stellarforge_wallet_address'

export class WalletService {
  private connectedAddress: string | null = null

  async isInstalled(): Promise<boolean> {
    try {
      const result = await isConnected()
      return !!result.isConnected
    } catch {
      return false
    }
  }

  async connect(): Promise<string> {
    if (!(await this.isInstalled())) {
      throw new Error(
        `Freighter wallet is not installed. Please install it from ${FREIGHTER_INSTALL_URL}`,
      )
    }

    // Verify the user is on the correct network before connecting
    await this.assertCorrectNetwork()

    try {
      // Use getAddress as it's the more modern version in @stellar/freighter-api
      // but fulfills the role of getPublicKey()
      const addressObj = await getAddress()

      if (addressObj.error) {
        throw new Error(addressObj.error)
      }

      if (!addressObj.address) {
        throw new Error(
          `Freighter wallet is not available. Please install or unlock it from ${FREIGHTER_INSTALL_URL}`,
        )
      }

      this.connectedAddress = addressObj.address
      return addressObj.address
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

  async signTransaction(xdr: string, network: 'testnet' | 'mainnet'): Promise<string> {
    if (!(await this.isInstalled())) {
      throw new Error('Freighter wallet is not installed')
    }

    if (!this.connectedAddress) {
      throw new Error('Wallet not connected. Please connect first.')
    }

    await this.assertCorrectNetwork()

    try {
      const networkPassphrase = NETWORK_CONFIGS[network].networkPassphrase

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
        // Check for network mismatch
        if (error.message.includes('network')) {
          throw new Error(`Network mismatch: Please switch Freighter to ${network}`)
        }
        throw new Error(`Failed to sign transaction: ${error.message}`)
      }
      throw new Error('Failed to sign transaction')
    }
  }

  async getBalance(address: string, network: 'testnet' | 'mainnet'): Promise<string> {
    try {
      const horizonUrl = NETWORK_CONFIGS[network].horizonUrl

      const response = await fetch(`${horizonUrl}/accounts/${address}`)

      if (!response.ok) {
        if (response.status === 404) {
          // Account not yet funded on the network
          return '0'
        }
        throw new Error(`Failed to fetch account: ${response.statusText}`)
      }

      const accountData: HorizonAccountResponse = await response.json()

      // Find native XLM balance
      const nativeBalance = accountData.balances.find((balance) => balance.asset_type === 'native')

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
    } catch {
      // Silent — caller receives null and can prompt manual connect
    }

    return null
  }

  getConnectedAddress(): string | null {
    return this.connectedAddress
  }
}

export const walletService = new WalletService()
