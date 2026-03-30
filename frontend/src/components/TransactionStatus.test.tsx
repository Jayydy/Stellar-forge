import { render, screen, act } from '@testing-library/react'
import { describe, test, expect, vi, beforeEach, afterEach, type Mock } from 'vitest'
import { TransactionStatus } from './TransactionStatus'
import { stellarService } from '../services/stellar'

vi.mock('../services/stellar', () => ({
  stellarService: {
    getTransaction: vi.fn(),
  },
}))

describe('TransactionStatus Component', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.clearAllMocks()
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

    await act(async () => {
      vi.advanceTimersByTime(3000)
    })

    expect(stellarService.getTransaction).toHaveBeenCalledTimes(2)
    expect(onSuccess).toHaveBeenCalled()
    expect(screen.getByText('Transaction Successful')).toBeInTheDocument()
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

    expect(onError).toHaveBeenCalledWith('Insufficient funds')
    expect(screen.getByText('Transaction Failed')).toBeInTheDocument()
    expect(screen.getByText('Insufficient funds')).toBeInTheDocument()
  })

  test('handles 60s timeout properly', async () => {
    const onError = vi.fn()
    ;(stellarService.getTransaction as Mock).mockResolvedValue({ status: 'pending' })

    render(<TransactionStatus txHash="test-hash" onError={onError} />)

    await act(async () => {
      vi.advanceTimersByTime(60000)
    })

    expect(onError).toHaveBeenCalledWith('Transaction polling timed out')
    expect(screen.getByText('Transaction Failed')).toBeInTheDocument()
    expect(screen.getByText('Transaction polling timed out')).toBeInTheDocument()
  })
})
