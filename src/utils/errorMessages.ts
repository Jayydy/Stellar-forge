import { AppErrorCode } from '../types';

// Map error codes to user-friendly messages
export const ERROR_MESSAGES: Record<AppErrorCode, string> = {
  [AppErrorCode.INSUFFICIENT_FEE]: 'Transaction fee is too low. Please increase the fee and try again.',
  [AppErrorCode.UNAUTHORIZED]: 'You are not authorized to perform this action.',
  [AppErrorCode.NETWORK_ERROR]: 'Network connection failed. Please check your connection and try again.',
  [AppErrorCode.CONTRACT_ERROR]: 'Smart contract operation failed. Please try again.',
  [AppErrorCode.VALIDATION_ERROR]: 'Invalid input. Please check your data and try again.',
  [AppErrorCode.UNKNOWN_ERROR]: 'An unexpected error occurred. Please try again.',
};

export function getErrorMessage(code: AppErrorCode): string {
  return ERROR_MESSAGES[code] || ERROR_MESSAGES[AppErrorCode.UNKNOWN_ERROR];
}
