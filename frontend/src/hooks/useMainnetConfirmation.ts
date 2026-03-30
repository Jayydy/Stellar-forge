import { useState, useCallback } from 'react'
import { TokenDeployParams } from '../types'
import { isMainnet } from '../utils/network'

interface UseMainnetConfirmationReturn {
  showModal: boolean
  tokenParams: TokenDeployParams | null
  requestDeployment: (params: TokenDeployParams, onConfirm: () => void) => void
  closeModal: () => void
  confirmDeployment: () => void
}

export const useMainnetConfirmation = (): UseMainnetConfirmationReturn => {
  const [showModal, setShowModal] = useState(false)
  const [tokenParams, setTokenParams] = useState<TokenDeployParams | null>(null)
  const [onConfirmCallback, setOnConfirmCallback] = useState<(() => void) | null>(null)

  const requestDeployment = useCallback((params: TokenDeployParams, onConfirm: () => void) => {
    if (isMainnet()) {
      setTokenParams(params)
      setOnConfirmCallback(() => onConfirm)
      setShowModal(true)
    } else {
      // On testnet, skip the confirmation modal
      onConfirm()
    }
  }, [])

  const closeModal = useCallback(() => {
    setShowModal(false)
    setTokenParams(null)
    setOnConfirmCallback(null)
  }, [])

  const confirmDeployment = useCallback(() => {
    if (onConfirmCallback) {
      onConfirmCallback()
    }
    closeModal()
  }, [onConfirmCallback, closeModal])

  return {
    showModal,
    tokenParams,
    requestDeployment,
    closeModal,
    confirmDeployment,
  }
}
