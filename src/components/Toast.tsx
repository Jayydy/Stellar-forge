import React from 'react';
import { useNotification } from '../contexts/NotificationContext';
import './Toast.css';

export function ToastContainer() {
  const { notifications, removeNotification } = useNotification();

  return (
    <div className="toast-container">
      {notifications.map(notification => (
        <div
          key={notification.id}
          className={`toast toast-${notification.type}`}
          role="alert"
        >
          <span className="toast-message">{notification.message}</span>
          <button
            className="toast-close"
            onClick={() => removeNotification(notification.id)}
            aria-label="Close notification"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
