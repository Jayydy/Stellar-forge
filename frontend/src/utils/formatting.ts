import { IPFS_CONFIG } from '../config/ipfs'
import i18n from '../i18n'

export const formatXLM = (amount: string | number): string => {
  const formatter = new Intl.NumberFormat(i18n.language, {
    minimumFractionDigits: 7,
    maximumFractionDigits: 7,
  })
  return `${formatter.format(parseFloat(amount.toString()))} XLM`
}

export const truncateAddress = (
  address: string,
  startChars: number = 6,
  endChars: number = 4,
): string => {
  if (address.length <= startChars + endChars) return address
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`
}

export const formatAddress = (
  address: string,
  prefixLen: number = 6,
  suffixLen: number = 4,
): string => {
  if (!address) return ''
  if (address.length <= prefixLen + suffixLen) return address
  return `${address.slice(0, prefixLen)}...${address.slice(-suffixLen)}`
}

export const stroopsToXLM = (stroops: number | string): number => {
  return parseFloat(stroops.toString()) / 10000000
}

export const xlmToStroops = (xlm: number | string): number => {
  return Math.floor(parseFloat(xlm.toString()) * 10000000)
}

export const ipfsToGatewayUrl = (uri: string): string => {
  if (!uri.startsWith('ipfs://')) return uri

  const path = uri.slice('ipfs://'.length).replace(/^\/+/, '')
  const gatewayBase = IPFS_CONFIG.pinataGateway.replace(/\/+$/, '')
  return `${gatewayBase}/${path}`
}

type ExplorerLinkType = 'tx' | 'contract' | 'account'
type Network = 'testnet' | 'mainnet'

const EXPLORER_BASES: Record<Network, string> = {
  mainnet: 'https://stellar.expert/explorer/public',
  testnet: 'https://stellar.expert/explorer/testnet',
}

export const stellarExplorerUrl = (
  type: ExplorerLinkType,
  value: string,
  network: Network = 'testnet',
): string => {
  const base = EXPLORER_BASES[network]
  const path = type === 'tx' ? 'tx' : type === 'contract' ? 'contract' : 'account'
  return `${base}/${path}/${value}`
}

export const formatTimestamp = (timestamp: number): string => {
  const formatter = new Intl.DateTimeFormat(i18n.language, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'UTC',
    timeZoneName: 'short',
  })
  return formatter.format(new Date(timestamp * 1000))
}

export const formatTokenAmount = (amount: string | number, decimals: number): string => {
  if (decimals === 0) return amount.toString()
  const raw = BigInt(amount.toString())
  const factor = BigInt(10 ** decimals)
  const whole = raw / factor
  const frac = (raw < 0n ? -raw : raw) % factor
  
  const formatter = new Intl.NumberFormat(i18n.language, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
  
  const floatValue = Number(whole) + Number(frac) / Number(factor)
  return formatter.format(floatValue)
}

export const parseTokenAmount = (display: string, decimals: number): string => {
  // We should be careful parsing localized numbers, but for input it's often simpler to stick to '.'
  // but if we want to be fully i18n compliant for input, we'd need a more complex parser.
  // For now, let's keep the existing logic which assumes '.' as decimal separator for input.
  const parts = display.split('.')
  const whole = parts[0] ?? '0'
  const frac = parts[1] ?? ''
  const fracPadded = frac.padEnd(decimals, '0').slice(0, decimals)
  return (BigInt(whole) * BigInt(10 ** decimals) + BigInt(fracPadded)).toString()
}

export const timeAgo = (timestamp: number): string => {
  const seconds = Math.floor(Date.now() / 1000) - timestamp
  const rtf = new Intl.RelativeTimeFormat(i18n.language, { numeric: 'auto' })

  if (seconds < 60) return rtf.format(-seconds, 'second')
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return rtf.format(-minutes, 'minute')
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return rtf.format(-hours, 'hour')
  const days = Math.floor(hours / 24)
  return rtf.format(-days, 'day')
}

