import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useStellarContext } from '../context/StellarContext'
import { useToast } from '../context/ToastContext'
import { ipfsService } from '../services/ipfs'
import { STELLAR_CONFIG } from '../config/stellar'
import { isValidContractAddress } from '../utils/validation'
import { formatAddress, ipfsToGatewayUrl, formatTimestamp } from '../utils/formatting'
import type { TokenInfo, IPFSMetadata } from '../types'
import { Card, Button, Input, Spinner } from './UI'
import { CopyButton } from './CopyButton'
import { PaginationControls } from './UI/PaginationControls'

interface TokenWithMetadata extends TokenInfo {
  address: string
  metadata?: IPFSMetadata | null
}

export const TokenExplorer: React.FC = () => {
  const { t } = useTranslation()
  const { stellarService } = useStellarContext()
  const { addToast } = useToast()

  const [searchInput, setSearchInput] = useState('')
  const [searchResult, setSearchResult] = useState<TokenWithMetadata | null>(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  const [currentPage, setCurrentPage] = useState(1)
  const [totalTokens, setTotalTokens] = useState(0)
  const [tokens, setTokens] = useState<TokenWithMetadata[]>([])
  const [loadingTokens, setLoadingTokens] = useState(false)

  const tokensPerPage = 10

  // Load factory state to get total token count
  useEffect(() => {
    stellarService
      .getFactoryState()
      .then((state) => setTotalTokens(state.tokenCount))
      .catch(() => setTotalTokens(0))
  }, [stellarService])

  // Load tokens for current page
  useEffect(() => {
    if (totalTokens === 0) return

    setLoadingTokens(true)
    const startIndex = (currentPage - 1) * tokensPerPage
    const endIndex = Math.min(startIndex + tokensPerPage, totalTokens)

    // Get all token_created events to map indices to addresses
    stellarService
      .getContractEvents(STELLAR_CONFIG.factoryContractId || '', 1000)
      .then(({ events }) => {
        const tokenCreatedEvents = events
          .filter((e) => e.type === 'token_created')
          .sort((a, b) => a.ledger - b.ledger) // Sort by creation order

        const promises: Promise<TokenWithMetadata | null>[] = []
        for (let i = startIndex; i < endIndex; i++) {
          const event = tokenCreatedEvents[i]
          if (event?.data.tokenAddress) {
            promises.push(loadTokenByAddress(event.data.tokenAddress, i))
          }
        }

        return Promise.all(promises)
      })
      .then((results) => {
        const validTokens = results.filter((t): t is TokenWithMetadata => t !== null)
        setTokens(validTokens)
      })
      .catch(() => setTokens([]))
      .finally(() => setLoadingTokens(false))
  }, [currentPage, totalTokens, stellarService])

  const loadTokenByAddress = async (address: string): Promise<TokenWithMetadata | null> => {
    try {
      const info = await stellarService.getTokenInfo(address)

      let metadata: IPFSMetadata | null = null
      if (info.metadataUri) {
        try {
          metadata = await ipfsService.getMetadata(info.metadataUri)
        } catch {
          // Metadata fetch failure is non-fatal
        }
      }

      return {
        ...info,
        address,
        metadata,
      }
    } catch {
      return null
    }
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    const query = searchInput.trim()

    if (!query) {
      setSearchError('Please enter a token address or index')
      return
    }

    setSearching(true)
    setSearchError(null)
    setSearchResult(null)

    try {
      // Check if input is a number (index)
      const indexMatch = /^\d+$/.exec(query)
      if (indexMatch) {
        const index = parseInt(query, 10)
        if (index >= totalTokens) {
          setSearchError(`Token index ${index} does not exist. Total tokens: ${totalTokens}`)
          return
        }

        // Get token address from events
        const { events } = await stellarService.getContractEvents(
          STELLAR_CONFIG.factoryContractId || '',
          1000,
        )
        const tokenCreatedEvents = events
          .filter((e) => e.type === 'token_created')
          .sort((a, b) => a.ledger - b.ledger)

        const event = tokenCreatedEvents[index]
        if (!event?.data.tokenAddress) {
          setSearchError('Token not found at this index')
          return
        }

        const result = await loadTokenByAddress(event.data.tokenAddress, index)
        if (result) {
          setSearchResult(result)
        } else {
          setSearchError('Token not found at this index')
        }
        return
      }

      // Otherwise treat as address
      if (!isValidContractAddress(query)) {
        setSearchError('Invalid token address format')
        return
      }

      const result = await loadTokenByAddress(query)
      if (result) {
        setSearchResult(result)
      } else {
        setSearchError('Token not found')
      }
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Token not found')
      addToast('Token not found', 'error')
    } finally {
      setSearching(false)
    }
  }

  const totalPages = Math.ceil(totalTokens / tokensPerPage)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('tokenExplorer.title', 'Token Explorer')}
        </h2>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {t('tokenExplorer.description', 'Search for any token by address or index, or browse all tokens')}
        </p>
      </div>

      {/* Search Form */}
      <Card>
        <form onSubmit={handleSearch} className="space-y-4">
          <Input
            label={t('tokenExplorer.searchLabel', 'Token Address or Index')}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t('tokenExplorer.searchPlaceholder', 'Enter token address (C...) or index (0, 1, 2...)')}
            disabled={searching}
          />
          {searchError && (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {searchError}
            </p>
          )}
          <Button type="submit" disabled={searching} loading={searching}>
            {searching ? t('tokenExplorer.searching', 'Searching...') : t('tokenExplorer.search', 'Search')}
          </Button>
        </form>
      </Card>

      {/* Search Result */}
      {searchResult && (
        <Card title={t('tokenExplorer.searchResult', 'Search Result')}>
          <TokenDisplay token={searchResult} />
        </Card>
      )}

      {/* All Tokens List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('tokenExplorer.allTokens', 'All Tokens')} ({totalTokens})
          </h3>
        </div>

        {loadingTokens ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" label={t('tokenExplorer.loadingTokens', 'Loading tokens...')} />
          </div>
        ) : tokens.length === 0 ? (
          <Card>
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">
              {t('tokenExplorer.noTokens', 'No tokens have been deployed yet')}
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {tokens.map((token, index) => (
              <Card key={`${token.address}-${index}`}>
                <TokenDisplay token={token} showIndex index={(currentPage - 1) * tokensPerPage + index} />
              </Card>
            ))}
          </div>
        )}

        {totalPages > 1 && !loadingTokens && (
          <PaginationControls
            page={currentPage}
            totalPages={totalPages}
            totalCount={totalTokens}
            pageSize={tokensPerPage}
            onPrev={() => setCurrentPage((p) => Math.max(1, p - 1))}
            onNext={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          />
        )}
      </div>
    </div>
  )
}

interface TokenDisplayProps {
  token: TokenWithMetadata
  showIndex?: boolean
  index?: number
}

const TokenDisplay: React.FC<TokenDisplayProps> = ({ token, showIndex, index }) => {
  const { t } = useTranslation()
  const imageUrl = token.metadata?.image ? ipfsToGatewayUrl(token.metadata.image) : null

  return (
    <div className="space-y-4">
      {/* Token Header with Image */}
      <div className="flex gap-4 items-start">
        {imageUrl && (
          <img
            src={imageUrl}
            alt={`${token.name} logo`}
            className="w-16 h-16 rounded-lg object-cover flex-shrink-0 border border-gray-200 dark:border-gray-700"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none'
            }}
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            {showIndex !== undefined && index !== undefined && (
              <span className="text-sm font-mono text-gray-500 dark:text-gray-400">
                #{index}
              </span>
            )}
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
              {token.name}
            </h4>
            <span className="text-sm font-mono text-gray-500 dark:text-gray-400">
              ({token.symbol})
            </span>
          </div>
          {token.metadata?.description && (
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {token.metadata.description}
            </p>
          )}
        </div>
      </div>

      {/* Token Details */}
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
        <div>
          <dt className="text-gray-500 dark:text-gray-400">
            {t('tokenExplorer.address', 'Address')}
          </dt>
          <dd className="flex items-center gap-1 font-mono text-xs break-all text-gray-900 dark:text-gray-100 mt-1">
            <span title={token.address}>{formatAddress(token.address)}</span>
            <CopyButton value={token.address} ariaLabel="Copy token address" />
          </dd>
        </div>

        <div>
          <dt className="text-gray-500 dark:text-gray-400">
            {t('tokenExplorer.totalSupply', 'Total Supply')}
          </dt>
          <dd className="text-gray-900 dark:text-gray-100 mt-1 font-mono">
            {token.totalSupply ?? '—'}
          </dd>
        </div>

        <div>
          <dt className="text-gray-500 dark:text-gray-400">
            {t('tokenExplorer.decimals', 'Decimals')}
          </dt>
          <dd className="text-gray-900 dark:text-gray-100 mt-1">{token.decimals}</dd>
        </div>

        {token.creator && (
          <div>
            <dt className="text-gray-500 dark:text-gray-400">
              {t('tokenExplorer.creator', 'Creator')}
            </dt>
            <dd className="flex items-center gap-1 font-mono text-xs break-all text-gray-900 dark:text-gray-100 mt-1">
              <span title={token.creator}>{formatAddress(token.creator)}</span>
              <CopyButton value={token.creator} ariaLabel="Copy creator address" />
            </dd>
          </div>
        )}

        {token.createdAt && token.createdAt > 0 && (
          <div>
            <dt className="text-gray-500 dark:text-gray-400">
              {t('tokenExplorer.created', 'Created')}
            </dt>
            <dd className="text-gray-900 dark:text-gray-100 mt-1">
              {formatTimestamp(token.createdAt)}
            </dd>
          </div>
        )}

        {token.metadataUri && (
          <div className="sm:col-span-2">
            <dt className="text-gray-500 dark:text-gray-400">
              {t('tokenExplorer.metadataUri', 'Metadata URI')}
            </dt>
            <dd className="flex items-center gap-1 font-mono text-xs break-all text-gray-900 dark:text-gray-100 mt-1">
              <span className="truncate" title={token.metadataUri}>
                {token.metadataUri}
              </span>
              <CopyButton value={token.metadataUri} ariaLabel="Copy metadata URI" />
            </dd>
          </div>
        )}
      </dl>

      {/* View Details Link */}
      <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
        <Link
          to={`/tokens/${token.address}`}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
        >
          {t('tokenExplorer.viewDetails', 'View full details')} →
        </Link>
      </div>
    </div>
  )
}
