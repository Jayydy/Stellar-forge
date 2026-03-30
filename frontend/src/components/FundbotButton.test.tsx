import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { FundbotButton } from '../components/FundbotButton'
import { useNetwork } from '../context/NetworkContext'
import { useWalletContext } from '../context/WalletContext'
import { useToast } from '../context/ToastContext'

vi.mock('../context/NetworkContext')
vi.mock('../context/WalletContext')
vi.mock('../context/ToastContext')

const mockAddToast = vi.fn()
const mockRefreshBalance = vi.fn().mockResolvedValue(undefined)

const connectedWallet = { address: 'GABC123', isConnected: true, balance: '100' }

function setup(network: 'testnet' | 'mainnet', wallet = connectedWallet) {
  vi.mocked(useNetwork).mockReturnValue({ network } as ReturnType<typeof useNetwork>)
  vi.mocked(useWalletContext).mockReturnValue({
    wallet,
    refreshBalance: mockRefreshBalance,
  } as unknown as ReturnType<typeof useWalletContext>)
  vi.mocked(useToast).mockReturnValue({
    addToast: mockAddToast,
    toasts: [],
    removeToast: vi.fn(),
  } as ReturnType<typeof useToast>)
  return render(<FundbotButton />)
}

describe('FundbotButton', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders on testnet when wallet is connected', () => {
    setup('testnet')
    expect(screen.getByRole('button', { name: /fund wallet/i })).toBeInTheDocument()
  })

  it('does not render on mainnet', () => {
    setup('mainnet')
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('does not render when wallet is disconnected', () => {
    setup('testnet', { address: '', isConnected: false, balance: '0' })
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('shows loading state and calls Friendbot on click', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))

    setup('testnet')
    fireEvent.click(screen.getByRole('button', { name: /fund wallet/i }))

    expect(screen.getByText('Funding...')).toBeInTheDocument()

    await waitFor(() => {
      expect(mockRefreshBalance).toHaveBeenCalled()
      expect(mockAddToast).toHaveBeenCalledWith('Testnet XLM funded successfully!', 'success')
    })

    vi.unstubAllGlobals()
  })

  it('shows error toast on Friendbot failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        statusText: 'Too Many Requests',
        json: async () => ({ detail: 'Account already funded' }),
      }),
    )

    setup('testnet')
    fireEvent.click(screen.getByRole('button', { name: /fund wallet/i }))

    await waitFor(() => {
      expect(mockAddToast).toHaveBeenCalledWith('Account already funded', 'error')
    })

    vi.unstubAllGlobals()
  })

  it('calls Friendbot with the correct URL', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    setup('testnet')
    fireEvent.click(screen.getByRole('button', { name: /fund wallet/i }))

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    expect(fetchMock.mock.calls[0]?.[0]).toContain('friendbot.stellar.org')
    expect(fetchMock.mock.calls[0]?.[0]).toContain('GABC123')

    vi.unstubAllGlobals()
  })
})
