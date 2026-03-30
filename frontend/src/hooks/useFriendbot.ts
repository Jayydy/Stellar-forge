import { useState } from 'react'

const FRIENDBOT_URL = 'https://friendbot.stellar.org'

interface UseFriendbotResult {
  fund: (address: string) => Promise<void>
  isLoading: boolean
}

export function useFriendbot(onSuccess?: () => void): UseFriendbotResult {
  const [isLoading, setIsLoading] = useState(false)

  const fund = async (address: string) => {
    setIsLoading(true)
    try {
      const res = await fetch(`${FRIENDBOT_URL}?addr=${encodeURIComponent(address)}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        const detail = body?.detail ?? body?.extras?.result_codes?.transaction ?? res.statusText
        throw new Error(detail || 'Friendbot request failed')
      }
      onSuccess?.()
    } finally {
      setIsLoading(false)
    }
  }

  return { fund, isLoading }
}
