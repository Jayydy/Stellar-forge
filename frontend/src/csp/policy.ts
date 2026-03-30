/**
 * Single source of truth for the Content Security Policy.
 *
 * All deployment configs (vercel.json, public/_headers) are generated from
 * this file via `scripts/generateCSP.ts`. Never hardcode the CSP string
 * elsewhere — run `npm run prebuild` to sync configs after editing this file.
 */

export type CSPDirectiveValue = string[]

export type CSPDirectives = {
  /** Fallback for fetch directives not explicitly listed. */
  'default-src': CSPDirectiveValue
  /**
   * Controls which scripts can execute.
   * 'unsafe-inline' and 'unsafe-eval' are intentionally absent — they negate
   * XSS protection entirely. Vite bundles everything into hashed chunks so
   * no inline scripts are needed in production.
   */
  'script-src': CSPDirectiveValue
  /**
   * 'unsafe-inline' is required because Tailwind CSS injects styles at
   * runtime via the style attribute and <style> tags. Until the project
   * migrates to build-time CSS extraction this cannot be removed.
   */
  'style-src': CSPDirectiveValue
  /** Images: self, inline data URIs (QR codes), and Pinata IPFS gateway. */
  'img-src': CSPDirectiveValue
  /**
   * XHR/fetch/WebSocket origins.
   * Includes both Horizon and Soroban RPC endpoints for testnet and mainnet,
   * Pinata API for IPFS uploads, and Sentry ingest for error reporting.
   */
  'connect-src': CSPDirectiveValue
  /** Self-hosted fonts only — no Google Fonts or CDN fonts. */
  'font-src': CSPDirectiveValue
  /** Blocks Flash, Java applets, and other plugins entirely. */
  'object-src': CSPDirectiveValue
  /**
   * Restricts the <base> tag to prevent base-tag hijacking attacks that
   * redirect relative URLs to attacker-controlled origins.
   */
  'base-uri': CSPDirectiveValue
  /**
   * Prevents the app from being embedded in iframes on other origins,
   * blocking clickjacking attacks. Must be enforced as an HTTP header —
   * browsers ignore frame-ancestors in meta tags.
   */
  'frame-ancestors': CSPDirectiveValue
  /** Restricts where forms can submit to, preventing data exfiltration. */
  'form-action': CSPDirectiveValue
  /**
   * Automatically upgrades http:// requests to https:// in production,
   * preventing mixed-content attacks.
   */
  'upgrade-insecure-requests': CSPDirectiveValue
  /** Restricts which origins can be loaded in workers/service workers. */
  'worker-src': CSPDirectiveValue
}

export const CSP_DIRECTIVES: CSPDirectives = {
  'default-src': ["'self'"],
  'script-src': ["'self'"],
  'style-src': ["'self'", "'unsafe-inline'"],
  'img-src': ["'self'", 'data:', 'https://gateway.pinata.cloud'],
  'connect-src': [
    "'self'",
    'https://horizon.stellar.org',
    'https://horizon-testnet.stellar.org',
    'https://soroban-testnet.stellar.org',
    'https://rpc-mainnet.stellar.org',
    'https://gateway.pinata.cloud',
    'https://api.pinata.cloud',
    'https://*.ingest.sentry.io',
  ],
  'font-src': ["'self'"],
  'object-src': ["'none'"],
  'base-uri': ["'self'"],
  'frame-ancestors': ["'none'"],
  'form-action': ["'self'"],
  'upgrade-insecure-requests': [],
  'worker-src': ['blob:'],
}

/**
 * Serializes a CSPDirectives object into a valid CSP header string.
 * Directives with empty value arrays are emitted as bare keywords (e.g. upgrade-insecure-requests).
 */
export function buildCSPString(directives: CSPDirectives): string {
  return Object.entries(directives)
    .map(([directive, values]) =>
      values.length > 0 ? `${directive} ${values.join(' ')}` : directive,
    )
    .join('; ')
}

/**
 * Returns the value for a <meta http-equiv="Content-Security-Policy"> tag.
 *
 * NOTE: meta tags cannot enforce frame-ancestors or X-Frame-Options.
 * This output is for development only. Production security depends on
 * HTTP headers set in vercel.json / public/_headers.
 */
export function buildCSPMeta(directives: CSPDirectives): string {
  return buildCSPString(directives)
}
