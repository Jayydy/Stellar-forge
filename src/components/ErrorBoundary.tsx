import React, { Component, ReactNode, ErrorInfo } from 'react';
import { AppError, AppErrorCode } from '../types';
import { getErrorMessage } from '../utils/errorMessages';

interface Props {
  children: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render() {
    if (this.state.hasError) {
      const error = this.state.error;
      let errorMessage = 'An unexpected error occurred';

      if (error instanceof AppError) {
        errorMessage = getErrorMessage(error.code);
      } else if (error?.message) {
        errorMessage = error.message;
      }

      return (
        <div className="error-boundary-fallback">
          <div className="error-boundary-content">
            <h1>Oops! Something went wrong</h1>
            <p>{errorMessage}</p>
            <button onClick={this.handleReset} className="error-boundary-button">
              Try Again
            </button>
            {process.env.NODE_ENV === 'development' && error && (
              <details className="error-boundary-details">
                <summary>Error Details (Development Only)</summary>
                <pre>{error.stack}</pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
