// Error codes for the application
export enum AppErrorCode {
  INSUFFICIENT_FEE = 'INSUFFICIENT_FEE',
  UNAUTHORIZED = 'UNAUTHORIZED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  CONTRACT_ERROR = 'CONTRACT_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

export class AppError extends Error {
  constructor(
    public code: AppErrorCode,
    message: string,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export interface ToastNotification {
  id: string;
  message: string;
  type: 'error' | 'success' | 'info' | 'warning';
  duration?: number;
}
