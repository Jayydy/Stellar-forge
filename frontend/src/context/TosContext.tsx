import { createContext, useCallback, useContext, useState } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'
import { TermsModal } from '../components/UI/TermsModal'

const TOS_KEY = 'stellar_forge_tos_accepted'

interface TosContextValue {
  /** Call before any transaction. Runs `proceed` immediately if ToS already accepted,
   *  otherwise shows the modal and runs `proceed` after acceptance. */
  requireTos: (proceed: () => void) => void
}

const TosContext = createContext<TosContextValue | null>(null)

export const TosProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accepted, setAccepted] = useLocalStorage<boolean>(TOS_KEY, false)
  const [pendingCallback, setPendingCallback] = useState<(() => void) | null>(null)

  const requireTos = useCallback(
    (proceed: () => void) => {
      if (accepted) {
        proceed()
      } else {
        setPendingCallback(() => proceed)
      }
    },
    [accepted],
  )

  const handleAccept = () => {
    setAccepted(true)
    pendingCallback?.()
    setPendingCallback(null)
  }

  return (
    <TosContext.Provider value={{ requireTos }}>
      {children}
      <TermsModal isOpen={pendingCallback !== null} onAccept={handleAccept} />
    </TosContext.Provider>
  )
}

export const useTos = (): TosContextValue => {
  const ctx = useContext(TosContext)
  if (!ctx) throw new Error('useTos must be used within TosProvider')
  return ctx
}
