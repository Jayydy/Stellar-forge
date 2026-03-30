import { useState, useCallback } from 'react'
import { isOptedOut, setOptOut } from '../services/analytics'

export function useAnalytics() {
  const [optedOut, setOptedOut] = useState(isOptedOut)

  const toggleOptOut = useCallback(() => {
    const next = !optedOut
    setOptOut(next)
    setOptedOut(next)
  }, [optedOut])

  return { optedOut, toggleOptOut }
}
