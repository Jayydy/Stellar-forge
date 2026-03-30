import React from 'react'
import { useToast, type Toast } from '../../context/ToastContext'

const STYLES: Record<Toast['variant'], string> = {
  success: 'bg-green-600',
  error: 'bg-red-600',
  warning: 'bg-yellow-500',
  info: 'bg-gray-800',
}

const ToastItem: React.FC<{ toast: Toast }> = ({ toast }) => {
  const { removeToast } = useToast()
  return (
    <div
      className={`flex items-center justify-between gap-4 px-4 py-3 rounded-lg shadow-lg text-white text-sm min-w-64 ${STYLES[toast.variant]}`}
    >
      <span>{toast.message}</span>
      <button
        onClick={() => removeToast(toast.id)}
        aria-label="Dismiss notification"
        className="text-white/80 hover:text-white focus:outline-none focus:ring-2 focus:ring-white rounded"
      >
        ✕
      </button>
    </div>
  )
}

export const ToastContainer: React.FC = () => {
  const { toasts } = useToast()
  return (
    <div
      role="region"
      aria-live="polite"
      aria-label="Notifications"
      className="fixed top-4 right-4 z-50 flex flex-col gap-2"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  )
}
