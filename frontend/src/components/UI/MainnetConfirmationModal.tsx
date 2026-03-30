import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { TokenDeployParams } from '../../types'
import { Button } from './Button'
import { Input } from './Input'
import { Modal } from './Modal'

interface MainnetConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  tokenParams: TokenDeployParams
}

export const MainnetConfirmationModal: React.FC<MainnetConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  tokenParams,
}) => {
  const { t } = useTranslation()
  const [confirmSymbol, setConfirmSymbol] = useState('')
  const isConfirmed = confirmSymbol === tokenParams.symbol

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('mainnetModal.title')}
      titleId="mainnet-modal-title"
      className="max-w-2xl"
      footer={
        <>
          <Button onClick={onClose} variant="secondary">
            {t('mainnetModal.cancel')}
          </Button>
          <Button onClick={() => isConfirmed && onConfirm()} disabled={!isConfirmed}>
            {t('mainnetModal.deploy')}
          </Button>
        </>
      }
    >
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <p className="text-red-800 font-semibold">{t('mainnetModal.warning')}</p>
      </div>

      <div className="space-y-4 mb-6">
        <h3 className="text-lg font-semibold text-gray-900">{t('mainnetModal.tokenParams')}</h3>
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          {(
            [
              [t('mainnetModal.name'), tokenParams.name],
              [t('mainnetModal.symbol'), tokenParams.symbol],
              [t('mainnetModal.decimals'), String(tokenParams.decimals)],
              [t('mainnetModal.initialSupply'), String(tokenParams.initialSupply)],
              ...(tokenParams.metadata?.description
                ? [[t('mainnetModal.description'), tokenParams.metadata.description]]
                : []),
              ...(tokenParams.metadata?.image
                ? [[t('mainnetModal.image'), tokenParams.metadata.image.name]]
                : []),
            ] as [string, string][]
          ).map(([label, value]) => (
            <div key={label} className="flex justify-between">
              <span className="text-gray-600">{label}:</span>
              <span className="font-medium text-gray-900">{value}</span>
            </div>
          ))}
        </div>
      </div>

      <Input
        label={t('mainnetModal.confirmLabel', { symbol: tokenParams.symbol })}
        value={confirmSymbol}
        onChange={(e) => setConfirmSymbol(e.target.value)}
        placeholder={tokenParams.symbol}
        aria-describedby="confirm-help"
      />
      <p id="confirm-help" className="text-sm text-gray-500 mt-1">
        {t('mainnetModal.confirmHelp')}
      </p>
    </Modal>
  )
}
