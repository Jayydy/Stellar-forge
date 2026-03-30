/**
 * Maps Soroban contract error codes to user-friendly messages.
 * Codes correspond to the Error enum in the token-factory contract.
 */
export const CONTRACT_ERROR_MESSAGES: Record<number, string> = {
  1: 'Insufficient fee payment. Please increase the fee amount.',
  2: 'Unauthorized. You do not have permission to perform this action.',
  3: 'Invalid parameters provided.',
  4: 'Token not found.',
  5: 'Metadata has already been set for this token.',
  6: 'Contract is already initialized.',
  7: 'Burn amount exceeds your token balance.',
  8: 'Burning is not enabled for this token.',
  9: 'Invalid burn amount. Must be greater than zero.',
  10: 'Contract is paused. Please try again later.',
}

/**
 * Parses a raw contract error into a human-readable Error.
 * Soroban contract errors surface as "Error(Contract, X)" in result XDR.
 * Unknown codes fall back to a generic message.
 */
export function parseContractError(err: unknown): Error {
  const msg = err instanceof Error ? err.message : String(err)

  // User rejected the transaction in Freighter
  if (
    msg.toLowerCase().includes('user declined') ||
    msg.toLowerCase().includes('user rejected') ||
    msg.toLowerCase().includes('rejected by user')
  ) {
    return new Error('Transaction rejected. You declined the signing request in your wallet.')
  }

  // Insufficient XLM to cover fees
  if (
    msg.toLowerCase().includes('insufficient') ||
    msg.toLowerCase().includes('op_underfunded') ||
    msg.toLowerCase().includes('balance')
  ) {
    return new Error('Insufficient funds. Your XLM balance is too low to cover this transaction.')
  }

  // Network / RPC timeout
  if (
    msg.toLowerCase().includes('timeout') ||
    msg.toLowerCase().includes('timed out') ||
    msg.toLowerCase().includes('network')
  ) {
    return new Error('Network timeout. The Stellar network did not respond in time. Please retry.')
  }

  const match = msg.match(/Error\(Contract,\s*(\d+)\)/)
  if (match?.[1]) {
    const code = parseInt(match[1], 10)
    return new Error(
      CONTRACT_ERROR_MESSAGES[code] ?? `An unexpected contract error occurred (code ${code}).`,
    )
  }

  if (msg.includes('simulation')) return new Error(`Simulation failed: ${msg}`)

  return err instanceof Error ? err : new Error(msg)
}
