import { useState, useEffect } from 'react'
import { Button } from './Button'

interface TermsModalProps {
  isOpen: boolean
  onAccept: () => void
}

export const TermsModal: React.FC<TermsModalProps> = ({ isOpen, onAccept }) => {
  const [checked, setChecked] = useState(false)

  // Block Escape key — modal is non-dismissible
  useEffect(() => {
    if (!isOpen) return
    const block = (e: KeyboardEvent) => {
      if (e.key === 'Escape') e.stopImmediatePropagation()
    }
    document.addEventListener('keydown', block, true)
    return () => document.removeEventListener('keydown', block, true)
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tos-modal-title"
      // Swallow backdrop clicks — non-dismissible
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h2
            id="tos-modal-title"
            className="text-xl font-semibold text-gray-900 dark:text-gray-100"
          >
            Terms of Service &amp; Risk Disclosure
          </h2>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          <ul className="space-y-3 text-sm text-gray-700 dark:text-gray-300 list-disc list-inside">
            <li>
              <span className="font-medium">Testnet vs Mainnet:</span> Testnet tokens have no real
              value and are used for testing only. Mainnet transactions involve real assets and are
              irreversible. Always verify the active network before submitting a transaction.
            </li>
            <li>
              <span className="font-medium">No warranty:</span> This application is provided
              &ldquo;as is&rdquo; without warranty of any kind, express or implied. The authors make
              no guarantees regarding availability, accuracy, or fitness for a particular purpose.
            </li>
            <li>
              <span className="font-medium">Financial responsibility:</span> You assume full
              responsibility for any financial losses, including but not limited to lost tokens,
              failed transactions, or incorrect contract interactions resulting from your use of
              this application.
            </li>
          </ul>

          {/* Checkbox */}
          <label htmlFor="tos-accept" className="flex items-start gap-3 cursor-pointer mt-4">
            <input
              id="tos-accept"
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-800 dark:text-gray-200">
              I understand the risks and accept the Terms of Service.
            </span>
          </label>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between gap-4">
          <a
            href="/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Read full terms document
          </a>
          <Button onClick={onAccept} disabled={!checked}>
            Accept
          </Button>
        </div>
      </div>
    </div>
  )
}
