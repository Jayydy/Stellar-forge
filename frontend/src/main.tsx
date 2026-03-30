import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import './index.css'
import './i18n'
import App from './App.tsx'
import { MisconfigurationScreen } from './components/MisconfigurationScreen.tsx'
import ErrorBoundary from './components/ErrorBoundary.tsx'
import { validateEnv } from './utils/envValidation.ts'
import { ErrorBoundary } from './lib/monitoring/errorBoundary.tsx'
import { registerUnhandledRejectionHandler } from './lib/monitoring/unhandledRejections.ts'
import { registerCSPReporter } from './csp/cspReporter.ts'

// Must run before React mounts
registerUnhandledRejectionHandler()
registerCSPReporter()

const { valid, missing } = validateEnv()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      {valid ? <App /> : <MisconfigurationScreen missing={missing} />}
    </ErrorBoundary>
  </StrictMode>,
)
