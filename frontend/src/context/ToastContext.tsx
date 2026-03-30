import { createContext, useCallback, useContext, useRef, useState } from 'react'

export type ToastVariant = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: number
  message: string
  variant: ToastVariant
}

interface ToastContextValue {
  toasts: Toast[]
  addToast: (message: string, variant?: ToastVariant) => void
  removeToast: (id: number) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(0)

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const addToast = useCallback(
    (message: string, variant: ToastVariant = 'info') => {
      const id = nextId.current++
      setToasts((prev) => [...prev, { id, message, variant }])
      setTimeout(() => removeToast(id), 5000)
    },
    [removeToast],
  )

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}
