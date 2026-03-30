// Retry utility with exponential backoff for transient errors

export interface RetryOptions {
  maxAttempts?: number
  baseDelayMs?: number
  shouldRetry?: (error: unknown) => boolean
}

const DEFAULT_MAX_ATTEMPTS = 3
const DEFAULT_BASE_DELAY_MS = 1000 // Increased from 500ms

/**
 * Custom error class for HTTP-related failures
 */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public retryAfter?: number
  ) {
    super(message)
    this.name = 'HttpError'
  }
}

/**
 * Determines if an error is transient and should be retried
 */
export const isTransientError = (error: unknown): boolean => {
  if (!error) return false

  // If it's our custom HttpError, check status
  if (error instanceof HttpError) {
    return error.status === 429 || (error.status >= 500 && error.status < 600)
  }

  const err = error as Record<string, unknown>
  const errorMessage = (err.message as string)?.toLowerCase() || ''
  const errorCode = (err.code as string)?.toLowerCase() || ''

  // Network errors - should retry
  const networkErrors = [
    'network',
    'timeout',
    'econnrefused',
    'enotfound',
    'etimedout',
    'fetch failed',
    'failed to fetch',
    'aborted',
  ]

  // RPC/Server errors - should retry
  const rpcErrors = [
    'rate limit',
    'too many requests',
    'service unavailable',
    'internal server error',
    'bad gateway',
    '502',
    '503',
    '504',
  ]

  // Contract/Auth errors - should NOT retry
  const nonRetryableErrors = [
    'unauthorized',
    'forbidden',
    'invalid signature',
    'insufficient balance',
    'contract error',
    'invalid parameter',
    'already exists',
  ]

  // Check if it's a non-retryable error first
  for (const pattern of nonRetryableErrors) {
    if (errorMessage.includes(pattern) || errorCode.includes(pattern)) {
      return false
    }
  }

  // Check if it's a retryable error
  for (const pattern of [...networkErrors, ...rpcErrors]) {
    if (errorMessage.includes(pattern) || errorCode.includes(pattern)) {
      return true
    }
  }

  // HTTP status codes (Generic handle)
  if (typeof err.status === 'number') {
    const status = err.status
    if (status === 429 || (status >= 500 && status < 600)) {
      return true
    }
    if (status >= 400 && status < 500) {
      return false
    }
  }

  return false
}

/**
 * Executes a function with retry logic and exponential backoff
 * @param fn - The async function to execute
 * @param options - Retry configuration options
 * @returns Promise resolving to the function result
 */
export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const {
    maxAttempts = DEFAULT_MAX_ATTEMPTS,
    baseDelayMs = DEFAULT_BASE_DELAY_MS,
    shouldRetry = isTransientError,
  } = options

  let lastError: unknown

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      // Check if we should retry this error
      if (!shouldRetry(error)) {
        throw error
      }

      // Don't delay after the last attempt
      if (attempt === maxAttempts) {
        break
      }

      // Exponential backoff before next attempt
      const delayMs = baseDelayMs * Math.pow(2, attempt - 1)
      void error // consumed by caller on final throw

      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }

  // All attempts failed
  throw lastError
}

