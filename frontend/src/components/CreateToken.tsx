import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '../context/ToastContext'
import { useStellarContext } from '../context/StellarContext'
import { useWalletContext } from '../context/WalletContext'
import { TokenForm } from './TokenForm'
import { ShareButton } from './ShareButton'
import { CopyButton } from './CopyButton'
import { STELLAR_CONFIG } from '../config/stellar'
import ErrorBoundary from './ErrorBoundary'

interface DeployedToken {
  address: string
  name: string
  symbol: string
}

export const CreateToken: React.FC = () => {
  const { t } = useTranslation()
  const { addToast } = useToast()
  const { stellarService } = useStellarContext()
  const { refreshBalance } = useWalletContext()

  const [isDeploying, setIsDeploying] = useState(false)
  const [deployedToken, setDeployedToken] = useState<DeployedToken | null>(null)

  const handleTokenFormSubmit = async (params: {
    name: string
    symbol: string
    decimals: number
    initialSupply: string
  }) => {
    setIsDeploying(true)
    try {
      const deployParams = {
        ...params,
        salt: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
        tokenWasmHash: STELLAR_CONFIG.tokenWasmHash || '',
        feePayment: '100000',
      }

      const result = await stellarService.deployToken(deployParams)

      if (result.success) {
        setDeployedToken({
          address: result.tokenAddress,
          name: params.name,
          symbol: params.symbol,
        })
        addToast(t('tokenForm.deploySuccess'), 'success')
        await refreshBalance()
      } else {
        addToast(t('tokenForm.deployFailed'), 'error')
      }
    } catch (error) {
      console.error('Deployment error:', error)
      addToast(
        error instanceof Error ? error.message : t('tokenForm.deployError'),
        'error',
      )
    } finally {
      setIsDeploying(false)
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
          {t('createToken.title')}
        </h2>
        <p className="mt-1 sm:mt-2 text-sm text-gray-600 dark:text-gray-400">
          {t('createToken.description')}
        </p>
      </div>

      {deployedToken && (
        <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800 p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-start gap-3">
            <span className="text-2xl shrink-0" aria-hidden="true">
              🎉
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-green-800 dark:text-green-300 text-sm sm:text-base">
                {deployedToken.name} (${deployedToken.symbol}) {t('tokenForm.deployedSuccessfully')}
              </p>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-2">
                <p className="text-xs sm:text-sm text-green-700 dark:text-green-400 font-mono break-all">
                  {deployedToken.address}
                </p>
                <CopyButton value={deployedToken.address} ariaLabel="Copy token address" />
              </div>
              <div className="mt-3">
                <ShareButton
                  tokenAddress={deployedToken.address}
                  tokenName={deployedToken.name}
                  tokenSymbol={deployedToken.symbol}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 shadow-sm">
        <ErrorBoundary>
          <TokenForm
            onSubmit={handleTokenFormSubmit}
            isLoading={isDeploying}
            estimatedFee="0.01"
          />
        </ErrorBoundary>
      </div>
    </div>
  )
}
