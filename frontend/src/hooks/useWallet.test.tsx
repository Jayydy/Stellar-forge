import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { WalletProvider } from '../context/WalletContext'
import { useWallet } from './useWallet'
import { walletService } from '../services/wallet'

vi.mock('../services/wallet', () => ({
  walletService: {
    connect: vi.fn(),
    disconnect: vi.fn(),
    isInstalled: vi.fn().mockReturnValue(true),
    checkExistingConnection: vi.fn().mockResolvedValue(null),
    getBalance: vi.fn().mockResolvedValue('100.0000000'),
  },
}))

function Consumer() {
  const { wallet, isConnecting, error, connect, disconnect } = useWallet()
  return (
    <div>
      <span data-testid="address">{wallet.address ?? 'null'}</span>
      <span data-testid="connected">{String(wallet.isConnected)}</span>
      <span data-testid="connecting">{String(isConnecting)}</span>
      <span data-testid="error">{error ?? 'null'}</span>
      <button data-testid="connect" onClick={connect}>
        Connect
      </button>
      <button data-testid="disconnect" onClick={disconnect}>
        Disconnect
      </button>
    </div>
  )
}

const renderWithProvider = () =>
  render(
    <WalletProvider>
      <Consumer />
    </WalletProvider>,
  )

describe('useWallet', () => {
  beforeEach(() => vi.clearAllMocks())

  it('starts disconnected', () => {
    renderWithProvider()
    expect(screen.getByTestId('connected').textContent).toBe('false')
    expect(screen.getByTestId('address').textContent).toBe('null')
    expect(screen.getByTestId('error').textContent).toBe('null')
  })

  it('connect success sets address and connected state', async () => {
    vi.mocked(walletService.connect).mockResolvedValue('GABC123')
    renderWithProvider()

    await act(async () => {
      screen.getByTestId('connect').click()
    })

    expect(screen.getByTestId('connected').textContent).toBe('true')
    expect(screen.getByTestId('address').textContent).toBe('GABC123')
    expect(screen.getByTestId('error').textContent).toBe('null')
  })

  it('connect failure sets error and stays disconnected', async () => {
    vi.mocked(walletService.connect).mockRejectedValue(new Error('User rejected'))
    renderWithProvider()

    await act(async () => {
      screen.getByTestId('connect').click()
    })

    expect(screen.getByTestId('connected').textContent).toBe('false')
    expect(screen.getByTestId('error').textContent).toBe('User rejected')
  })

  it('disconnect resets state', async () => {
    vi.mocked(walletService.connect).mockResolvedValue('GABC123')
    renderWithProvider()

    await act(async () => {
      screen.getByTestId('connect').click()
    })
    act(() => {
      screen.getByTestId('disconnect').click()
    })

    expect(screen.getByTestId('connected').textContent).toBe('false')
    expect(screen.getByTestId('address').textContent).toBe('null')
  })
})
