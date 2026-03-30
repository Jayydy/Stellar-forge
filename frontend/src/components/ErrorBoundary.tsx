import { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[ErrorBoundary] Uncaught error:', error, errorInfo.componentStack)
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-slate-900">
          <div className="bg-white dark:bg-slate-800 p-8 rounded-lg shadow-lg max-w-md w-full text-center">
            <div className="text-red-500 mb-4">
              <svg className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Something went wrong
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-2">
              An unexpected error occurred. Please try reloading the page.
            </p>
            {this.state.error && (
              <p className="text-xs text-gray-400 dark:text-gray-500 font-mono mb-6 break-all">
                {this.state.error.message}
              </p>
            )}
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-400 text-white font-medium py-2 px-6 rounded-lg transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
