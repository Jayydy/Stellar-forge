import { describe, it, expect } from 'vitest'
import { isValidIPFSUri } from '../utils/validation'

describe('isValidIPFSUri', () => {
  it('accepts a valid CIDv0 URI', () => {
    expect(isValidIPFSUri('ipfs://QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco')).toBe(true)
  })

  it('accepts a valid CIDv1 URI', () => {
    expect(
      isValidIPFSUri('ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'),
    ).toBe(true)
  })

  it('rejects an empty string', () => {
    expect(isValidIPFSUri('')).toBe(false)
  })

  it('rejects an HTTP URL', () => {
    expect(isValidIPFSUri('https://example.com/image.png')).toBe(false)
  })

  it('rejects ipfs:// with no CID', () => {
    expect(isValidIPFSUri('ipfs://')).toBe(false)
  })

  it('rejects a malformed CID', () => {
    expect(isValidIPFSUri('ipfs://notacid')).toBe(false)
  })

  it('rejects a plain CID without ipfs:// prefix', () => {
    expect(isValidIPFSUri('QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco')).toBe(false)
  })
})

import { validateTokenParams } from '../utils/validation'

const base = { name: 'MyToken', symbol: 'MTK', initialSupply: '1000' }

describe('validateTokenParams - decimals', () => {
  it('accepts decimals = 0', () => {
    expect(validateTokenParams({ ...base, decimals: 0 }).valid).toBe(true)
  })

  it('accepts decimals = 18', () => {
    expect(validateTokenParams({ ...base, decimals: 18 }).valid).toBe(true)
  })

  it('rejects decimals = -1', () => {
    const { valid, errors } = validateTokenParams({ ...base, decimals: -1 })
    expect(valid).toBe(false)
    expect(errors.decimals).toBeDefined()
  })

  it('rejects decimals = 19', () => {
    const { valid, errors } = validateTokenParams({ ...base, decimals: 19 })
    expect(valid).toBe(false)
    expect(errors.decimals).toBeDefined()
  })

  it('rejects missing decimals', () => {
    const { valid, errors } = validateTokenParams({ ...base })
    expect(valid).toBe(false)
    expect(errors.decimals).toBeDefined()
  })
})

import {
  isValidStellarAddress,
  isValidContractAddress,
  isValidImageFile,
  validateTokenName,
  validateTokenSymbol,
  validateDecimals,
} from '../utils/validation'

// A real valid Ed25519 public key (generated via Keypair.random())
const VALID_ACCOUNT = 'GDNQ2ULB7MXLA4GJBTAAZQON3IEO4HUCYFQMAHVAA2RTC4L4B4G5IK4C'
// Same address with last char flipped — valid format, invalid checksum
const INVALID_CHECKSUM_ACCOUNT =
  VALID_ACCOUNT.slice(0, 55) + (VALID_ACCOUNT[55] === 'N' ? 'M' : 'N')
// A real valid contract address (C...)
const VALID_CONTRACT = 'CA3D5KRYM6CB7OWQ6TWYRR3Z4T7GNZLKERYNZGGA5SOAOPIFY6YQGAXE'

describe('isValidStellarAddress', () => {
  it('accepts a real valid G address', () => {
    expect(isValidStellarAddress(VALID_ACCOUNT)).toBe(true)
  })

  it('rejects an address with valid format but invalid checksum', () => {
    expect(isValidStellarAddress(INVALID_CHECKSUM_ACCOUNT)).toBe(false)
  })

  it('rejects an address not starting with G', () => {
    expect(isValidStellarAddress('A' + 'A'.repeat(55))).toBe(false)
  })

  it('rejects an address that is too short', () => {
    expect(isValidStellarAddress('GABC')).toBe(false)
  })

  it('rejects an empty string', () => {
    expect(isValidStellarAddress('')).toBe(false)
  })

  it('rejects a contract address (C...) as an account address', () => {
    expect(isValidStellarAddress(VALID_CONTRACT)).toBe(false)
  })
})

describe('isValidContractAddress', () => {
  it('accepts a valid contract address (C...)', () => {
    expect(isValidContractAddress(VALID_CONTRACT)).toBe(true)
  })

  it('rejects an account address (G...) as a contract address', () => {
    expect(isValidContractAddress(VALID_ACCOUNT)).toBe(false)
  })

  it('rejects an address that is too short', () => {
    expect(isValidContractAddress('CABC')).toBe(false)
  })

  it('rejects an empty string', () => {
    expect(isValidContractAddress('')).toBe(false)
  })
})

describe('isValidImageFile', () => {
  const makeFile = (type: string, size: number) => ({ type, size }) as File

  it('accepts a valid JPEG under 5MB', () => {
    expect(isValidImageFile(makeFile('image/jpeg', 1024)).valid).toBe(true)
  })

  it('accepts a valid PNG under 5MB', () => {
    expect(isValidImageFile(makeFile('image/png', 1024)).valid).toBe(true)
  })

  it('accepts a valid GIF under 5MB', () => {
    expect(isValidImageFile(makeFile('image/gif', 1024)).valid).toBe(true)
  })

  it('rejects an unsupported file type', () => {
    const result = isValidImageFile(makeFile('image/webp', 1024))
    expect(result.valid).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('rejects a file over 5MB', () => {
    const result = isValidImageFile(makeFile('image/png', 6 * 1024 * 1024))
    expect(result.valid).toBe(false)
    expect(result.error).toBeDefined()
  })
})

describe('validateTokenName', () => {
  it('accepts a name within bounds', () => {
    expect(validateTokenName('MyToken')).toBe(true)
  })

  it('accepts a single character name', () => {
    expect(validateTokenName('A')).toBe(true)
  })

  it('accepts a 32-character name', () => {
    expect(validateTokenName('A'.repeat(32))).toBe(true)
  })

  it('accepts a name with spaces, hyphens, and underscores', () => {
    expect(validateTokenName('My Token-Name_1')).toBe(true)
  })

  it('strips leading/trailing whitespace before validating', () => {
    expect(validateTokenName('  MyToken  ')).toBe(true)
  })

  it('rejects an empty name', () => {
    expect(validateTokenName('')).toBe(false)
  })

  it('rejects a name over 32 characters', () => {
    expect(validateTokenName('A'.repeat(33))).toBe(false)
  })

  it('rejects a name with HTML tags', () => {
    expect(validateTokenName('<script>alert(1)</script>')).toBe(false)
  })

  it('rejects a name with angle brackets', () => {
    expect(validateTokenName('Token<Name>')).toBe(false)
  })

  it('rejects a name with ampersand', () => {
    expect(validateTokenName('Token&Name')).toBe(false)
  })

  it('rejects a name with quotes', () => {
    expect(validateTokenName('Token"Name')).toBe(false)
  })
})

describe('validateTokenSymbol', () => {
  it('accepts a valid symbol', () => {
    expect(validateTokenSymbol('MTK')).toBe(true)
  })

  it('accepts a single character symbol', () => {
    expect(validateTokenSymbol('X')).toBe(true)
  })

  it('accepts a 12-character symbol', () => {
    expect(validateTokenSymbol('A'.repeat(12))).toBe(true)
  })

  it('strips leading/trailing whitespace before validating', () => {
    expect(validateTokenSymbol('  MTK  ')).toBe(true)
  })

  it('rejects an empty symbol', () => {
    expect(validateTokenSymbol('')).toBe(false)
  })

  it('rejects a symbol over 12 characters', () => {
    expect(validateTokenSymbol('A'.repeat(13))).toBe(false)
  })

  it('rejects a symbol with special characters', () => {
    expect(validateTokenSymbol('MT<K>')).toBe(false)
  })

  it('rejects a symbol with spaces', () => {
    expect(validateTokenSymbol('MT K')).toBe(false)
  })

  it('rejects a symbol with HTML entities', () => {
    expect(validateTokenSymbol('MT&K')).toBe(false)
  })
})

describe('validateDecimals', () => {
  it('accepts 0', () => {
    expect(validateDecimals(0)).toBe(true)
  })

  it('accepts 18', () => {
    expect(validateDecimals(18)).toBe(true)
  })

  it('rejects -1', () => {
    expect(validateDecimals(-1)).toBe(false)
  })

  it('rejects 19', () => {
    expect(validateDecimals(19)).toBe(false)
  })
})
