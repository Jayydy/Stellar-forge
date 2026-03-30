import { stellarExplorerUrl } from '../utils/formatting'
import type { Network } from '../context/NetworkContext'

export interface ExplorerLinkProps {
  type: 'tx' | 'contract' | 'account'
  value: string
  network: Network
  /** Visible link text, e.g. "View on Stellar Expert" */
  label: string
  /** aria-label override; defaults to `label` if omitted */
  ariaLabel?: string
  className?: string
}

export const ExplorerLink = ({
  type,
  value,
  network,
  label,
  ariaLabel,
  className,
}: ExplorerLinkProps) => {
  const href = stellarExplorerUrl(type, value, network)
  const baseAriaLabel = ariaLabel ?? label
  const computedAriaLabel =
    network === 'testnet' ? `${baseAriaLabel} (testnet)` : baseAriaLabel

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={computedAriaLabel}
      className={className}
    >
      {label}
      {network === 'testnet' && <span aria-hidden="true">(testnet)</span>}
    </a>
  )
}

export default ExplorerLink
