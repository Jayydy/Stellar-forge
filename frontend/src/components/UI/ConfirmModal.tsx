import { useEffect, useRef } from 'react'
import { Button } from './Button'

export interface DetailRow {
  label: string
  value: string | number
}

interface ConfirmModalProps {
  isOpen: boolean
  title: string
  description?: string
  details: DetailRow[]
  onConfirm: () => void
  onCancel: () => void
  confirmLabel?: string
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  description,
  details,
  onConfirm,
  onCancel,
  confirmLabel = 'Confirm',
}) => {
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!isOpen) return
    cancelRef.current?.focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onCancel])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
          <h2
            id="confirm-modal-title"
            className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100"
          >
            {title}
          </h2>

          {description && <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{description}</p>}

          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg divide-y divide-gray-200 dark:divide-gray-600">
            {details.map(({ label, value }) => (
              <div key={label} className="flex flex-col sm:flex-row sm:justify-between px-3 sm:px-4 py-2 text-xs sm:text-sm gap-1">
                <span className="text-gray-500 dark:text-gray-400 font-medium">{label}</span>
                <span className="font-medium text-gray-900 dark:text-gray-100 break-all">
                  {value}
                </span>
              </div>
            ))}
          </div>

          <div className="flex gap-2 sm:gap-3 justify-end pt-2 flex-wrap">
            <Button ref={cancelRef} variant="outline" onClick={onCancel} className="flex-1 sm:flex-initial">
              Cancel
            </Button>
            <Button variant="primary" onClick={onConfirm} className="flex-1 sm:flex-initial">
              {confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
