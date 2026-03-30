import { useCallback, useState } from 'react'

const BASE_URL = 'https://stellarforge.app'

export function useShareToken(tokenAddress: string, tokenName?: string, tokenSymbol?: string) {
  const [copied, setCopied] = useState(false)

  const shareUrl = `${BASE_URL}/token/${tokenAddress}`

  const twitterText = tokenName && tokenSymbol
    ? `Just deployed ${tokenName} ($${tokenSymbol}) on the Stellar blockchain with @StellarForge! 🚀\n\nCheck it out:`
    : `Check out this token on @StellarForge built on the Stellar blockchain:`

  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(twitterText)}&url=${encodeURIComponent(shareUrl)}`

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for browsers without clipboard API
      const el = document.createElement('input')
      el.value = shareUrl
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [shareUrl])

  return { shareUrl, twitterUrl, copyLink, copied }
}
