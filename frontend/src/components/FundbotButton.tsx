import { useNetwork } from '../context/NetworkContext'
import { useWalletContext } from '../context/WalletContext'
import { useToast } from '../context/ToastContext'
import { useFriendbot } from '../hooks/useFriendbot'
import { Button } from './UI/Button'

export const FundbotButton: React.FC = () => {
  const { network } = useNetwork()
  const { wallet, refreshBalance } = useWalletContext()
  const { addToast } = useToast()

  const { fund, isLoading } = useFriendbot(async () => {
    await refreshBalance()
    addToast('Testnet XLM funded successfully!', 'success')
  })

  if (network !== 'testnet' || !wallet.isConnected || !wallet.address) return null

  const handleClick = async () => {
    try {
      await fund(wallet.address!)
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Friendbot is currently unavailable', 'error')
    }
  }

  return (
    <Button
      onClick={handleClick}
      loading={isLoading}
      variant="outline"
      size="sm"
      aria-label="Fund wallet with testnet XLM via Friendbot"
    >
      {isLoading ? 'Funding...' : '🚰 Get Testnet XLM'}
    </Button>
  )
}
