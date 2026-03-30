import { useEffect, useRef } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { Button } from './Button'

interface QRCodeModalProps {
  isOpen: boolean
  address: string
  onClose: () => void
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ isOpen, address, onClose }) => {
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!isOpen) return
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleDownload = () => {
    const canvas = document.getElementById('token-qr-canvas') as HTMLCanvasElement | null
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `${address}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="qr-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-xs w-full mx-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2
            id="qr-modal-title"
            className="text-lg font-semibold text-gray-900 dark:text-gray-100"
          >
            Token Address QR
          </h2>
          <button
            ref={closeRef}
            onClick={onClose}
            aria-label="Close QR modal"
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
          >
            ✕
          </button>
        </div>

        <div className="flex justify-center">
          <QRCodeCanvas id="token-qr-canvas" value={address} size={200} />
        </div>

        <p className="text-xs font-mono break-all text-center text-gray-600 dark:text-gray-400">
          {address}
        </p>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
          <Button variant="primary" size="sm" onClick={handleDownload}>
            Download PNG
          </Button>
        </div>
      </div>
    </div>
  )
}
