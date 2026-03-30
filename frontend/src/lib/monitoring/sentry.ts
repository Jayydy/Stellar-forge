import * as Sentry from '@sentry/react'
import type { SeverityLevel, Scope } from '@sentry/react'
import type React from 'react'

const IS_PRODUCTION = import.meta.env.MODE === 'production'

if (IS_PRODUCTION) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_APP_VERSION ?? 'unknown',
    tracesSampleRate: 0.2,
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0.05,
    integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],
  })
}

export interface ErrorContext {
  [key: string]: unknown
}

export function captureException(error: Error, context?: ErrorContext): void {
  if (!IS_PRODUCTION) return
  Sentry.withScope((scope: Scope) => {
    if (context) scope.setExtras(context)
    Sentry.captureException(error)
  })
}

export function captureMessage(message: string, level: SeverityLevel = 'info'): void {
  if (!IS_PRODUCTION) return
  Sentry.captureMessage(message, level)
}

export interface UserContext {
  id: string
  email?: string
  username?: string
}

export function setUserContext(user: UserContext): void {
  if (!IS_PRODUCTION) return
  Sentry.setUser(user)
}

export function setTag(key: string, value: string): void {
  if (!IS_PRODUCTION) return
  Sentry.setTag(key, value)
}

export function withSentryProfiler<P extends object>(
  Component: React.ComponentType<P>,
): React.ComponentType<P> {
  if (!IS_PRODUCTION) return Component
  return Sentry.withProfiler(Component)
}
