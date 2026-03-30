import { useState, useEffect, useCallback, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { Input, Button, ConfirmModal, InsufficientBalanceWarning, Select } from './UI'
import { useDebounce } from '../hooks/useDebounce'
import { useTokenBalance } from '../hooks/useTokenBalance'
import { useTransaction } from '../hooks/useTransaction'
import { useWalletContext } from '../context/WalletContext'
import { useTos } from '../context/TosContext'
import { useStellarContext } from '../context/StellarContext'
import { useToast } from '../context/ToastContext'
import { useNetwork } from '../context/NetworkContext'
import { useBalanceCheck } from '../hooks/useBalanceCheck'
import { useTokenDashboard } from '../hooks/useTokenDashboard'
import { isValidContractAddress } from '../utils/validation'
import { stellarExplorerUrl } from '../utils/formatting'

const ESTIMATED_FEE_DISPLAY = '0.01 XLM'
const ESTIMATED_FEE_XLM = 0.01
const MANUAL_VALUE = '__manual__'

interface BurnFormData {
  tokenSelect: string
  tokenManual: string
  amount: string
}

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
  const { network } = useNetwork()
  const { addToast } = useToast()
  const { requireTos } = useTos()
  const { hasSufficientBalance, shortfall, isTestnet } = useBalanceCheck(ESTIMATED_FEE_XLM)
  const { rows: myTokens } = useTokenDashboard()
  const mountedRef = useRef(true)

  const [pending, setPending] = useState(false)
  const [txHash, setTxHash] = useState<string | null>(null)

  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<BurnFormData>({
    defaultValues: {
      tokenSelect: initialAddress || (myTokens.length > 0 ? myTokens[0].address : MANUAL_VALUE),
      tokenManual: initialAddress,
      amount: '',
    },
  })

  const tokenSelect = watch('tokenSelect')
  const tokenManual = watch('tokenManual')
  const amount = watch('amount')

  const resolvedTokenAddress = tokenSelect === MANUAL_VALUE ? tokenManual : tokenSelect
  const selectedToken = myTokens.find((t) => t.address === tokenSelect)

  const debouncedAddress = useDebounce(resolvedTokenAddress, 300)
  const { balance, isLoading: balanceLoading, refresh: refreshBalance } = useTokenBalance(
    debouncedAddress,
    wallet.address ?? '',
  )

  // Validate amount against balance using BigInt (token amounts can be large)
  const amountExceedsBalance =
    !!amount &&
    !!balance &&
    balance !== '0' &&
    (() => {
      try { return BigInt(amount) > BigInt(balance) } catch { return false }
    })()

  const burnBuilder = useCallback(
    () => stellarService.burnTokens({ tokenAddress: resolvedTokenAddress, amount }),
    [stellarService, resolvedTokenAddress, amount],
  )

  const { execute: executeBurn, status: txStatus } = useTransaction(burnBuilder)
  const isSubmitting =
    txStatus === 'simulating' || txStatus === 'signing' || txStatus === 'submitting' || txStatus === 'polling'

  const onValid = () => {
    if (!wallet.isConnected) { addToast('Connect your wallet first', 'error'); return }
    requireTos(() => setPending(true))
  }

  const handleConfirm = async () => {
    setPending(false)
    try {
      const hash = await executeBurn()
      if (mountedRef.current) {
        setTxHash(hash)
        addToast('Tokens burned successfully', 'success')
        refreshBalance()
        onSuccess?.()
      }
    } catch (err) {
      if (mountedRef.current) {
        addToast(err instanceof Error ? err.message : 'Burn failed', 'error')
      }
    }
  }

  const tokenOptions = [
    ...myTokens.map((t) => ({ value: t.address, label: `${t.name} (${t.symbol})` })),
    { value: MANUAL_VALUE, label: 'Manual input…' },
  ]

  return (
    <>
      <form onSubmit={handleSubmit(onValid)} className="space-y-4" noValidate>

        {/* Danger zone header */}
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3">
          <p className="text-sm font-medium text-red-700 dark:text-red-400 flex items-center gap-2">
            <span aria-hidden="true">🔥</span>
            Burning tokens is <strong>permanent and irreversible</strong>. Burned tokens cannot be recovered.
          </p>
        </div>

        {/* Token selector */}
        <Select
          label="Token"
          options={tokenOptions.length > 1 ? tokenOptions : [{ value: MANUAL_VALUE, label: 'Manual input…' }]}
          error={errors.tokenSelect?.message}
          required
          disabled={!!initialAddress}
          {...register('tokenSelect', { required: 'Select a token' })}
          value={tokenSelect}
          onChange={(e) => setValue('tokenSelect', e.target.value)}
        />

        {/* Manual token address */}
        {tokenSelect === MANUAL_VALUE && (
          <Input
            label="Token Address"
            placeholder="C..."
            required
            disabled={!!initialAddress}
            error={errors.tokenManual?.message}
            {...register('tokenManual', {
              required: 'Token address is required',
              validate: (v) => isValidContractAddress(v.trim()) || 'Enter a valid Soroban contract address',
            })}
          />
        )}

        {/* Balance display */}
        {wallet.address && debouncedAddress && (
          <div className="flex items-center justify-between rounded-md bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-3 py-2 text-sm">
            <span className="text-gray-500 dark:text-gray-400">Your balance</span>
            <span className="font-mono font-medium text-gray-900 dark:text-gray-100">
              {balanceLoading ? (
                <span className="animate-pulse text-gray-400">Loading…</span>
              ) : (
                <>
                  {balance}
                  {selectedToken && (
                    <span className="ml-1 text-gray-400 text-xs">{selectedToken.symbol}</span>
                  )}
                </>
              )}
            </span>
          </div>
        )}

        {/* Amount + Max button */}
        <div>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Input
                label="Amount to Burn"
                type="number"
                placeholder="0"
                required
                error={errors.amount?.message}
                {...register('amount', {
                  required: 'Amount is required',
                  validate: (v) => {
                    try { return BigInt(v) > 0n || 'Amount must be greater than 0' }
                    catch { return 'Enter a valid amount' }
                  },
                })}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!balance || balance === '0' || balanceLoading}
              onClick={() => setValue('amount', balance, { shouldValidate: true })}
              className="mb-0.5 border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              Max
            </Button>
          </div>
          {amountExceedsBalance && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400" role="alert">
              Amount exceeds your balance of {balance}
            </p>
          )}
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400">
          Estimated fee: <span className="font-medium">{ESTIMATED_FEE_DISPLAY}</span>
        </p>

        <Button
          type="submit"
          loading={isSubmitting}
          disabled={isSubmitting || amountExceedsBalance || !hasSufficientBalance}
          className="w-full sm:w-auto bg-red-600 hover:bg-red-700 focus:ring-red-500 text-white disabled:opacity-50"
        >
          {isSubmitting ? 'Processing…' : '🔥 Burn Tokens'}
        </Button>

        {!hasSufficientBalance && (
          <InsufficientBalanceWarning shortfall={shortfall} isTestnet={isTestnet} />
        )}
      </form>

      {/* Success feedback */}
      {txHash && (
        <div
          role="status"
          className="mt-4 p-3 rounded-lg bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 text-sm text-green-800 dark:text-green-300 flex flex-col gap-1"
        >
          <span className="font-medium">✓ Tokens burned successfully</span>
          <a
            href={stellarExplorerUrl('tx', txHash, network)}
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-green-700 dark:text-green-400 text-xs"
          >
            View on Stellar Explorer →
          </a>
        </div>
      )}

      <ConfirmModal
        isOpen={pending}
        title="⚠️ Confirm Burn"
        description="This action is irreversible. These tokens will be permanently destroyed and cannot be recovered."
        details={[
          {
            label: 'Token',
            value: selectedToken
              ? `${selectedToken.name} (${selectedToken.symbol})`
              : resolvedTokenAddress,
          },
          { label: 'Amount to Burn', value: amount },
          { label: 'Your Balance', value: balance },
          { label: 'Estimated Fee', value: ESTIMATED_FEE_DISPLAY },
        ]}
        onConfirm={handleConfirm}
        onCancel={() => setPending(false)}
        confirmLabel="Yes, Burn Permanently"
      />
    </>
  )
}
