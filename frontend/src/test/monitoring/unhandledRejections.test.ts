import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockCaptureException = vi.fn()
vi.mock('../../lib/monitoring/sentry', () => ({
  captureException: mockCaptureException,
}))

describe('unhandledRejections', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()
    vi.stubEnv('MODE', 'production')
  })

  function fireRejection(reason: unknown) {
    const event = new PromiseRejectionEvent('unhandledrejection', {
      promise: Promise.resolve(),
      reason,
      cancelable: true,
      bubbles: false,
    })
    window.dispatchEvent(event)
  }

  it('calls captureException with an Error when reason is an Error', async () => {
    await import('../../lib/monitoring/unhandledRejections').then((m) =>
      m.registerUnhandledRejectionHandler(),
    )
    const err = new Error('real error')
    fireRejection(err)
    expect(mockCaptureException).toHaveBeenCalledWith(err, { type: 'unhandledrejection' })
  })

  it('wraps plain string reason in an Error instance', async () => {
    await import('../../lib/monitoring/unhandledRejections').then((m) =>
      m.registerUnhandledRejectionHandler(),
    )
    fireRejection('something went wrong')
    const [captured] = mockCaptureException.mock.calls[0] as [Error]
    expect(captured).toBeInstanceOf(Error)
    expect(captured.message).toBe('something went wrong')
  })

  it('does not call captureException in development', async () => {
    vi.unstubAllEnvs()
    vi.stubEnv('MODE', 'development')
    await import('../../lib/monitoring/unhandledRejections').then((m) =>
      m.registerUnhandledRejectionHandler(),
    )
    fireRejection('dev error')
    expect(mockCaptureException).not.toHaveBeenCalled()
    vi.unstubAllEnvs()
  })
})
