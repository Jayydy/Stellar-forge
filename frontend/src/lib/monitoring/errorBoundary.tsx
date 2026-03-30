import { Component, type ErrorInfo, type ReactNode } from 'react'
import { captureException } from './sentry'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    captureException(error, { componentStack: info.componentStack ?? undefined })
  }

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children
    if (this.props.fallback) return this.props.fallback
    return (
      <div role="alert" style={{ padding: '2rem', textAlign: 'center' }}>
        <h2>Something went wrong</h2>
        <p>An unexpected error occurred. Our team has been notified.</p>
        <button onClick={() => window.location.reload()}>Reload page</button>
        <p>
          Need help?{' '}
          <a href="mailto:support@stellarforge.app">Contact support</a>
        </p>
      </div>
    )
  }
}
