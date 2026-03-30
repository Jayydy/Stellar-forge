import { useTranslation } from 'react-i18next'
import { useToast } from '../context/ToastContext'
import { useStellarContext } from '../context/StellarContext'
import { useWalletContext } from '../context/WalletContext'
import { TokenForm } from './TokenForm'
import { STELLAR_CONFIG } from '../config/stellar'

export const Home: React.FC = () => {
  const { t } = useTranslation()
  const { addToast } = useToast()
  const { stellarService } = useStellarContext()
  const { refreshBalance } = useWalletContext()

  const handleSubmit = async (params: {
    name: string
    symbol: string
    decimals: number
    initialSupply: string
  }) => {
    const result = await stellarService.deployToken({
      ...params,
      salt: Math.random().toString(36).slice(2, 15),
      tokenWasmHash: STELLAR_CONFIG.tokenWasmHash || '',
      feePayment: '100000',
    })

    if (result.success) {
      addToast(t('tokenForm.deploySuccess'), 'success')
      await refreshBalance()
    } else {
      addToast(t('tokenForm.deployFailed'), 'error')
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
          {t('home.welcome')}
        </h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{t('home.description')}</p>
      </div>
      <TokenForm onSubmit={handleSubmit} />
    </div>
  )
}
