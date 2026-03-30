import { useState, useEffect, useCallback } from 'react'
import { Input, Button, ConfirmModal } from './UI'
import { useDebounce } from '../hooks/useDebounce'
import { useTokenBalance } from '../hooks/useTokenBalance'
import { useTransaction } from '../hooks/useTransaction'
import { useWalletContext } from '../context/WalletContext'
import { useTos } from '../context/TosContext'
import { useStellarContext } from '../context/StellarContext'
import { useToast } from '../context/ToastContext'
import type { TokenInfo } from '../types'

const ESTIMATED_FEE_DISPLAY = '0.01 XLM'

interface BurnFormProps {
  tokenAddress?: string
  onSuccess?: () => void
}

export const BurnForm: React.FC<BurnFormProps> = ({
  tokenAddress: initialAddress = '',
  onSuccess,
}) => {
  const { stellarService } = useStellarContext()
  const { wallet } = useWalletContext()
  const { addToast } = useToast()
  const { requireTos } = useTos()
  const { hasSufficientBalance, shortfall, isTestnet } = useBalanceCheck(ESTIMATED_FEE_XLM)

  const [tokenAddress, setTokenAddress] = useState(initialAddress)
  const [amount, setAmount] = useState('')
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null)
  const [pending, setPending] = useState(false)

  const debouncedAddress = useDebounce(tokenAddress, 300)

  const { balance, refresh: refreshBalance } = useTokenBalance(
    debouncedAddress,
    wallet.address ?? '',
  )

  const burnBuilder = useCallback(
    () => stellarService.burnTokens({ tokenAddress, amount }),
    [stellarService, tokenAddress, amount],
  )

  const { execute: executeBurn, status: txStatus } = useTransaction(burnBuilder)
  const isSubmitting = txStatus === 'simulating' || txStatus === 'signing' || txStatus === 'submitting' || txStatus === 'polling'

  useEffect(() => {
    if (!debouncedAddress) { setTokenInfo(null); return }
    stellarService
      .getTokenInfo(debouncedAddress)
      .then(setTokenInfo)
      .catch(() => setTokenInfo(null))
  }, [debouncedAddress, stellarService])

  const amountExceedsBalance =
    !!amount && !!balance && BigInt(balance) > 0n && BigInt(amount) > BigInt(balance)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!wallet.isConnected) { addToast('Connect your wallet first', 'error'); return }
    if (amountExceedsBalance) return
    requireTos(() => setPending(true))
  }

  const handleConfirm = async () => {
    setPending(false)
    try {
      await executeBurn()
      addToast('Tokens burned successfully', 'success')
      setAmount('')
      refreshBalance()
      onSuccess?.()
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Burn failed', 'error')
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Token Address"
          value={tokenAddress}
          onChange={(e) => setTokenAddress(e.target.value)}
          placeholder="C..."
          required
          disabled={!!initialAddress}
        />
        {tokenInfo && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Token: {tokenInfo.name} ({tokenInfo.symbol})
          </p>
        )}
        {wallet.address && debouncedAddress && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Your balance: {balance}
          </p>
        )}
        <Input
          label="Amount"
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
          min="1"
          required
        />
        {amountExceedsBalance && (
          <p className="text-sm text-red-500" role="alert">
            Amount exceeds your balance of {balance}
          </p>
        )}
        <Button
          type="submit"
          variant="secondary"
          loading={isSubmitting}
          disabled={isSubmitting || amountExceedsBalance || !hasSufficientBalance}
          className="w-full sm:w-auto"
        >
          Burn Tokens
        </Button>
        {!hasSufficientBalance && (
          <InsufficientBalanceWarning shortfall={shortfall} isTestnet={isTestnet} />
        )}
      </form>

      <ConfirmModal
        isOpen={pending}
        title="Confirm Burn"
        description="This will permanently destroy the specified token amount. This action cannot be undone."
        details={[
          {
            label: 'Token',
            value: tokenInfo ? `${tokenInfo.name} (${tokenInfo.symbol})` : tokenAddress,
          },
          { label: 'Amount to Burn', value: amount },
          { label: 'Your Balance', value: balance },
          { label: 'Estimated Fee', value: ESTIMATED_FEE_DISPLAY },
        ]}
        onConfirm={handleConfirm}
        onCancel={() => setPending(false)}
        confirmLabel="Burn Tokens"
      />
    </>
  )
}
