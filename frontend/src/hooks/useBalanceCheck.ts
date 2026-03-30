import { useWalletContext } from '../context/WalletContext'
import { useNetwork } from '../context/NetworkContext'

export interface BalanceCheckResult {
  /** True when the connected wallet has enough XLM to cover the fee */
  hasSufficientBalance: boolean
  /** How much more XLM is needed, formatted to 7 dp. Empty string when balance is sufficient. */
  shortfall: string
  isTestnet: boolean
}

/**
 * Compare the wallet's current XLM balance against a required fee (in XLM).
 * Returns whether the balance is sufficient and the shortfall if not.
 */
export function useBalanceCheck(requiredXlm: number): BalanceCheckResult {
  const { wallet } = useWalletContext()
  const { network } = useNetwork()

  const balance = parseFloat(wallet.balance ?? '0')
  const hasSufficientBalance = !wallet.isConnected || balance >= requiredXlm
  const shortfall = hasSufficientBalance
    ? ''
    : (requiredXlm - balance).toFixed(7).replace(/\.?0+$/, '')

  return { hasSufficientBalance, shortfall, isTestnet: network === 'testnet' }
}
