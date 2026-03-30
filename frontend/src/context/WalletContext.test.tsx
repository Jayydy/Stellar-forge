import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { WalletProvider, useWalletContext } from './WalletContext'
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

// Helper component that exposes context values via data attributes
function WalletConsumer({ id = 'consumer' }: { id?: string }) {
  const { wallet, isConnecting, error, connect, disconnect } = useWalletContext()
  return (
    <div>
      <span data-testid={`${id}-address`}>{wallet.address ?? 'null'}</span>
      <span data-testid={`${id}-connected`}>{String(wallet.isConnected)}</span>
      <span data-testid={`${id}-connecting`}>{String(isConnecting)}</span>
      <span data-testid={`${id}-error`}>{error ?? 'null'}</span>
      <button data-testid={`${id}-connect`} onClick={connect}>
        Connect
      </button>
      <button data-testid={`${id}-disconnect`} onClick={disconnect}>
        Disconnect
      </button>
    </div>
  )
}

describe('WalletProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('provides initial disconnected state', () => {
    render(
      <WalletProvider>
        <WalletConsumer />
      </WalletProvider>,
    )
    expect(screen.getByTestId('consumer-address').textContent).toBe('null')
    expect(screen.getByTestId('consumer-connected').textContent).toBe('false')
    expect(screen.getByTestId('consumer-connecting').textContent).toBe('false')
    expect(screen.getByTestId('consumer-error').textContent).toBe('null')
  })

  it('updates wallet state on successful connect', async () => {
    vi.mocked(walletService.connect).mockResolvedValue('GABC123')

    render(
      <WalletProvider>
        <WalletConsumer />
      </WalletProvider>,
    )

    await act(async () => {
      screen.getByTestId('consumer-connect').click()
    })

    expect(screen.getByTestId('consumer-address').textContent).toBe('GABC123')
    expect(screen.getByTestId('consumer-connected').textContent).toBe('true')
  })

  it('sets error state on failed connect', async () => {
    vi.mocked(walletService.connect).mockRejectedValue(new Error('Wallet not found'))

    render(
      <WalletProvider>
        <WalletConsumer />
      </WalletProvider>,
    )

    await act(async () => {
      screen.getByTestId('consumer-connect').click()
    })

    expect(screen.getByTestId('consumer-error').textContent).toBe('Wallet not found')
    expect(screen.getByTestId('consumer-connected').textContent).toBe('false')
  })

  it('resets wallet state on disconnect', async () => {
    vi.mocked(walletService.connect).mockResolvedValue('GABC123')

    render(
      <WalletProvider>
        <WalletConsumer />
      </WalletProvider>,
    )

    await act(async () => {
      screen.getByTestId('consumer-connect').click()
    })

    act(() => {
      screen.getByTestId('consumer-disconnect').click()
    })

    expect(screen.getByTestId('consumer-address').textContent).toBe('null')
    expect(screen.getByTestId('consumer-connected').textContent).toBe('false')
  })

  it('shares state across multiple consumers', async () => {
    vi.mocked(walletService.connect).mockResolvedValue('GABC123')

    render(
      <WalletProvider>
        <WalletConsumer id="a" />
        <WalletConsumer id="b" />
      </WalletProvider>,
    )

    await act(async () => {
      screen.getByTestId('a-connect').click()
    })

    // Both consumers should reflect the same connected state
    expect(screen.getByTestId('a-connected').textContent).toBe('true')
    expect(screen.getByTestId('b-connected').textContent).toBe('true')
    expect(screen.getByTestId('a-address').textContent).toBe('GABC123')
    expect(screen.getByTestId('b-address').textContent).toBe('GABC123')
  })
})

describe('useWalletContext outside provider', () => {
  it('throws a helpful error when used outside WalletProvider', () => {
    // Suppress React's error boundary console output
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(() => render(<WalletConsumer />)).toThrow(
      'useWalletContext must be used within a WalletProvider',
    )

    spy.mockRestore()
  })
})
