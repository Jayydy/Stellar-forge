import { describe, it, expect } from 'vitest';
import { getErrorMessage } from '../utils/errorMessages';
import { AppErrorCode } from '../types';

describe('Error Messages', () => {
  it('returns correct message for INSUFFICIENT_FEE', () => {
    const message = getErrorMessage(AppErrorCode.INSUFFICIENT_FEE);
    expect(message).toBe('Transaction fee is too low. Please increase the fee and try again.');
  });

  it('returns correct message for UNAUTHORIZED', () => {
    const message = getErrorMessage(AppErrorCode.UNAUTHORIZED);
    expect(message).toBe('You are not authorized to perform this action.');
  });

  it('returns correct message for NETWORK_ERROR', () => {
    const message = getErrorMessage(AppErrorCode.NETWORK_ERROR);
    expect(message).toBe('Network connection failed. Please check your connection and try again.');
  });

  it('returns correct message for CONTRACT_ERROR', () => {
    const message = getErrorMessage(AppErrorCode.CONTRACT_ERROR);
    expect(message).toBe('Smart contract operation failed. Please try again.');
  });

  it('returns correct message for VALIDATION_ERROR', () => {
    const message = getErrorMessage(AppErrorCode.VALIDATION_ERROR);
    expect(message).toBe('Invalid input. Please check your data and try again.');
  });

  it('returns correct message for UNKNOWN_ERROR', () => {
    const message = getErrorMessage(AppErrorCode.UNKNOWN_ERROR);
    expect(message).toBe('An unexpected error occurred. Please try again.');
  });
});
