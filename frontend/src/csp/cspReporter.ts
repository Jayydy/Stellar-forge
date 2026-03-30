import { captureException } from '../lib/monitoring/sentry'

let registered = false

/**
 * Registers a SecurityPolicyViolationEvent listener that forwards CSP
 * violations to Sentry in production and console.warn in development.
 * Safe to call multiple times — registers exactly once.
 */
export function registerCSPReporter(): void {
  if (registered) return
  registered = true

  document.addEventListener('securitypolicyviolation', (e: SecurityPolicyViolationEvent) => {
    const context = {
      directive: e.violatedDirective,
      blockedURI: e.blockedURI,
      originalPolicy: e.originalPolicy,
    }

    if (import.meta.env.MODE !== 'production') {
      console.warn('[CSP violation]', e.violatedDirective, e.blockedURI, e)
      return
    }

    captureException(new Error(`CSP violation: ${e.blockedURI}`), context)
  })
}
