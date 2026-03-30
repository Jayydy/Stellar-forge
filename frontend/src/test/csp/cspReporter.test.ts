import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockCaptureException = vi.fn()
vi.mock('../../lib/monitoring/sentry', () => ({
  captureException: mockCaptureException,
}))

function fireViolation(blockedURI = 'https://evil.com', violatedDirective = 'script-src') {
  const event = new Event('securitypolicyviolation') as SecurityPolicyViolationEvent
  Object.defineProperties(event, {
    blockedURI: { value: blockedURI },
    violatedDirective: { value: violatedDirective },
    originalPolicy: { value: "default-src 'self'" },
  })
  document.dispatchEvent(event)
}

describe('cspReporter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('calls captureException with structured context in production', async () => {
    vi.stubEnv('MODE', 'production')
    const { registerCSPReporter } = await import('../../csp/cspReporter')
    registerCSPReporter()
    fireViolation('https://evil.com', 'script-src')
    expect(mockCaptureException).toHaveBeenCalledOnce()
    const [err, ctx] = mockCaptureException.mock.calls[0] as [Error, Record<string, unknown>]
    expect(err.message).toBe('CSP violation: https://evil.com')
    expect(ctx).toMatchObject({ directive: 'script-src', blockedURI: 'https://evil.com' })
    vi.unstubAllEnvs()
  })

  it('calls console.warn instead of captureException in development', async () => {
    vi.stubEnv('MODE', 'development')
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const { registerCSPReporter } = await import('../../csp/cspReporter')
    registerCSPReporter()
    fireViolation()
    expect(mockCaptureException).not.toHaveBeenCalled()
    expect(warnSpy).toHaveBeenCalled()
    vi.unstubAllEnvs()
  })
})
