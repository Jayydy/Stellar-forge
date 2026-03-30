import { useCallback } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import { AppError, AppErrorCode } from '../types';
import { getErrorMessage } from '../utils/errorMessages';

export function useErrorHandler() {
  const { addNotification } = useNotification();

  const handleError = useCallback((error: unknown) => {
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error caught:', error);
    }

    let message: string;
    let code: AppErrorCode;

    if (error instanceof AppError) {
      code = error.code;
      message = getErrorMessage(code);
    } else if (error instanceof Error) {
      // Try to parse contract errors
      const errorMessage = error.message.toLowerCase();
      
      if (errorMessage.includes('insufficient') && errorMessage.includes('fee')) {
        code = AppErrorCode.INSUFFICIENT_FEE;
      } else if (errorMessage.includes('unauthorized') || errorMessage.includes('permission')) {
        code = AppErrorCode.UNAUTHORIZED;
      } else if (errorMessage.includes('network') || errorMessage.includes('connection')) {
        code = AppErrorCode.NETWORK_ERROR;
      } else {
        code = AppErrorCode.UNKNOWN_ERROR;
      }
      
      message = getErrorMessage(code);
    } else {
      code = AppErrorCode.UNKNOWN_ERROR;
      message = getErrorMessage(code);
    }

    addNotification(message, 'error');
  }, [addNotification]);

  return { handleError };
}
