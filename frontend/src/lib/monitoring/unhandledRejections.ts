import { captureException } from './sentry'

class UnhandledRejectionError extends Error {
  constructor(reason: unknown) {
    super(typeof reason === 'string' ? reason : `Unhandled rejection: ${String(reason)}`)
    this.name = 'UnhandledRejectionError'
  }
}

let registered = false

export function registerUnhandledRejectionHandler(): void {
  if (registered) return
  registered = true

  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    const reason: unknown = event.reason
    const error = reason instanceof Error ? reason : new UnhandledRejectionError(reason)

    if (import.meta.env.MODE !== 'production') {
      console.warn('[unhandledrejection]', error)
      return
    }

    captureException(error, { type: 'unhandledrejection' })
  })
}
