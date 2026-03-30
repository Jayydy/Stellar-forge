import { useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from './UI/Input'
import { Button } from './UI/Button'
import { useToast } from '../context/ToastContext'
import { useWalletContext } from '../context/WalletContext'
import { useNetwork } from '../context/NetworkContext'
import { validateTokenParams } from '../utils/validation'
import { formatXLM } from '../utils/formatting'

interface TokenFormProps {
  onSubmit: (params: {
    name: string
    symbol: string
    decimals: number
    initialSupply: string
  }) => Promise<void>
  isLoading?: boolean
  estimatedFee?: string
}

interface FormErrors {
  name?: string
  symbol?: string
  decimals?: string
  initialSupply?: string
}

export const TokenForm: React.FC<TokenFormProps> = ({
  onSubmit,
  isLoading = false,
  estimatedFee = '0.01',
}) => {
  const { t } = useTranslation()
  const { addToast } = useToast()
  const { wallet } = useWalletContext()
  const { network } = useNetwork()

  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    decimals: 7,
    initialSupply: '',
  })

  const [errors, setErrors] = useState<FormErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const validateField = useCallback(
    (field: string, value: unknown) => {
      const validation = validateTokenParams({
        ...formData,
        [field]: value,
      })

      return validation.errors[field] || ''
    },
    [formData],
  )

  const handleChange = (field: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }))

    if (touched[field]) {
      const error = validateField(field, value)
      setErrors((prev) => ({
        ...prev,
        [field]: error,
      }))
    }
  }

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }))
    const error = validateField(field, formData[field as keyof typeof formData])
    setErrors((prev) => ({
      ...prev,
      [field]: error,
    }))
  }

  const isFormValid = () => {
    const validation = validateTokenParams(formData)
    return validation.valid && wallet.isConnected
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!wallet.isConnected) {
      addToast(t('tokenForm.walletNotConnected'), 'error')
      return
    }

    const validation = validateTokenParams(formData)
    if (!validation.valid) {
      setErrors(validation.errors)
      setTouched({
        name: true,
        symbol: true,
        decimals: true,
        initialSupply: true,
      })
      addToast(t('tokenForm.validationFailed'), 'error')
      return
    }

    try {
      await onSubmit(formData)
    } catch (error) {
      console.error('Form submission error:', error)
      addToast(
        error instanceof Error ? error.message : t('tokenForm.submitError'),
        'error',
      )
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        {/* Token Name */}
        <div>
          <Input
            label={t('tokenForm.nameLabel')}
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            onBlur={() => handleBlur('name')}
            placeholder={t('tokenForm.namePlaceholder')}
            error={touched.name ? errors.name : undefined}
            required
          />
          {touched.name && errors.name && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
          )}
        </div>

        {/* Token Symbol */}
        <div>
          <Input
            label={t('tokenForm.symbolLabel')}
            value={formData.symbol}
            onChange={(e) => handleChange('symbol', e.target.value.toUpperCase())}
            onBlur={() => handleBlur('symbol')}
            placeholder={t('tokenForm.symbolPlaceholder')}
            error={touched.symbol ? errors.symbol : undefined}
            required
          />
          {touched.symbol && errors.symbol && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.symbol}</p>
          )}
        </div>

        {/* Decimals */}
        <div>
          <Input
            label={t('tokenForm.decimalsLabel')}
            type="number"
            value={formData.decimals}
            onChange={(e) => handleChange('decimals', parseInt(e.target.value))}
            onBlur={() => handleBlur('decimals')}
            placeholder="7"
            min="0"
            max="18"
            error={touched.decimals ? errors.decimals : undefined}
            required
          />
          {touched.decimals && errors.decimals && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.decimals}</p>
          )}
        </div>

        {/* Initial Supply */}
        <div>
          <Input
            label={t('tokenForm.initialSupplyLabel')}
            value={formData.initialSupply}
            onChange={(e) => handleChange('initialSupply', e.target.value)}
            onBlur={() => handleBlur('initialSupply')}
            placeholder={t('tokenForm.initialSupplyPlaceholder')}
            error={touched.initialSupply ? errors.initialSupply : undefined}
            required
          />
          {touched.initialSupply && errors.initialSupply && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              {errors.initialSupply}
            </p>
          )}
        </div>
      </div>

      {/* Fee Display */}
      <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-blue-900 dark:text-blue-300">
              {t('tokenForm.estimatedFee')}
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
              {t('tokenForm.feeDescription')}
            </p>
          </div>
          <p className="text-lg font-semibold text-blue-900 dark:text-blue-300">
            {formatXLM(estimatedFee)} XLM
          </p>
        </div>
      </div>

      {/* Network Info */}
      <div className="text-sm text-gray-600 dark:text-gray-400">
        <p>
          {t('tokenForm.network')}: <span className="font-medium capitalize">{network}</span>
        </p>
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={!isFormValid() || isLoading}
        className="w-full"
      >
        {isLoading ? t('tokenForm.deploying') : t('tokenForm.deploy')}
      </Button>

      {!wallet.isConnected && (
        <p className="text-sm text-amber-600 dark:text-amber-400 text-center">
          {t('tokenForm.connectWalletFirst')}
        </p>
      )}
    </form>
  )
}
