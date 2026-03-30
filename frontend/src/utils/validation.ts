// Validation utilities
import { StrKey } from 'stellar-sdk'

export const isValidStellarAddress = (address: string): boolean => {
  return StrKey.isValidEd25519PublicKey(address)
}

export const isValidContractAddress = (address: string): boolean => {
  return StrKey.isValidContract(address)
}

export const validateTokenParams = (params: {
  name?: string
  symbol?: string
  decimals?: number
  initialSupply?: string
}) => {
  const errors: Record<string, string> = {}

  const trimmedName = params.name?.trim() || ''
  const trimmedSymbol = params.symbol?.trim() || ''

  if (!trimmedName || trimmedName.length < 1 || trimmedName.length > 32) {
    errors.name = 'Token name must be 1-32 characters'
  } else if (!/^[A-Za-z0-9 _-]+$/.test(trimmedName)) {
    errors.name = 'Token name can only contain letters, digits, spaces, hyphens, and underscores'
  }

  if (!trimmedSymbol || trimmedSymbol.length < 1 || trimmedSymbol.length > 12) {
    errors.symbol = 'Token symbol must be 1-12 characters'
  } else if (!/^[A-Za-z0-9-]+$/.test(trimmedSymbol)) {
    errors.symbol = 'Token symbol can only contain alphanumeric characters and hyphens'
  }

  if (
    params.decimals === undefined ||
    params.decimals === null ||
    params.decimals < 0 ||
    params.decimals > 18
  ) {
    errors.decimals = 'Decimals must be 0-18'
  }

  if (!params.initialSupply || parseFloat(params.initialSupply) <= 0) {
    errors.initialSupply = 'Initial supply must be greater than 0'
  }

  return { valid: Object.keys(errors).length === 0, errors }
}

// CIDv0: Qm + 44 base58 chars (total 46); CIDv1: bafy... base32
const CID_V0 = /^Qm[1-9A-HJ-NP-Za-km-z]{44}$/
const CID_V1 = /^b[a-z2-7]{58,}$/

export const isValidIPFSUri = (uri: string): boolean => {
  if (!uri.startsWith('ipfs://')) return false
  const cid = uri.slice(7)
  return CID_V0.test(cid) || CID_V1.test(cid)
}

export const isValidImageFile = (file: File): { valid: boolean; error?: string } => {
  const maxSize = 5 * 1024 * 1024 // 5MB
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif']

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Only JPEG, PNG, and GIF images are allowed' }
  }

  if (file.size > maxSize) {
    return { valid: false, error: 'Image size must be less than 5MB' }
  }

  return { valid: true }
}

export const validateTokenName = (name: string): boolean => {
  const trimmed = name.trim()
  // Allow letters, digits, spaces, hyphens, underscores — reject HTML/special chars
  const validPattern = /^[A-Za-z0-9 _-]+$/
  return trimmed.length >= 1 && trimmed.length <= 32 && validPattern.test(trimmed)
}

export const validateTokenSymbol = (symbol: string): boolean => {
  const trimmed = symbol.trim()
  // Only allow alphanumeric characters and hyphens
  const validPattern = /^[A-Za-z0-9-]+$/
  return trimmed.length >= 1 && trimmed.length <= 12 && validPattern.test(trimmed)
}

export const sanitizeTokenInput = (input: string): string => {
  return input.trim()
}

export const validateDecimals = (decimals: number): boolean => {
  return decimals >= 0 && decimals <= 18
}
