/**
 * Analytics service — privacy-respecting event tracking via Plausible.
 *
 * Rules:
 * - No PII, no wallet addresses, no personal data is ever sent.
 * - All tracking is skipped when the user has opted out.
 * - All tracking is skipped when VITE_PLAUSIBLE_DOMAIN is not configured.
 */

const OPT_OUT_KEY = 'analytics_opt_out'

export function isOptedOut(): boolean {
  try {
    return localStorage.getItem(OPT_OUT_KEY) === 'true'
  } catch {
    return false
  }
}

export function setOptOut(value: boolean): void {
  try {
    if (value) {
      localStorage.setItem(OPT_OUT_KEY, 'true')
    } else {
      localStorage.removeItem(OPT_OUT_KEY)
    }
  } catch {
    // localStorage unavailable — silently ignore
  }
}

function isEnabled(): boolean {
  return !!import.meta.env.VITE_PLAUSIBLE_DOMAIN && !isOptedOut()
}

/**
 * Track a custom event. Props must never contain PII or wallet addresses.
 */
export function trackEvent(name: string, props?: Record<string, string | number | boolean>): void {
  if (!isEnabled()) return

  try {
    // Plausible's custom event API
    // https://plausible.io/docs/custom-event-goals
    window.plausible?.(name, props ? { props } : undefined)
  } catch {
    // Never let analytics errors surface to users
  }
}

/**
 * Track a page view for the given path.
 * Called manually on route changes since Plausible's script handles SPAs
 * only when using their hash-based router integration.
 */
export function trackPageView(path: string): void {
  if (!isEnabled()) return

  try {
    window.plausible?.('pageview', { u: `${window.location.origin}${path}` })
  } catch {
    // Never let analytics errors surface to users
  }
}
