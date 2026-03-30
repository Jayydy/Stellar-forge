import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NotificationProvider, useNotification } from '../contexts/NotificationContext';
import { ToastContainer } from '../components/Toast';

function TestComponent() {
  const { addNotification } = useNotification();
  
  return (
    <div>
      <button onClick={() => addNotification('Test message', 'error')}>
        Add Error
      </button>
      <button onClick={() => addNotification('Success message', 'success')}>
        Add Success
      </button>
      <button onClick={() => addNotification('Info message', 'info', 1000)}>
        Add Info (1s)
      </button>
    </div>
  );
}

describe('Toast Notifications', () => {
  it('displays toast notification when added', async () => {
    const user = userEvent.setup();
    
    render(
      <NotificationProvider>
        <TestComponent />
        <ToastContainer />
      </NotificationProvider>
    );
    
    await user.click(screen.getByText('Add Error'));
    
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('displays multiple notifications', async () => {
    const user = userEvent.setup();
    
    render(
      <NotificationProvider>
        <TestComponent />
        <ToastContainer />
      </NotificationProvider>
    );
    
    await user.click(screen.getByText('Add Error'));
    await user.click(screen.getByText('Add Success'));
    
    expect(screen.getByText('Test message')).toBeInTheDocument();
    expect(screen.getByText('Success message')).toBeInTheDocument();
  });

  it('removes notification when close button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <NotificationProvider>
        <TestComponent />
        <ToastContainer />
      </NotificationProvider>
    );
    
    await user.click(screen.getByText('Add Error'));
    expect(screen.getByText('Test message')).toBeInTheDocument();
    
    const closeButton = screen.getByLabelText('Close notification');
    await user.click(closeButton);
    
    await waitFor(() => {
      expect(screen.queryByText('Test message')).not.toBeInTheDocument();
    });
  });

  it('auto-dismisses notification after duration', async () => {
    vi.useFakeTimers();
    const user = userEvent.setup({ delay: null });
    
    render(
      <NotificationProvider>
        <TestComponent />
        <ToastContainer />
      </NotificationProvider>
    );
    
    await user.click(screen.getByText('Add Info (1s)'));
    expect(screen.getByText('Info message')).toBeInTheDocument();
    
    vi.advanceTimersByTime(1000);
    
    await waitFor(() => {
      expect(screen.queryByText('Info message')).not.toBeInTheDocument();
    });
    
    vi.useRealTimers();
  });
});
