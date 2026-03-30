import { useState, useCallback } from 'react'

export type TransactionStatus =
  | 'idle'
  | 'simulating'
  | 'signing'
  | 'submitting'
  | 'polling'
  | 'success'
  | 'error'

export interface UseTransactionResult<T> {
  /** Run the transaction. Resolves with the result or throws on error. */
  execute: () => Promise<T>
  reset: () => void
  status: TransactionStatus
  result: T | null
  error: Error | null
}

/**
 * Centralises transaction lifecycle: simulate → sign → submit → poll.
 *
 * @param builder - Async function that performs the full transaction and returns a result.
 *                  Use the `onStatusChange` callback to report fine-grained status transitions.
 */
export function useTransaction<T>(
  builder: (onStatusChange: (status: TransactionStatus) => void) => Promise<T>,
): UseTransactionResult<T> {
  const [status, setStatus] = useState<TransactionStatus>('idle')
  const [result, setResult] = useState<T | null>(null)
  const [error, setError] = useState<Error | null>(null)

  const execute = useCallback(async (): Promise<T> => {
    setStatus('simulating')
    setResult(null)
    setError(null)
    try {
      const value = await builder(setStatus)
      setResult(value)
      setStatus('success')
      return value
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err))
      setError(e)
      setStatus('error')
      throw e
    }
  }, [builder])

  const reset = useCallback(() => {
    setStatus('idle')
    setResult(null)
    setError(null)
  }, [])

  return { execute, reset, status, result, error }
}
