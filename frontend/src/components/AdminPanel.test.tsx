import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AdminPanel } from './AdminPanel'
import { WalletContext } from '../context/WalletContext'
import { StellarContext } from '../context/StellarContext'
import { ToastContext } from '../context/ToastContext'
import type { FactoryState } from '../types'

// Mock hooks
vi.mock('../hooks/useFactoryState', () => ({
  useFactoryState: vi.fn(),
}))

vi.mock('../hooks/useTransaction', () => ({
  useTransaction: vi.fn(),
}))

const mockAddToast = vi.fn()
const mockUpdateFees = vi.fn()
const mockExecute = vi.fn()
const mockRefetch = vi.fn()

const mockFactoryState: FactoryState = {
  admin: 'GADMIN123456789',
  treasury: 'GTREASURY123456789',
  baseFee: '10000000', // 1 XLM in stroops
  metadataFee: '5000000', // 0.5 XLM in stroops
  tokenCount: 10,
  paused: false,
}

const renderWithProviders = async (
  ui: React.ReactElement,
  {
    walletAddress = null,
    isConnected = false,
    factoryState = null,
    isLoading = false,
    txStatus = 'idle',
  }: {
    walletAddress?: string | null
    isConnected?: boolean
    factoryState?: FactoryState | null
    isLoading?: boolean
    txStatus?: string
  } = {},
) => {
  const { useFactoryState } = await import('../hooks/useFactoryState')
  const { useTransaction } = await import('../hooks/useTransaction')

  vi.mocked(useFactoryState).mockReturnValue({
    state: factoryState,
    isLoading,
    error: null,
    refetch: mockRefetch,
  })

  vi.mocked(useTransaction).mockReturnValue({
    execute: mockExecute,
    status: txStatus as any,
    txHash: null,
    error: null,
    reset: vi.fn(),
  })

  return render(
    <WalletContext.Provider
      value={{
        wallet: {
          address: walletAddress,
          isConnected,
          balance: '100',
          network: 'testnet',
        },
        connect: vi.fn(),
        disconnect: vi.fn(),
        isConnecting: false,
        error: null,
        isInstalled: true,
      }}
    >
      <StellarContext.Provider
        value={{
          stellarService: {
            updateFees: mockUpdateFees,
          } as any,
        }}
      >
        <ToastContext.Provider
          value={{
            toasts: [],
            addToast: mockAddToast,
            removeToast: vi.fn(),
          }}
        >
          {ui}
        </ToastContext.Provider>
      </StellarContext.Provider>
    </WalletContext.Provider>,
  )
}

describe('AdminPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Loading State', () => {
    it('should show loading message when factory state is loading', async () => {
      await renderWithProviders(<AdminPanel />, { isLoading: true })
      expect(screen.getByText(/loading factory state/i)).toBeInTheDocument()
    })
  })

  describe('Access Control', () => {
    it('should show connect wallet message when wallet is not connected', async () => {
      await renderWithProviders(<AdminPanel />, {
        isConnected: false,
        factoryState: mockFactoryState,
      })
      expect(screen.getByText(/connect your wallet to access the admin panel/i)).toBeInTheDocument()
    })

    it('should show access denied for non-admin users', async () => {
      await renderWithProviders(<AdminPanel />, {
        walletAddress: 'GNOTADMIN123456789',
        isConnected: true,
        factoryState: mockFactoryState,
      })
      expect(screen.getByText(/access denied/i)).toBeInTheDocument()
      expect(screen.getByText(/only the factory admin can view this page/i)).toBeInTheDocument()
    })

    it('should show admin panel for factory admin', async () => {
      await renderWithProviders(<AdminPanel />, {
        walletAddress: mockFactoryState.admin,
        isConnected: true,
        factoryState: mockFactoryState,
      })
      expect(screen.getByText(/admin panel/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/base fee \(xlm\)/i)).toBeInTheDocument()
    })
  })

  describe('Fee Display', () => {
    it('should display current fees in XLM format', async () => {
      await renderWithProviders(<AdminPanel />, {
        walletAddress: mockFactoryState.admin,
        isConnected: true,
        factoryState: mockFactoryState,
      })

      const baseFeeInput = screen.getByLabelText(/base fee \(xlm\)/i) as HTMLInputElement
      const metadataFeeInput = screen.getByLabelText(/metadata fee \(xlm\)/i) as HTMLInputElement

      // 10000000 stroops = 1 XLM
      expect(baseFeeInput.value).toBe('1')
      // 5000000 stroops = 0.5 XLM
      expect(metadataFeeInput.value).toBe('0.5')
    })

    it('should handle zero fees correctly', async () => {
      const stateWithZeroFees = {
        ...mockFactoryState,
        baseFee: '0',
        metadataFee: '0',
      }

      await renderWithProviders(<AdminPanel />, {
        walletAddress: mockFactoryState.admin,
        isConnected: true,
        factoryState: stateWithZeroFees,
      })

      const baseFeeInput = screen.getByLabelText(/base fee \(xlm\)/i) as HTMLInputElement
      const metadataFeeInput = screen.getByLabelText(/metadata fee \(xlm\)/i) as HTMLInputElement

      expect(baseFeeInput.value).toBe('0')
      expect(metadataFeeInput.value).toBe('0')
    })
  })

  describe('Fee Update', () => {
    it('should allow admin to update fees independently', async () => {
      const user = userEvent.setup()

      await renderWithProviders(<AdminPanel />, {
        walletAddress: mockFactoryState.admin,
        isConnected: true,
        factoryState: mockFactoryState,
      })

      const baseFeeInput = screen.getByLabelText(/base fee \(xlm\)/i)
      const metadataFeeInput = screen.getByLabelText(/metadata fee \(xlm\)/i)

      // Update base fee only
      await user.clear(baseFeeInput)
      await user.type(baseFeeInput, '2')

      // Update metadata fee only
      await user.clear(metadataFeeInput)
      await user.type(metadataFeeInput, '1.5')

      expect((baseFeeInput as HTMLInputElement).value).toBe('2')
      expect((metadataFeeInput as HTMLInputElement).value).toBe('1.5')
    })

    it('should validate fees before submission', async () => {
      const user = userEvent.setup()

      await renderWithProviders(<AdminPanel />, {
        walletAddress: mockFactoryState.admin,
        isConnected: true,
        factoryState: mockFactoryState,
      })

      const baseFeeInput = screen.getByLabelText(/base fee \(xlm\)/i)
      const submitButton = screen.getByRole('button', { name: /submit changes/i })

      // Try to submit negative fee
      await user.clear(baseFeeInput)
      await user.type(baseFeeInput, '-1')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/must be a non-negative number/i)).toBeInTheDocument()
      })

      // Confirmation modal should not appear
      expect(screen.queryByText(/confirm fee update/i)).not.toBeInTheDocument()
    })

    it('should show confirmation modal before updating fees', async () => {
      const user = userEvent.setup()

      await renderWithProviders(<AdminPanel />, {
        walletAddress: mockFactoryState.admin,
        isConnected: true,
        factoryState: mockFactoryState,
      })

      const baseFeeInput = screen.getByLabelText(/base fee \(xlm\)/i)
      const submitButton = screen.getByRole('button', { name: /submit changes/i })

      await user.clear(baseFeeInput)
      await user.type(baseFeeInput, '2')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/confirm fee update/i)).toBeInTheDocument()
      })
    })

    it('should call updateFees with correct stroops values', async () => {
      const user = userEvent.setup()

      mockExecute.mockResolvedValueOnce('tx-hash-123')

      await renderWithProviders(<AdminPanel />, {
        walletAddress: mockFactoryState.admin,
        isConnected: true,
        factoryState: mockFactoryState,
      })

      const baseFeeInput = screen.getByLabelText(/base fee \(xlm\)/i)
      const metadataFeeInput = screen.getByLabelText(/metadata fee \(xlm\)/i)
      const submitButton = screen.getByRole('button', { name: /submit changes/i })

      // Set fees: 2 XLM and 1.5 XLM
      await user.clear(baseFeeInput)
      await user.type(baseFeeInput, '2')
      await user.clear(metadataFeeInput)
      await user.type(metadataFeeInput, '1.5')
      await user.click(submitButton)

      // Confirm in modal
      const confirmButton = await screen.findByRole('button', { name: /update fees/i })
      await user.click(confirmButton)

      await waitFor(() => {
        expect(mockExecute).toHaveBeenCalled()
      })
    })

    it('should show success toast and refetch after successful update', async () => {
      const user = userEvent.setup()

      mockExecute.mockResolvedValueOnce('tx-hash-123')

      await renderWithProviders(<AdminPanel />, {
        walletAddress: mockFactoryState.admin,
        isConnected: true,
        factoryState: mockFactoryState,
      })

      const submitButton = screen.getByRole('button', { name: /submit changes/i })
      await user.click(submitButton)

      const confirmButton = await screen.findByRole('button', { name: /update fees/i })
      await user.click(confirmButton)

      await waitFor(() => {
        expect(mockAddToast).toHaveBeenCalledWith('Fees updated successfully.', 'success')
        expect(mockRefetch).toHaveBeenCalled()
      })
    })

    it('should show error toast on failed update', async () => {
      const user = userEvent.setup()

      mockExecute.mockRejectedValueOnce(new Error('Transaction failed'))

      await renderWithProviders(<AdminPanel />, {
        walletAddress: mockFactoryState.admin,
        isConnected: true,
        factoryState: mockFactoryState,
      })

      const submitButton = screen.getByRole('button', { name: /submit changes/i })
      await user.click(submitButton)

      const confirmButton = await screen.findByRole('button', { name: /update fees/i })
      await user.click(confirmButton)

      await waitFor(() => {
        expect(mockAddToast).toHaveBeenCalledWith('Transaction failed', 'error')
      })
    })

    it('should disable inputs during transaction', async () => {
      await renderWithProviders(<AdminPanel />, {
        walletAddress: mockFactoryState.admin,
        isConnected: true,
        factoryState: mockFactoryState,
        txStatus: 'submitting',
      })

      const baseFeeInput = screen.getByLabelText(/base fee \(xlm\)/i)
      const metadataFeeInput = screen.getByLabelText(/metadata fee \(xlm\)/i)
      const submitButton = screen.getByRole('button', { name: /submitting/i })

      expect(baseFeeInput).toBeDisabled()
      expect(metadataFeeInput).toBeDisabled()
      expect(submitButton).toBeDisabled()
    })
  })

  describe('Edge Cases', () => {
    it('should handle very small fee values', async () => {
      const stateWithSmallFees = {
        ...mockFactoryState,
        baseFee: '1', // 0.0000001 XLM
        metadataFee: '10', // 0.000001 XLM
      }

      await renderWithProviders(<AdminPanel />, {
        walletAddress: mockFactoryState.admin,
        isConnected: true,
        factoryState: stateWithSmallFees,
      })

      const baseFeeInput = screen.getByLabelText(/base fee \(xlm\)/i) as HTMLInputElement
      const metadataFeeInput = screen.getByLabelText(/metadata fee \(xlm\)/i) as HTMLInputElement

      expect(baseFeeInput.value).toBe('0.0000001')
      expect(metadataFeeInput.value).toBe('0.000001')
    })

    it('should handle very large fee values', async () => {
      const stateWithLargeFees = {
        ...mockFactoryState,
        baseFee: '1000000000000', // 100,000 XLM
        metadataFee: '500000000000', // 50,000 XLM
      }

      await renderWithProviders(<AdminPanel />, {
        walletAddress: mockFactoryState.admin,
        isConnected: true,
        factoryState: stateWithLargeFees,
      })

      const baseFeeInput = screen.getByLabelText(/base fee \(xlm\)/i) as HTMLInputElement
      const metadataFeeInput = screen.getByLabelText(/metadata fee \(xlm\)/i) as HTMLInputElement

      expect(baseFeeInput.value).toBe('100000')
      expect(metadataFeeInput.value).toBe('50000')
    })
  })
})
