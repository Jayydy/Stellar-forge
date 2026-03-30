import { useEffect, useRef, useState } from 'react'
import { Button } from './Button'

const STEPS = [
  {
    title: 'Welcome to StellarForge 🚀',
    body: 'StellarForge lets you deploy custom tokens on the Stellar blockchain — no coding required. This short walkthrough will get you up and running in minutes.',
  },
  {
    title: 'Install Freighter Wallet',
    body: (
      <>
        You need the{' '}
        <a
          href="https://www.freighter.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline"
        >
          Freighter browser extension
        </a>{' '}
        to sign transactions. Install it, create a wallet, and come back here.
      </>
    ),
  },
  {
    title: 'Fund Your Wallet',
    body: 'On testnet, use Stellar Friendbot to get free XLM. On mainnet, send XLM to your Freighter address. You need a small amount of XLM to pay transaction fees.',
  },
  {
    title: 'Create Your First Token',
    body: 'Click "Connect Wallet", then go to Create. Fill in your token name, symbol, decimals, and initial supply — then hit Deploy. Your token will be live on Stellar in seconds!',
  },
]

const STORAGE_KEY = 'stellarforge_onboarding_done'

interface OnboardingModalProps {
  /** Override to force-show the modal (e.g. from a Help menu). */
  forceOpen?: boolean
  onClose?: () => void
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ forceOpen, onClose }) => {
  const [step, setStep] = useState(0)
  const [visible, setVisible] = useState(false)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const done = localStorage.getItem(STORAGE_KEY)
    if (forceOpen || !done) setVisible(true)
  }, [forceOpen])

  useEffect(() => {
    if (!visible) return
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  const handleClose = () => {
    localStorage.setItem(STORAGE_KEY, 'true')
    setVisible(false)
    setStep(0)
    onClose?.()
  }

  if (!visible) return null

  const isLast = step === STEPS.length - 1
  const current = STEPS[step]
  if (!current) return null

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md space-y-5 p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <h2 id="onboarding-title" className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {current.title}
          </h2>
          <button
            ref={closeRef}
            onClick={handleClose}
            aria-label="Skip tutorial"
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded flex-shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{current.body}</p>

        {/* Step indicators */}
        <div
          className="flex gap-1.5 justify-center"
          role="group"
          aria-label={`Step ${step + 1} of ${STEPS.length}`}
        >
          {STEPS.map((_, i) => (
            <span
              key={i}
              aria-current={i === step ? 'step' : undefined}
              aria-label={`Step ${i + 1}${i === step ? ', current' : ''}`}
              className={`h-2 rounded-full transition-all ${
                i === step ? 'w-6 bg-blue-600' : 'w-2 bg-gray-300 dark:bg-gray-600'
              }`}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center">
          <Button variant="outline" size="sm" onClick={handleClose}>
            Skip
          </Button>
          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="outline" size="sm" onClick={() => setStep((s) => s - 1)}>
                Back
              </Button>
            )}
            {isLast ? (
              <Button variant="primary" size="sm" onClick={handleClose}>
                Get Started
              </Button>
            ) : (
              <Button variant="primary" size="sm" onClick={() => setStep((s) => s + 1)}>
                Next
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/** Key used to persist onboarding completion. Exported for testing / reset. */
export const ONBOARDING_STORAGE_KEY = STORAGE_KEY
