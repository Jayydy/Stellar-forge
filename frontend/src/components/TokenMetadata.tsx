import React, { useEffect, useState } from 'react'

import { Spinner } from './UI/Spinner'
import { ipfsService } from '../services/ipfs'

interface TokenMetadataResponse {
  image?: string
  name?: string
  description?: string
}

interface TokenMetadataProps {
  metadataUri?: string
  name: string
  symbol: string
  className?: string
}

type FetchState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'resolved'; imageUrl: string; description: string | undefined }
  | { status: 'error' }

const PLACEHOLDER_SRC =
  'data:image/svg+xml,%3Csvg xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22 width%3D%22100%22 height%3D%22100%22 viewBox%3D%220 0 100 100%22%3E%3Crect width%3D%22100%22 height%3D%22100%22 fill%3D%22%23e5e7eb%22%2F%3E%3Ctext x%3D%2250%22 y%3D%2255%22 font-size%3D%2232%22 text-anchor%3D%22middle%22 fill%3D%22%239ca3af%22%3E%3F%3C%2Ftext%3E%3C%2Fsvg%3E'

export const TokenMetadata: React.FC<TokenMetadataProps> = ({
  metadataUri,
  name,
  symbol,
  className = '',
}) => {
  const [state, setState] = useState<FetchState>({ status: 'idle' })

  useEffect(() => {
    const uri = metadataUri?.trim()
    if (!uri) {
      setState({ status: 'idle' })
      return
    }

    let cancelled = false
    setState({ status: 'loading' })

    ipfsService
      .getMetadata(uri)
      .then((data: TokenMetadataResponse) => {
        if (cancelled) return
        if (!data?.image) {
          setState({ status: 'error' })
          return
        }
        setState({ status: 'resolved', imageUrl: data.image, description: data.description })
      })
      .catch((_err: unknown) => {
        if (cancelled) return
        setState({ status: 'error' })
      })

    return () => {
      cancelled = true
    }
  }, [metadataUri])

  const showPlaceholder = state.status === 'idle' || state.status === 'error'

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      {state.status === 'loading' && <Spinner size="md" label="Loading token metadata…" />}

      {state.status === 'resolved' && (
        <img
          src={state.imageUrl}
          alt={name}
          loading="lazy"
          onError={() => setState({ status: 'error' })}
          className="h-24 w-24 rounded-full object-cover"
        />
      )}

      {showPlaceholder && (
        <img
          data-testid="placeholder-image"
          src={PLACEHOLDER_SRC}
          alt={`${name} placeholder`}
          loading="lazy"
          className="h-24 w-24 rounded-full object-cover"
        />
      )}

      <div className="text-center">
        <p className="font-semibold text-gray-900">{name}</p>
        <p className="text-sm text-gray-500">{symbol}</p>
        {state.status === 'resolved' && state.description && (
          <p className="mt-1 text-sm text-gray-600">{state.description}</p>
        )}
      </div>
    </div>
  )
}
