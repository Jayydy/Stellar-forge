import React, { useEffect, useState } from 'react'

import { stellarService, type FactoryState } from '../services/stellar'
import { stroopsToXLM } from '../utils/formatting'

interface FeeDisplayProps {
  feeType: 'base' | 'metadata'
  className?: string
}

// Module-level cache — shared across all FeeDisplay instances
let cachedFactoryState: FactoryState | null = null
let pendingRequest: Promise<FactoryState> | null = null

function getFactoryState(): Promise<FactoryState> {
  if (cachedFactoryState) return Promise.resolve(cachedFactoryState)
  if (pendingRequest) return pendingRequest
  pendingRequest = stellarService.getFactoryState().then((state) => {
    cachedFactoryState = state
    pendingRequest = null
    return state
  })
  return pendingRequest
}

const LABELS: Record<FeeDisplayProps['feeType'], string> = {
  base: 'Creation Fee',
  metadata: 'Metadata Fee',
}

export const FeeDisplay: React.FC<FeeDisplayProps> = ({
  feeType,
  className = '',
}: FeeDisplayProps) => {
  const [xlm, setXlm] = useState<number | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    getFactoryState()
      .then((state) => {
        if (cancelled) return
        const stroops = feeType === 'base' ? state.baseFee : state.metadataFee
        setXlm(stroopsToXLM(stroops))
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
    return () => {
      cancelled = true
    }
  }, [feeType])

  const label = LABELS[feeType]

  if (error) {
    return <span className={`text-sm text-red-500 ${className}`}>{label}: unavailable</span>
  }

  if (xlm === null) {
    // Loading skeleton
    return (
      <span
        className={`inline-block h-4 w-32 animate-pulse rounded bg-gray-200 ${className}`}
        aria-label={`Loading ${label}…`}
        role="status"
      />
    )
  }

  return (
    <span className={`text-sm text-gray-700 ${className}`}>
      {label}: {xlm} XLM
    </span>
  )
}
