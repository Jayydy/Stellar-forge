import { describe, it, expect } from 'vitest'
import { validateTokenParams } from '../utils/validation'

const valid = { name: 'MyToken', symbol: 'MTK', decimals: 7, initialSupply: '1000' }

describe('validateTokenParams - valid input', () => {
  it('accepts a fully valid set of params', () => {
    expect(validateTokenParams(valid).valid).toBe(true)
  })

  it('returns no errors for valid params', () => {
    expect(validateTokenParams(valid).errors).toEqual({})
  })
})

describe('validateTokenParams - name', () => {
  it('accepts a 1-character name', () => {
    expect(validateTokenParams({ ...valid, name: 'A' }).valid).toBe(true)
  })

  it('accepts a 32-character name', () => {
    expect(validateTokenParams({ ...valid, name: 'A'.repeat(32) }).valid).toBe(true)
  })

  it('strips leading/trailing whitespace from name', () => {
    expect(validateTokenParams({ ...valid, name: '  MyToken  ' }).valid).toBe(true)
  })

  it('rejects a name with special characters', () => {
    const { valid: ok, errors } = validateTokenParams({ ...valid, name: '<script>' })
    expect(ok).toBe(false)
    expect(errors.name).toBeDefined()
  })

  it('rejects a name with HTML entities', () => {
    const { valid: ok, errors } = validateTokenParams({ ...valid, name: 'Token&Name' })
    expect(ok).toBe(false)
    expect(errors.name).toBeDefined()
  })

  it('rejects an empty name', () => {
    const { valid: ok, errors } = validateTokenParams({ ...valid, name: '' })
    expect(ok).toBe(false)
    expect(errors.name).toBeDefined()
  })

  it('rejects a name over 32 characters', () => {
    const { valid: ok, errors } = validateTokenParams({ ...valid, name: 'A'.repeat(33) })
    expect(ok).toBe(false)
    expect(errors.name).toBeDefined()
  })

  it('rejects undefined name', () => {
    const { name: _n, ...rest } = valid
    const { valid: ok, errors } = validateTokenParams(rest)
    expect(ok).toBe(false)
    expect(errors.name).toBeDefined()
  })
})

describe('validateTokenParams - symbol', () => {
  it('accepts a 1-character symbol', () => {
    expect(validateTokenParams({ ...valid, symbol: 'X' }).valid).toBe(true)
  })

  it('accepts a 12-character symbol', () => {
    expect(validateTokenParams({ ...valid, symbol: 'A'.repeat(12) }).valid).toBe(true)
  })

  it('rejects an empty symbol', () => {
    const { valid: ok, errors } = validateTokenParams({ ...valid, symbol: '' })
    expect(ok).toBe(false)
    expect(errors.symbol).toBeDefined()
  })

  it('rejects a symbol over 12 characters', () => {
    const { valid: ok, errors } = validateTokenParams({ ...valid, symbol: 'A'.repeat(13) })
    expect(ok).toBe(false)
    expect(errors.symbol).toBeDefined()
  })

  it('rejects undefined symbol', () => {
    const { symbol: _s, ...rest } = valid
    const { valid: ok, errors } = validateTokenParams(rest)
    expect(ok).toBe(false)
    expect(errors.symbol).toBeDefined()
  })
})

describe('validateTokenParams - initialSupply', () => {
  it('accepts a positive supply', () => {
    expect(validateTokenParams({ ...valid, initialSupply: '1' }).valid).toBe(true)
  })

  it('accepts a large supply', () => {
    expect(validateTokenParams({ ...valid, initialSupply: '999999999' }).valid).toBe(true)
  })

  it('rejects zero supply', () => {
    const { valid: ok, errors } = validateTokenParams({ ...valid, initialSupply: '0' })
    expect(ok).toBe(false)
    expect(errors.initialSupply).toBeDefined()
  })

  it('rejects a negative supply', () => {
    const { valid: ok, errors } = validateTokenParams({ ...valid, initialSupply: '-1' })
    expect(ok).toBe(false)
    expect(errors.initialSupply).toBeDefined()
  })

  it('rejects undefined supply', () => {
    const { initialSupply: _i, ...rest } = valid
    const { valid: ok, errors } = validateTokenParams(rest)
    expect(ok).toBe(false)
    expect(errors.initialSupply).toBeDefined()
  })
})

describe('validateTokenParams - multiple errors', () => {
  it('reports all invalid fields at once', () => {
    const { valid: ok, errors } = validateTokenParams({})
    expect(ok).toBe(false)
    expect(errors.name).toBeDefined()
    expect(errors.symbol).toBeDefined()
    expect(errors.decimals).toBeDefined()
    expect(errors.initialSupply).toBeDefined()
  })
})
