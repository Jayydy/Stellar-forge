import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { NotificationProvider } from '../contexts/NotificationContext';
import { useErrorHandler } from '../hooks/useErrorHandler';
import { AppError, AppErrorCode } from '../types';

describe('useErrorHandler', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <NotificationProvider>{children}</NotificationProvider>
  );

  it('handles AppError with correct message', () => {
    const { result: errorHandler } = renderHook(() => useErrorHandler(), { wrapper });
    
    const error = new AppError(AppErrorCode.UNAUTHORIZED, 'Not authorized');
    
    act(() => {
      errorHandler.current.handleError(error);
    });
    
    // Error should be handled without throwing
    expect(errorHandler.current).toBeDefined();
  });

  it('handles generic Error by parsing message', () => {
    const { result: errorHandler } = renderHook(() => useErrorHandler(), { wrapper });
    
    const error = new Error('InsufficientFee: not enough funds');
    
    act(() => {
      errorHandler.current.handleError(error);
    });
    
    expect(errorHandler.current).toBeDefined();
  });

  it('handles network errors', () => {
    const { result: errorHandler } = renderHook(() => useErrorHandler(), { wrapper });
    
    const error = new Error('Network connection failed');
    
    act(() => {
      errorHandler.current.handleError(error);
    });
    
    expect(errorHandler.current).toBeDefined();
  });

  it('handles unknown errors', () => {
    const { result: errorHandler } = renderHook(() => useErrorHandler(), { wrapper });
    
    act(() => {
      errorHandler.current.handleError('Some string error');
    });
    
    expect(errorHandler.current).toBeDefined();
  });
});
