import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useStellarContext } from '../context/StellarContext'
import { useNetwork } from '../context/NetworkContext'
import { useToast } from '../context/ToastContext'
import { useWallet } from '../hooks/useWallet'
import { ipfsService } from '../services/ipfs'
import { stellarExplorerUrl, ipfsToGatewayUrl, formatAddress } from '../utils/formatting'
import { isValidContractAddress } from '../utils/validation'
import type { TokenInfo, IPFSMetadata } from '../types'
import { Card, Button, Spinner } from './UI'
import { CopyButton } from './CopyButton'
import { QRCodeModal } from './UI/QRCodeModal'
import { ShareButton } from './ShareButton'
import { MintForm } from './MintForm'
import { BurnForm } from './BurnForm'
import { SetMetadataForm } from './SetMetadataForm'

const BASE_URL = 'https://stellarforge.app'

type ActivePanel = 'mint' | 'burn' | 'metadata' | null

function setMeta(property: string, content: string) {
  let el = document.querySelector<HTMLMetaElement>(`meta[property="${property}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute('property', property)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

export const TokenDetail: React.FC = () => {
  const { t } = useTranslation()
  const { stellarService } = useStellarContext()
  const { address } = useParams<{ address: string }>()
  const { addToast } = useToast()
  const { network } = useNetwork()
  const { wallet } = useWallet()

  const [token, setToken] = useState<TokenInfo | null>(null)
  const [metadata, setMetadata] = useState<IPFSMetadata | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [activePanel, setActivePanel] = useState<ActivePanel>(null)
  const [showQR, setShowQR] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isCreator = token?.creator && wallet.address && token.creator === wallet.address

  useEffect(() => {
    if (!address || !isValidContractAddress(address)) {
      setNotFound(true)
      setLoading(false)
      return
    }

    setLoading(true)
    setNotFound(false)
    setError(null)

    stellarService
      .getTokenInfo(address)
      .then(async (info) => {
        setToken(info as TokenInfo)
        if (info.metadataUri) {
          try {
            const meta = await ipfsService.getMetadata(info.metadataUri)
            setMetadata(meta as IPFSMetadata)
          } catch {
            // metadata fetch failure is non-fatal
          }
        }
      })
      .catch((err: Error) => {
        setError(err.message || t('tokenDetail.loadError'))
        setNotFound(true)
      })
      .finally(() => setLoading(false))
  }, [address, stellarService, t])

  // Inject Open Graph meta tags for rich link previews
  useEffect(() => {
    if (!token || !address) return

    const title = `${token.name} (${token.symbol}) — StellarForge`
    const description = `${token.name} is a Stellar token with symbol ${token.symbol}, ${token.decimals} decimals, and a total supply of ${token.totalSupply}. Created by ${token.creator}.`
    const url = `${BASE_URL}/token/${address}`

    document.title = title
    setMeta('og:type', 'website')
    setMeta('og:title', title)
    setMeta('og:description', description)
    setMeta('og:url', url)
    setMeta('og:site_name', 'StellarForge')
    setMeta('twitter:card', 'summary')
    setMeta('twitter:title', title)
    setMeta('twitter:description', description)
    setMeta('twitter:site', '@StellarForge')

    return () => {
      document.title = 'StellarForge - Stellar Token Deployer'
    }
  }, [token, address])

  /**
   * Stable callback — only recreated when token or addToast changes.
   * Passed to SetMetadataForm as onSubmit prop; useCallback prevents
   * SetMetadataForm from re-rendering when unrelated state changes.
   */
  const handleSetMetadata = useCallback(
    async (_addr: string, uri: string) => {
      addToast(`Metadata URI set: ${uri}`, 'success')
      if (token) setToken({ ...token, metadataUri: uri })
      setActivePanel(null)
    },
    [addToast, token],
  )

  /**
   * Stable callback — toggles the active action panel.
   * Wrapped in useCallback so Button onClick refs stay stable across renders.
   */
  const togglePanel = useCallback(
    (panel: ActivePanel) => setActivePanel((prev) => (prev === panel ? null : panel)),
    [],
  )

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20" aria-live="polite">
        <Spinner size="lg" label={t('tokenDetail.loading', { address: formatAddress(address || '') })} />
      </div>
    )
  }

  if (notFound || !token) {
    return (
      <div className="text-center py-20 space-y-4" role="alert">
        <p className="text-2xl font-semibold text-gray-700 dark:text-gray-300">
          {t('tokenDetail.loadError')}
        </p>
        <p className="text-gray-500 dark:text-gray-400 text-sm break-all">
          No token found at address: <span className="font-mono">{address}</span>
        </p>
        <Link to="/tokens">
          <Button variant="outline" size="sm">Back to Dashboard</Button>
        </Link>
      </div>
    )
  }

  const imageUrl = metadata?.image ? ipfsToGatewayUrl(metadata.image) : null

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {token.name}
          <span className="ml-2 text-base font-normal text-gray-500 dark:text-gray-400">
            ({token.symbol})
          </span>
        </h2>
        <div className="flex items-center gap-2">
          {address && (
            <ShareButton
              tokenAddress={address}
              tokenName={token.name}
              tokenSymbol={token.symbol}
            />
          )}
          <Link to="/tokens">
            <Button variant="outline" size="sm">← Back</Button>
          </Link>
        </div>
      </div>

      <Card>
        {error && <p className="text-red-500 mb-4">{error}</p>}
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-sm">
          <div>
            <dt className="text-gray-500 dark:text-gray-400">{t('transactionHistory.dataLabels.token')}</dt>
            <dd className="flex items-center gap-1 font-mono text-xs break-all text-gray-900 dark:text-gray-100 mt-1">
              <ExplorerLink
                type="contract"
                value={address!}
                network={network}
                label="View on Stellar Expert"
                ariaLabel={`View contract ${address} on Stellar Expert`}
                className="text-indigo-500 hover:underline"
              />
              <CopyButton value={address!} ariaLabel="Copy token address" />
            </dd>
          </div>
          <div>
            <dt className="text-gray-500 dark:text-gray-400">Total Supply</dt>
            <dd className="text-gray-900 dark:text-gray-100 mt-1">{token.totalSupply ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500 dark:text-gray-400">{t('tokenForm.decimals')}</dt>
            <dd className="text-gray-900 dark:text-gray-100 mt-1">{token.decimals}</dd>
          </div>
          <div>
            <dt className="text-gray-500 dark:text-gray-400">{t('transactionHistory.dataLabels.creator')}</dt>
            <dd className="flex items-center gap-1 font-mono text-xs break-all text-gray-900 dark:text-gray-100 mt-1">
              {token.creator ? (
                <ExplorerLink
                  type="account"
                  value={token.creator}
                  network={network}
                  label="View on Stellar Expert"
                  ariaLabel={`View account ${token.creator} on Stellar Expert`}
                  className="text-indigo-500 hover:underline"
                  title={token.creator}
                >
                  {formatAddress(token.creator)}
                </a>
              ) : '—'}
            </dd>
          </div>
          {token.createdAt ? (
            <div>
              <dt className="text-gray-500 dark:text-gray-400">Created</dt>
              <dd className="text-gray-900 dark:text-gray-100 mt-1">
                {formatTimestamp(token.createdAt)}
              </dd>
            </div>
          ) : null}
          {token.metadataUri ? (
            <div className="sm:col-span-2">
              <dt className="text-gray-500 dark:text-gray-400">{t('setMetadata.metadataUri')}</dt>
              <dd className="flex items-center gap-1 font-mono text-xs break-all text-gray-900 dark:text-gray-100 mt-1">
                <span className="truncate" title={token.metadataUri}>{token.metadataUri}</span>
                <CopyButton value={token.metadataUri} ariaLabel="Copy metadata URI" />
              </dd>
            </div>
          ) : null}
        </dl>
      </Card>

      {metadata && (
        <Card title="Metadata">
          <div className="flex gap-4 items-start">
            {imageUrl && (
              <img
                src={imageUrl}
                alt={`${token.name} token art`}
                className="w-24 h-24 rounded-lg object-cover flex-shrink-0 border border-gray-200 dark:border-gray-700"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            )}
            <div className="space-y-1 text-sm">
              {metadata.name && (
                <p className="font-medium text-gray-900 dark:text-gray-100">{metadata.name}</p>
              )}
              {metadata.description && (
                <p className="text-gray-600 dark:text-gray-400">{metadata.description}</p>
              )}
            </div>
          </div>
        </Card>
      )}

      <div className="flex flex-wrap gap-3">
        {isCreator ? (
          <>
            <Button onClick={() => togglePanel('mint')} variant="primary">
              {activePanel === 'mint' ? 'Cancel Mint' : 'Mint More'}
            </Button>
            <Button onClick={() => togglePanel('burn')} variant="secondary">
              {activePanel === 'burn' ? 'Cancel Burn' : 'Burn Tokens'}
            </Button>
            {!token.metadataUri && (
              <Button onClick={() => togglePanel('metadata')} variant="outline">
                {activePanel === 'metadata' ? 'Cancel' : 'Set Metadata'}
              </Button>
            )}
          </>
        ) : (
          <div className="text-sm text-gray-500 dark:text-gray-400 py-2">
            Only the token creator can perform actions on this token.
          </div>
        )}
        <Button onClick={() => setShowQR(true)} variant="outline">
          Show QR
        </Button>
      </div>

      <QRCodeModal isOpen={showQR} address={address!} onClose={() => setShowQR(false)} />

      {/* Inline action panels - only for creator */}
      {isCreator && (
        <>
          {activePanel === 'mint' && address && (
            <Card title="Mint More Tokens">
              <MintForm tokenAddress={address} onSuccess={() => setActivePanel(null)} />
            </Card>
          )}
          {activePanel === 'burn' && address && (
            <Card title="Burn Tokens">
              <BurnForm tokenAddress={address} onSuccess={() => setActivePanel(null)} />
            </Card>
          )}
          {activePanel === 'metadata' && address && (
            <Card title="Set Metadata">
              <SetMetadataForm tokenAddress={address} onSubmit={handleSetMetadata} />
            </Card>
          )}
        </>
      )}
    </div>
  )
}
