import { describe, it, expect } from 'vitest'
import {
  formatTokenAmount,
  formatXLM,
  formatDate,
  truncateAddress,
  parseTokenAmount,
  formatAddress,
} from './formatting'

const ADDR = 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN'

// ── formatTokenAmount ─────────────────────────────────────────────────────────

describe('formatTokenAmount', () => {
  it('converts stroops to decimal (7 decimals)', () => {
    expect(formatTokenAmount('1000000000', 7)).toBe('100.0000000')
  })
})

describe('formatAddress', () => {
  const ADDR = 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN'

  it('truncates with default prefix/suffix', () => {
    expect(formatAddress(ADDR)).toBe('GAAZI4...CCWN')
  })

  it('formats negative amounts', () => {
    expect(formatTokenAmount('-1000000000', 7)).toBe('-100.0000000')
  })

  it('handles values larger than Number.MAX_SAFE_INTEGER without precision loss', () => {
    // 99999999999999999999 / 10^7 = 9999999999999.9999999
    expect(formatTokenAmount('99999999999999999999', 7)).toBe('9999999999999.9999999')
  })

  it('accepts BigInt input', () => {
    expect(formatTokenAmount(700_000_000n, 7)).toBe('70.0000000')
  })

  it('respects custom prefixLen and suffixLen', () => {
    expect(formatAddress(ADDR, 4, 4)).toBe('GAAZ...CCWN')
  })

  it('pads fractional part with leading zeros', () => {
    expect(formatTokenAmount('1', 7)).toBe('0.0000001')
  })
})

// ── formatXLM ─────────────────────────────────────────────────────────────────

describe('formatXLM', () => {
  it('formats stroops as XLM with suffix', () => {
    expect(formatXLM('1000000000')).toBe('100.0000000 XLM')
  })

  it('accepts number input', () => {
    expect(formatXLM(10_000_000)).toBe('1.0000000 XLM')
  })

  it('accepts BigInt input', () => {
    expect(formatXLM(10_000_000n)).toBe('1.0000000 XLM')
  })
})

  it('formats zero', () => {
    expect(formatXLM(0)).toBe('0.0000000 XLM')
  })

  it('handles large values without precision loss', () => {
    expect(formatXLM('100000000000000')).toBe('10000000.0000000 XLM')
  })
})

// ── formatDate ────────────────────────────────────────────────────────────────

describe('formatDate', () => {
  it('formats a known timestamp to MMM DD, YYYY', () => {
    // 2026-03-19T00:00:00Z
    expect(formatDate(1742342400)).toBe('Mar 19, 2026')
  })

  it('does not throw for timestamp 0', () => {
    expect(() => formatDate(0)).not.toThrow()
  })

  it('does not throw for a future timestamp', () => {
    expect(() => formatDate(9_999_999_999)).not.toThrow()
  })
})

// ── truncateAddress ───────────────────────────────────────────────────────────

describe('truncateAddress', () => {
  it('truncates with default 4 chars each side', () => {
    expect(truncateAddress(ADDR)).toBe('GAAZ...CCWN')
  })
})

  it('respects custom chars param', () => {
    expect(truncateAddress(ADDR, 6)).toBe('GAAZI4...CCWN')
  })

  it('returns address unchanged when shorter than 2*chars', () => {
    expect(truncateAddress('GABCD', 4)).toBe('GABCD')
  })

  it('returns address unchanged when exactly 2*chars long', () => {
    expect(truncateAddress('GABC1234', 4)).toBe('GABC1234')
  })
})

// ── parseTokenAmount (round-trip) ─────────────────────────────────────────────

describe('parseTokenAmount', () => {
  it('round-trips with formatTokenAmount', () => {
    expect(parseTokenAmount(formatTokenAmount('1000000000', 7), 7)).toBe('1000000000')
  })

  it('parses whole number', () => {
    expect(parseTokenAmount('100', 7)).toBe('1000000000')
  })

  it('pads short fractional part', () => {
    expect(parseTokenAmount('1.5', 7)).toBe('15000000')
  })

  it('truncates long fractional part', () => {
    expect(parseTokenAmount('1.12345678', 7)).toBe('11234567')
  })
})

// ── formatAddress (legacy helper) ────────────────────────────────────────────

describe('formatAddress', () => {
  it('truncates with default prefix/suffix', () => {
    expect(formatAddress(ADDR)).toBe('GAAZI4...CCWN')
  })

  it('defaults to testnet', () => {
    expect(stellarExplorerUrl('tx', 'xyz')).toContain('testnet')
  })

  it('returns address unchanged when shorter than prefix + suffix', () => {
    expect(formatAddress('GABCD', 6, 4)).toBe('GABCD')
  })
})
