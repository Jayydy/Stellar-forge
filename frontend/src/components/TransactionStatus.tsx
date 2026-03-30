import React from 'react'
import { useTransaction } from '../hooks/useTransaction'
import { useNetwork } from '../context/NetworkContext'
import { stellarExplorerUrl } from '../utils/formatting'
import { Spinner } from './UI/Spinner'
import { CopyButton } from './CopyButton'

export interface TransactionStatusProps {
  txHash: string
  onSuccess?: () => void
  onError?: (error: string) => void
}

export const TransactionStatus: React.FC<TransactionStatusProps> = ({
  txHash,
  onSuccess,
  onError,
}) => {
  const { status, error } = useTransaction(txHash)
  const { network } = useNetwork()

      try {
        const res = (await stellarService.getTransaction(txHash)) as {
          status?: string
          error?: string
        }
        const resStatus = res?.status?.toLowerCase() || ''

        if (resStatus === 'success' || resStatus === 'confirmed') {
          setStatus('success')
          clearInterval(intervalId)
          if (onSuccess) onSuccess()
        } else if (resStatus === 'failed' || resStatus === 'error') {
          setStatus('error')
          const errorMsg = res?.error || 'Transaction failed'
          setErrorMessage(errorMsg)
          clearInterval(intervalId)
          if (onError) onError(errorMsg)
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Transaction polling failed'
        setStatus('error')
        setErrorMessage(msg)
        clearInterval(intervalId)
        if (onError) onError(msg)
      }
    }

  React.useEffect(() => {
    if (status === 'success') onSuccess?.()
    if (status === 'failed') onError?.(error ?? 'Transaction failed')
  }, [status, error, onSuccess, onError])

  return (
    <div className="flex flex-col items-center justify-center p-6 space-y-4 bg-white rounded-xl shadow-sm border border-gray-200 w-full max-w-sm mx-auto">
      {status === 'pending' && (
        <div className="flex flex-col items-center space-y-3 text-blue-600">
          <Spinner size="lg" />
          <span className="font-medium animate-pulse">Transaction pending...</span>
        </div>
      )}

      {status === 'success' && (
        <div className="flex flex-col items-center space-y-3 text-green-600">
          <div className="flex items-center space-x-2 bg-green-50 p-2 rounded-full">
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <span className="font-bold text-lg text-gray-800">Transaction Successful</span>
          <div className="inline-flex items-center gap-2">
            <a
              href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-mono text-blue-500 hover:text-blue-700 underline truncate max-w-xs"
              title={txHash}
            >
              {txHash.slice(0, 8)}...{txHash.slice(-8)}
            </a>
            <CopyButton value={txHash} ariaLabel="Copy transaction hash" />
          </div>
        </div>
      )}

      {status === 'failed' && (
        <div className="flex flex-col items-center space-y-3 text-red-600">
          <div className="flex items-center space-x-2 bg-red-50 p-2 rounded-full">
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>
          <span className="font-bold text-lg text-gray-800">Transaction Failed</span>
          {error && <p className="text-sm text-red-500 text-center px-2">{error}</p>}
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-500 hover:text-blue-700 underline"
          >
            View on Stellar Expert
          </a>
        </div>
      )}
    </div>
  )
}
