import { useFriendbot } from '../../hooks/useFriendbot'
import { useWalletContext } from '../../context/WalletContext'
import { useToast } from '../../context/ToastContext'

interface InsufficientBalanceWarningProps {
  shortfall: string
  isTestnet: boolean
}

export const InsufficientBalanceWarning: React.FC<InsufficientBalanceWarningProps> = ({
  shortfall,
  isTestnet,
}) => {
  const { wallet, refreshBalance } = useWalletContext()
  const { addToast } = useToast()
  const { fund, isLoading } = useFriendbot(async () => {
    await refreshBalance()
    addToast('Testnet XLM funded successfully!', 'success')
  })

  const handleFund = async () => {
    try {
      await fund(wallet.address!)
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Friendbot is currently unavailable', 'error')
    }
  }

  return (
    <div
      role="alert"
      className="rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 px-4 py-3 text-sm text-amber-800 dark:text-amber-300"
    >
      <p className="font-medium">Insufficient balance</p>
      <p className="mt-0.5">
        You need <span className="font-semibold">{shortfall} more XLM</span> to cover the fee.
      </p>
      {isTestnet && (
        <button
          type="button"
          onClick={handleFund}
          disabled={isLoading}
          className="mt-2 underline font-medium disabled:opacity-50"
        >
          {isLoading ? 'Funding…' : '🚰 Get testnet XLM from Friendbot'}
        </button>
      )}
    </div>
  )
}
