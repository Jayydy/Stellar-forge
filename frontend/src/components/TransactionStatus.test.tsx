import { render, screen } from '@testing-library/react'
import { describe, test, expect, vi, beforeEach, afterEach, type Mock } from 'vitest'
import { TransactionStatus } from './TransactionStatus'
import { stellarService } from '../services/stellar'

vi.mock('../services/stellar', () => ({
  stellarService: { getTransaction: vi.fn() },
}))

vi.mock('../context/NetworkContext', () => ({
  useNetwork: vi.fn(() => ({ network: 'testnet' })),
}))

import { useNetwork } from '../context/NetworkContext'

describe('TransactionStatus Component', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.clearAllMocks()
    ;(useNetwork as Mock).mockReturnValue({ network: 'testnet' })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('renders pending state initially', async () => {
    ;(stellarService.getTransaction as Mock).mockResolvedValue({ status: 'pending' })
    render(<TransactionStatus txHash="test-hash" />)
    expect(screen.getByText('Transaction pending...')).toBeInTheDocument()
  })

  test('polls and handles successful transaction', async () => {
    const onSuccess = vi.fn()
    ;(stellarService.getTransaction as Mock)
      .mockResolvedValueOnce({ status: 'pending' })
      .mockResolvedValueOnce({ status: 'success' })

    render(<TransactionStatus txHash="test-hash" onSuccess={onSuccess} />)

    await act(async () => {
      await Promise.resolve()
    })

    await vi.waitFor(() => {
      expect(screen.getByText('Transaction Successful')).toBeInTheDocument()
    })

    const link = screen.getByRole('link', { name: /view on stellar expert/i })
    expect(link).toHaveAttribute('href', 'https://stellar.expert/explorer/testnet/tx/test-hash')
    expect(onSuccess).toHaveBeenCalled()
  })

  test('polls and handles failed transaction', async () => {
    const onError = vi.fn()
    ;(stellarService.getTransaction as Mock).mockResolvedValue({
      status: 'error',
      error: 'Insufficient funds',
    })

    render(<TransactionStatus txHash="test-hash" onError={onError} />)

    await act(async () => {
      await Promise.resolve()
    })

    expect(screen.getByText('Insufficient funds')).toBeInTheDocument()
    const link = screen.getByRole('link', { name: /view on stellar expert/i })
    expect(link).toHaveAttribute('href', 'https://stellar.expert/explorer/testnet/tx/test-hash')
    expect(onError).toHaveBeenCalledWith('Insufficient funds')
  })

  test('handles 60s timeout properly', async () => {
    const onError = vi.fn()
    ;(stellarService.getTransaction as Mock).mockResolvedValue({ status: 'pending' })

    render(<TransactionStatus txHash="test-hash" onError={onError} />)

    await act(async () => {
      vi.advanceTimersByTime(60000)
    })

    const link = screen.getByRole('link', { name: /view on stellar expert/i })
    expect(link).toHaveAttribute('href', 'https://stellar.expert/explorer/public/tx/test-hash')
  })

  test('shows timeout error after 60 seconds', async () => {
    const onError = vi.fn()
    ;(stellarService.getTransaction as Mock).mockResolvedValue({ status: 'pending' })

    render(<TransactionStatus txHash="test-hash" onError={onError} />)

    await vi.waitFor(
      () => {
        vi.advanceTimersByTime(60000)
        expect(screen.getByText('Transaction Failed')).toBeInTheDocument()
      },
      { timeout: 5000 },
    )

    expect(onError).toHaveBeenCalledWith('Timeout')
  })
})
