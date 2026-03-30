import { captureException, setTag } from './sentry'

/**
 * Captures a Horizon API failure.
 *
 * Expected Sentry alert rule:
 *   - Filter: tag `category` = `horizon_api`
 *   - Condition: event count > 10 in 5 minutes
 *   - Action: notify on-call channel
 */
export function captureHorizonFailure(
  endpoint: string,
  status: number,
  responseTime: number,
): void {
  setTag('category', 'horizon_api')
  captureException(new Error(`Horizon API failure: ${status} on ${endpoint}`), {
    endpoint,
    status,
    responseTime,
  })
}

/**
 * Captures an IPFS operation failure.
 *
 * Expected Sentry alert rule:
 *   - Filter: tag `category` = `ipfs`
 *   - Condition: event count > 5 in 10 minutes
 *   - Action: notify on-call channel
 */
export function captureIPFSFailure(
  operation: 'upload' | 'fetch',
  cid: string | undefined,
  error: Error,
): void {
  setTag('category', 'ipfs')
  captureException(error, { operation, cid })
}

/**
 * Captures a Soroban contract call failure.
 *
 * Expected Sentry alert rule:
 *   - Filter: tag `category` = `contract`
 *   - Condition: any occurrence
 *   - Action: notify on-call channel immediately
 */
export function captureContractFailure(method: string, error: Error, txHash?: string): void {
  setTag('category', 'contract')
  captureException(error, { method, txHash })
}
