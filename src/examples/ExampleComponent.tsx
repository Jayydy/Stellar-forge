import React, { useState } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import { useErrorHandler } from '../hooks/useErrorHandler';
import { AppError, AppErrorCode } from '../types';

/**
 * Example component demonstrating error handling patterns
 */
export function ExampleComponent() {
  const { addNotification } = useNotification();
  const { handleError } = useErrorHandler();
  const [loading, setLoading] = useState(false);

  // Example 1: Handling contract errors with useErrorHandler
  const handleContractCall = async () => {
    setLoading(true);
    try {
      // Simulate contract call that might fail
      await simulateContractCall();
      addNotification('Transaction successful!', 'success');
    } catch (error) {
      // useErrorHandler automatically maps errors to user-friendly messages
      handleError(error);
    } finally {
      setLoading(false);
    }
  };

  // Example 2: Throwing AppError with specific code
  const handleValidation = () => {
    try {
      const isValid = validateInput('');
      if (!isValid) {
        throw new AppError(
          AppErrorCode.VALIDATION_ERROR,
          'Input validation failed'
        );
      }
      addNotification('Validation passed', 'success');
    } catch (error) {
      handleError(error);
    }
  };

  // Example 3: Manual notification for non-error messages
  const handleInfo = () => {
    addNotification('This is an informational message', 'info');
  };

  const handleWarning = () => {
    addNotification('This is a warning message', 'warning');
  };

  // Example 4: Triggering error boundary (will crash component tree)
  const triggerErrorBoundary = () => {
    throw new Error('This error will be caught by ErrorBoundary');
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Error Handling Examples</h2>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '300px' }}>
        <button onClick={handleContractCall} disabled={loading}>
          {loading ? 'Processing...' : 'Simulate Contract Call'}
        </button>
        
        <button onClick={handleValidation}>
          Test Validation Error
        </button>
        
        <button onClick={handleInfo}>
          Show Info Toast
        </button>
        
        <button onClick={handleWarning}>
          Show Warning Toast
        </button>
        
        <button onClick={triggerErrorBoundary} style={{ background: '#ef4444', color: 'white' }}>
          Trigger Error Boundary (Crash)
        </button>
      </div>
    </div>
  );
}

// Simulated functions
async function simulateContractCall() {
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Randomly fail with different error types
  const random = Math.random();
  if (random < 0.3) {
    throw new Error('InsufficientFee: Transaction fee too low');
  } else if (random < 0.5) {
    throw new AppError(AppErrorCode.UNAUTHORIZED, 'User not authorized');
  } else if (random < 0.7) {
    throw new Error('Network connection failed');
  }
  // Otherwise succeed
}

function validateInput(input: string): boolean {
  return input.length > 0;
}
