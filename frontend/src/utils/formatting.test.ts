import { describe, it, expect } from 'vitest'
import { formatTokenAmount, parseTokenAmount, formatAddress } from './formatting'

describe('formatTokenAmount', () => {
  it('formats with 7 decimals', () => {
    expect(formatTokenAmount('1000000000', 7)).toBe('100.0000000')
  })

  it('formats zero', () => {
    expect(formatTokenAmount('0', 7)).toBe('0.0000000')
  })

  it('formats negative numbers', () => {
    expect(formatTokenAmount('-1000000000', 7)).toBe('-100.0000000')
  })

  it('handles numbers larger than MAX_SAFE_INTEGER', () => {
    expect(formatTokenAmount('99999999999999999999', 7)).toBe('10,000,000,000,000.0000000')
  })

  it('formats with 0 decimals', () => {
    expect(formatTokenAmount('42', 0)).toBe('42')
  })
})

describe('parseTokenAmount', () => {
  it('parses display amount to raw', () => {
    expect(parseTokenAmount('100', 7)).toBe('1000000000')
  })

  it('parses with fractional part', () => {
    expect(parseTokenAmount('100.0000000', 7)).toBe('1000000000')
  })

  it('parses zero', () => {
    expect(parseTokenAmount('0', 7)).toBe('0')
  })

  it('handles numbers larger than MAX_SAFE_INTEGER', () => {
    expect(parseTokenAmount('9999999999999.9999999', 7)).toBe('99999999999999999999')
  })

  it('pads short fractional part', () => {
    expect(parseTokenAmount('1.5', 7)).toBe('15000000')
  })

  it('truncates long fractional part', () => {
    expect(parseTokenAmount('1.12345678', 7)).toBe('11234567')
  })
})

describe('formatAddress', () => {
  const STELLAR_ADDRESS = 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN'

  it('truncates a full Stellar address with defaults', () => {
    expect(formatAddress(STELLAR_ADDRESS)).toBe('GAAZI4...CCWN')
  })

  it('respects custom prefixLen and suffixLen', () => {
    expect(formatAddress(STELLAR_ADDRESS, 4, 4)).toBe('GAAZ...CCWN')
  })

  it('returns the address unchanged when shorter than prefix + suffix', () => {
    expect(formatAddress('GABCD', 6, 4)).toBe('GABCD')
  })

  it('returns the address unchanged when exactly prefix + suffix length', () => {
    expect(formatAddress('GABC1234', 4, 4)).toBe('GABC1234')
  })

  it('returns empty string for empty input', () => {
    expect(formatAddress('')).toBe('')
  })
})
