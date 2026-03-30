import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ToastNotification } from '../types';

interface NotificationContextType {
  notifications: ToastNotification[];
  addNotification: (message: string, type?: ToastNotification['type'], duration?: number) => void;
  removeNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<ToastNotification[]>([]);

  const addNotification = useCallback((
    message: string,
    type: ToastNotification['type'] = 'info',
    duration: number = 5000
  ) => {
    const id = `${Date.now()}-${Math.random()}`;
    const notification: ToastNotification = { id, message, type, duration };
    
    setNotifications(prev => [...prev, notification]);

    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, removeNotification }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within NotificationProvider');
  }
  return context;
}
