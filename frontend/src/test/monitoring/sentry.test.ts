import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as SentrySDK from '@sentry/react'

// Must mock before importing the module under test
vi.mock('@sentry/react', () => ({
  init: vi.fn(),
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  setUser: vi.fn(),
  setTag: vi.fn(),
  withScope: vi.fn((cb: (scope: { setExtras: () => void }) => void) =>
    cb({ setExtras: vi.fn() }),
  ),
  withProfiler: vi.fn((c) => c),
  browserTracingIntegration: vi.fn(),
  replayIntegration: vi.fn(),
  ErrorBoundary: ({ children }: { children: unknown }) => children,
}))

describe('sentry.ts', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('does not call Sentry.init in development', async () => {
    vi.stubEnv('MODE', 'development')
    await import('../../lib/monitoring/sentry')
    expect(SentrySDK.init).not.toHaveBeenCalled()
    vi.unstubAllEnvs()
  })

  it('calls Sentry.init in production', async () => {
    vi.stubEnv('MODE', 'production')
    await import('../../lib/monitoring/sentry')
    expect(SentrySDK.init).toHaveBeenCalledOnce()
    vi.unstubAllEnvs()
  })

  it('captureException calls Sentry.captureException with correct args in production', async () => {
    vi.stubEnv('MODE', 'production')
    const { captureException } = await import('../../lib/monitoring/sentry')
    const err = new Error('test')
    captureException(err, { foo: 'bar' })
    expect(SentrySDK.captureException).toHaveBeenCalledWith(err)
    vi.unstubAllEnvs()
  })

  it('captureException is a no-op in development', async () => {
    vi.stubEnv('MODE', 'development')
    const { captureException } = await import('../../lib/monitoring/sentry')
    captureException(new Error('noop'))
    expect(SentrySDK.captureException).not.toHaveBeenCalled()
    vi.unstubAllEnvs()
  })
})
