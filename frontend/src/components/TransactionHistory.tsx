
import React from 'react';
import { useTransactionHistory } from '../hooks/useTransactionHistory';
import { useNetwork } from '../context/NetworkContext';
import { stellarExplorerUrl } from '../utils/formatting';
import { ExplorerLink } from './ExplorerLink';

interface TransactionHistoryProps {
  publicKey?: string;
  contractId?: string;
  assetCodes?: string[];
  issuer?: string;
  contractIds?: string[];
}

const badgeColors: Record<string, string> = {
  create: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  mint: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  burn: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  success: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
}

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({
  publicKey = '',
  contractId,
  assetCodes,
  issuer,
  contractId,
  contractIds,
}) => {
  const resolvedContractIds = contractId ? [contractId, ...(contractIds ?? [])] : contractIds
  const { transactions, loading, error, hasMore, loadMore } = useTransactionHistory(publicKey, {
    assetCodes,
    issuer,
    contractIds: resolvedContractIds,
    pageSize: 10,
  })

  // Infinite scroll
  React.useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >=
          document.documentElement.offsetHeight - 200 &&
        hasMore &&
        !loading
      ) {
        loadMore()
      }
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [hasMore, loading, loadMore])

  return (
    <div className="w-full max-w-3xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Transaction History</h2>
      {loading && transactions.length === 0 && (
        <div className="animate-pulse space-y-2" aria-label="Loading transactions" aria-busy="true">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-200 rounded" />
          ))}
        </div>
      )}
      {error && <div className="text-red-600 mb-2">{error}</div>}
      {!loading && transactions.length === 0 && !error && (
        <div className="text-gray-500 text-center py-8 dark:text-gray-400">
          {t('transactionHistory.noEvents')}
        </div>
      )}

      {transactions.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border rounded shadow">
            <caption className="sr-only">Transaction history</caption>
            <thead>
              <tr>
                <th scope="col" className="px-4 py-2">Type</th>
                <th scope="col" className="px-4 py-2">Token</th>
                <th scope="col" className="px-4 py-2">Amount</th>
                <th scope="col" className="px-4 py-2">Date</th>
                <th scope="col" className="px-4 py-2">Status</th>
                <th scope="col" className="px-4 py-2">Link</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors">
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${badgeColors[tx.type] || 'bg-gray-100 text-gray-800'}`}
                    >
                      {t(`transactionHistory.eventLabels.${tx.type}`, { defaultValue: tx.type })}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs dark:text-gray-300">{tx.token}</td>
                  <td className="px-4 py-3 dark:text-gray-300">{tx.amount}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                    {formatTimestamp(new Date(tx.date).getTime() / 1000)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${badgeColors[tx.status] || 'bg-gray-100 text-gray-800'}`}
                    >
                      {tx.status}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <div className="inline-flex items-center gap-2">
                      <a
                        href={`https://stellar.expert/explorer/public/tx/${tx.hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 underline text-sm"
                        aria-label={`View transaction ${tx.hash} on Stellar Explorer`}
                      >
                        View
                      </a>
                      <CopyButton value={tx.hash} ariaLabel={`Copy transaction hash ${tx.hash}`} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {loading && (
        <div className="mt-4 flex justify-center py-4">
          <div className="animate-pulse text-gray-400 dark:text-gray-500 flex items-center gap-2">
            <span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" />
            <span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce [animation-delay:-.15s]" />
            <span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce [animation-delay:-.3s]" />
            {t('tokenDetail.loading', { address: '' }).replace('...', '')}
          </div>
        </div>
      )}
    </div>
  )
}

export default TransactionHistory
