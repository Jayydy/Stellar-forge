import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { withRetry, isTransientError, HttpError } from '../utils/retry'

describe('isTransientError', () => {
  it('should identify HttpError transient statuses', () => {
    expect(isTransientError(new HttpError(429, 'Rate Limit'))).toBe(true)
    expect(isTransientError(new HttpError(500, 'Server Error'))).toBe(true)
    expect(isTransientError(new HttpError(503, 'Service Unavailable'))).toBe(true)
    expect(isTransientError(new HttpError(400, 'Bad Request'))).toBe(false)
    expect(isTransientError(new HttpError(404, 'Not Found'))).toBe(false)
  })

  it('should identify network errors as transient', () => {
    expect(isTransientError({ message: 'Network error occurred' })).toBe(true)
    expect(isTransientError({ message: 'Connection timeout' })).toBe(true)
    expect(isTransientError({ code: 'ECONNREFUSED' })).toBe(true)
    expect(isTransientError({ code: 'ETIMEDOUT' })).toBe(true)
    expect(isTransientError({ message: 'Failed to fetch' })).toBe(true)
    expect(isTransientError({ message: 'Aborted' })).toBe(true)
  })

  it('should identify RPC errors as transient in generic objects', () => {
    expect(isTransientError({ message: 'Rate limit exceeded' })).toBe(true)
    expect(isTransientError({ message: 'Too many requests' })).toBe(true)
    expect(isTransientError({ status: 429 })).toBe(true)
    expect(isTransientError({ status: 502 })).toBe(true)
  })

  it('should NOT identify contract errors as transient', () => {
    expect(isTransientError({ message: 'Contract error: invalid operation' })).toBe(false)
    expect(isTransientError({ message: 'Insufficient balance' })).toBe(false)
    expect(isTransientError({ message: 'Invalid parameter provided' })).toBe(false)
  })

  it('should handle null/undefined errors', () => {
    expect(isTransientError(null)).toBe(false)
    expect(isTransientError(undefined)).toBe(false)
  })
})

describe('withRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('should return result on first successful attempt', async () => {
    const fn = vi.fn().mockResolvedValue('success')
    const result = await withRetry(fn)
    expect(result).toBe('success')
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('should respect Retry-After header', async () => {
    const error = new HttpError(429, 'Rate Limit', 5) // 5 seconds
    const fn = vi.fn().mockRejectedValueOnce(error).mockResolvedValue('success')

    const promise = withRetry(fn, { baseDelayMs: 100 })

    // Normal exponential backoff for attempt 1 (base 100 * 2^0) is 100ms.
    // But Retry-After is 5s = 5000ms.
    await vi.advanceTimersByTimeAsync(4900)
    // Should still be waiting
    expect(fn).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(100)
    const result = await promise
    expect(result).toBe('success')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('should fall back to exponential backoff when Retry-After is absent', async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce({ message: 'Network error' })
      .mockResolvedValue('success')

    const promise = withRetry(fn, { baseDelayMs: 1000 })

    await vi.advanceTimersByTimeAsync(900)
    expect(fn).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(100)
    const result = await promise
    expect(result).toBe('success')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('should throw error after max retries (3)', async () => {
    const error = { message: 'Network error' }
    const fn = vi.fn().mockRejectedValue(error)

    const promise = withRetry(fn, { baseDelayMs: 100 })
    const assertion = expect(promise).rejects.toEqual(error)

    await vi.advanceTimersByTimeAsync(100) // attempt 2
    await vi.advanceTimersByTimeAsync(200) // attempt 3
    // total 3 attempts

    await assertion
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('should only log in development mode', async () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const fn = vi.fn().mockRejectedValueOnce({ message: 'Network error' }).mockResolvedValue('ok')

    // Mock import.meta.env.DEV = true
    vi.stubGlobal('import', { meta: { env: { DEV: true } } })

    await withRetry(fn, { baseDelayMs: 10 })
    await vi.runAllTimersAsync()

    expect(consoleSpy).toHaveBeenCalled()

    // Mock import.meta.env.DEV = false
    consoleSpy.mockClear()
    vi.stubGlobal('import', { meta: { env: { DEV: false } } })
    const fn2 = vi.fn().mockRejectedValueOnce({ message: 'Network error' }).mockResolvedValue('ok')

    await withRetry(fn2, { baseDelayMs: 10 })
    await vi.runAllTimersAsync()

    expect(consoleSpy).not.toHaveBeenCalled()
  })
})

