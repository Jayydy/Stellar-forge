import { render, screen, waitFor, act, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest'
import { MintForm } from './MintForm'
import { TosProvider } from '../context/TosContext'

const mockStellarService = {
  getTokenInfo: vi.fn().mockRejectedValue(new Error('not found')),
  accountExists: vi.fn(),
  mintTokens: vi.fn(),
}

vi.mock('../context/StellarContext', () => ({
  useStellarContext: () => ({ stellarService: mockStellarService }),
}))

vi.mock('../context/ToastContext', () => ({
  useToast: () => ({ addToast: vi.fn() }),
}))

vi.mock('../context/WalletContext', () => ({
  useWalletContext: () => ({ wallet: { isConnected: true, address: 'GABC123' } }),
}))

vi.mock('../hooks/useFactoryState', () => ({
  useFactoryState: () => ({ state: { baseFee: '100000' } }),
}))

const renderMintForm = () =>
  render(
    <TosProvider>
      <MintForm />
    </TosProvider>,
  )

describe('MintForm', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.clearAllMocks()
    ;(mockStellarService.accountExists as Mock).mockResolvedValue(true)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('debounces recipient account validation by 500ms', async () => {
    renderMintForm()

    const recipientInput = screen.getByLabelText('Recipient Address', { exact: false })
    fireEvent.change(recipientInput, {
      target: { value: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF' },
    })

    expect(mockStellarService.accountExists).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(499)
    })

    expect(mockStellarService.accountExists).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(1)
    })

    await waitFor(() => {
      expect(mockStellarService.accountExists).toHaveBeenCalledTimes(1)
    })
  })

  it('shows a warning when the recipient account is not funded', async () => {
    ;(mockStellarService.accountExists as Mock).mockResolvedValue(false)

    renderMintForm()

    fireEvent.change(screen.getByLabelText('Recipient Address', { exact: false }), {
      target: { value: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF' },
    })

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(
      await screen.findByText(
        'This address does not have a Stellar account yet. It may need to be funded first.',
      ),
    ).toBeInTheDocument()
  })
})
