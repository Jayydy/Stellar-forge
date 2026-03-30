/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_NETWORK: string
  readonly VITE_FACTORY_CONTRACT_ID: string
  readonly VITE_IPFS_API_KEY: string
  readonly VITE_IPFS_API_SECRET: string
  readonly VITE_SENTRY_DSN: string
  readonly VITE_APP_VERSION: string
  readonly MODE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Plausible analytics global — injected via index.html script tag
interface Window {
  plausible?: (
    event: string,
    options?: { props?: Record<string, string | number | boolean>; u?: string },
  ) => void
}
