import { useState, useEffect, useCallback, useRef } from 'react'
import { Input, Button, ConfirmModal } from './UI'
import { useWalletContext } from '../context/WalletContext'
import { useStellarContext } from '../context/StellarContext'
import { useToast } from '../context/ToastContext'
import { useFactoryState } from '../hooks/useFactoryState'
import { useTransaction } from '../hooks/useTransaction'

// Stroops → display XLM (7 decimals)
function stroopsToDisplay(stroops: string): string {
  return (Number(stroops) / 1e7).toFixed(7).replace(/\.?0+$/, '')
}

// Display XLM → stroops string
function displayToStroops(xlm: string): string {
  return String(Math.round(parseFloat(xlm) * 1e7))
}

function isValidFee(value: string): boolean {
  const n = parseFloat(value)
  return !isNaN(n) && n >= 0 && isFinite(n)
}

export const AdminPanel: React.FC = () => {
  const { wallet } = useWalletContext()
  const { stellarService } = useStellarContext()
  const { addToast } = useToast()
  const { state, isLoading: stateLoading, refetch } = useFactoryState()

  const [baseFee, setBaseFee] = useState('')
  const [metadataFee, setMetadataFee] = useState('')
  const [errors, setErrors] = useState<{ baseFee?: string; metadataFee?: string }>({})
  const [showConfirm, setShowConfirm] = useState(false)

  const feesRef = useRef({ baseFee: '', metadataFee: '' })

  const feeBuilder = useCallback(
    () =>
      stellarService.updateFees({
        baseFee: feesRef.current.baseFee,
        metadataFee: feesRef.current.metadataFee,
      }),
    [stellarService],
  )

  const { execute, status: txStatus } = useTransaction(feeBuilder)
  const isPending =
    txStatus === 'simulating' ||
    txStatus === 'signing' ||
    txStatus === 'submitting' ||
    txStatus === 'polling'

  // Pre-populate form once factory state loads
  useEffect(() => {
    if (state) {
      setBaseFee(stroopsToDisplay(state.baseFee))
      setMetadataFee(stroopsToDisplay(state.metadataFee))
    }
  }, [state])

  // Authorization guard — only the factory admin may see this panel
  const isAdmin =
    !!wallet.address && !!state?.admin && wallet.address === state.admin

  if (stateLoading) {
    return (
      <div className="flex justify-center py-12" aria-live="polite" aria-busy="true">
        <span className="text-gray-500 dark:text-gray-400">Loading factory state…</span>
      </div>
    )
  }

  if (!wallet.isConnected) {
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        Connect your wallet to access the Admin Panel.
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div
        className="text-center py-12 text-red-600 dark:text-red-400 font-medium"
        role="alert"
      >
        Access denied. Only the factory admin can view this page.
      </div>
    )
  }

  function validate(): boolean {
    const next: typeof errors = {}
    if (!isValidFee(baseFee)) next.baseFee = 'Must be a non-negative number.'
    if (!isValidFee(metadataFee)) next.metadataFee = 'Must be a non-negative number.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (validate()) setShowConfirm(true)
  }

  async function handleConfirm() {
    setShowConfirm(false)
    feesRef.current = {
      baseFee: displayToStroops(baseFee),
      metadataFee: displayToStroops(metadataFee),
    }
    try {
      await execute()
      addToast('Fees updated successfully.', 'success')
      refetch()
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Transaction failed.', 'error')
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Panel</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Manage factory fees. Values are entered in XLM and stored as stroops on-chain.
      </p>

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Input
          label="Base Fee (XLM)"
          type="number"
          min="0"
          step="any"
          value={baseFee}
          onChange={(e) => setBaseFee(e.target.value)}
          error={errors.baseFee}
          required
          disabled={isPending}
        />
        <Input
          label="Metadata Fee (XLM)"
          type="number"
          min="0"
          step="any"
          value={metadataFee}
          onChange={(e) => setMetadataFee(e.target.value)}
          error={errors.metadataFee}
          required
          disabled={isPending}
        />

        <Button
          type="submit"
          variant="primary"
          loading={isPending}
          disabled={isPending}
          className="w-full"
        >
          {isPending ? 'Submitting…' : 'Submit Changes'}
        </Button>
      </form>

      <ConfirmModal
        isOpen={showConfirm}
        title="Confirm Fee Update"
        description="The following fees will be written to the contract. This action requires a signed transaction."
        details={[
          { label: 'Base Fee', value: `${baseFee} XLM` },
          { label: 'Metadata Fee', value: `${metadataFee} XLM` },
        ]}
        confirmLabel="Update Fees"
        onConfirm={handleConfirm}
        onCancel={() => setShowConfirm(false)}
      />
    </div>
  )
}
