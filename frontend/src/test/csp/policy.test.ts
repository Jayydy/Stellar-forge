import { describe, it, expect } from 'vitest'
import { buildCSPString, CSP_DIRECTIVES, type CSPDirectives } from '../../csp/policy'

describe('buildCSPString', () => {
  it('serializes directives into a valid CSP string', () => {
    const directives: CSPDirectives = {
      'default-src': ["'self'"],
      'script-src': ["'self'"],
      'style-src': ["'self'", "'unsafe-inline'"],
      'img-src': ["'self'", 'data:'],
      'connect-src': ["'self'"],
      'font-src': ["'self'"],
      'object-src': ["'none'"],
      'base-uri': ["'self'"],
      'frame-ancestors': ["'none'"],
      'form-action': ["'self'"],
      'upgrade-insecure-requests': [],
      'worker-src': ['blob:'],
    }
    const result = buildCSPString(directives)
    expect(result).toContain("default-src 'self'")
    expect(result).toContain("script-src 'self'")
    expect(result).toContain('upgrade-insecure-requests')
    // bare keyword — no trailing space
    expect(result).not.toMatch(/upgrade-insecure-requests\s+;/)
  })

  it('never includes unsafe-inline or unsafe-eval in script-src', () => {
    const result = buildCSPString(CSP_DIRECTIVES)
    const scriptSrcMatch = result.match(/script-src ([^;]+)/)
    const scriptSrc = scriptSrcMatch?.[1] ?? ''
    expect(scriptSrc).not.toContain("'unsafe-inline'")
    expect(scriptSrc).not.toContain("'unsafe-eval'")
  })

  it('includes all required connect-src origins', () => {
    const result = buildCSPString(CSP_DIRECTIVES)
    expect(result).toContain('https://horizon.stellar.org')
    expect(result).toContain('https://horizon-testnet.stellar.org')
    expect(result).toContain('https://soroban-testnet.stellar.org')
    expect(result).toContain('https://api.pinata.cloud')
    expect(result).toContain('https://*.ingest.sentry.io')
  })

  it('emits upgrade-insecure-requests as a bare keyword', () => {
    const result = buildCSPString(CSP_DIRECTIVES)
    expect(result).toMatch(/(^|; )upgrade-insecure-requests(;|$)/)
  })
})
