import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { AppError, AppErrorCode } from '../types';

// Component that throws an error
function ThrowError({ error }: { error: Error }) {
  throw error;
}

// Suppress console.error for these tests
const originalError = console.error;
beforeAll(() => {
  console.error = vi.fn();
});

afterAll(() => {
  console.error = originalError;
});

describe('ErrorBoundary', () => {
  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Test Content</div>
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('renders fallback UI when an error is thrown', () => {
    render(
      <ErrorBoundary>
        <ThrowError error={new Error('Test error')} />
      </ErrorBoundary>
    );
    
    expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Test error')).toBeInTheDocument();
  });

  it('shows user-friendly message for AppError', () => {
    const error = new AppError(
      AppErrorCode.INSUFFICIENT_FEE,
      'Fee too low'
    );
    
    render(
      <ErrorBoundary>
        <ThrowError error={error} />
      </ErrorBoundary>
    );
    
    expect(screen.getByText(/Transaction fee is too low/)).toBeInTheDocument();
  });

  it('shows Try Again button', () => {
    render(
      <ErrorBoundary>
        <ThrowError error={new Error('Test')} />
      </ErrorBoundary>
    );
    
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });
});
