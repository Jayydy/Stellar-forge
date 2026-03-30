import { renderHook, act } from '@testing-library/react'
import { describe, test, expect, vi, beforeEach, afterEach, type Mock } from 'vitest'
import { useTransaction } from './useTransaction'
import { stellarService } from '../services/stellar'

vi.mock('../services/stellar', () => ({
  stellarService: { getTransaction: vi.fn() },
}))

describe('useTransaction', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  test('returns idle when no hash provided', () => {
    const { result } = renderHook(() => useTransaction(null))
    expect(result.current.status).toBe('idle')
  })

  test('sets pending immediately when hash provided', () => {
    ;(stellarService.getTransaction as Mock).mockResolvedValue({ status: 'pending' })
    const { result } = renderHook(() => useTransaction('abc123'))
    expect(result.current.status).toBe('pending')
  })

  test('transitions to success on SUCCESS response', async () => {
    ;(stellarService.getTransaction as Mock).mockResolvedValue({ status: 'SUCCESS' })
    const { result } = renderHook(() => useTransaction('abc123'))

    await act(async () => {
      vi.advanceTimersByTime(3000)
      await Promise.resolve()
    })

    expect(result.current.status).toBe('success')
    expect(result.current.data).toEqual({ status: 'SUCCESS' })
    expect(result.current.error).toBeNull()
  })

  test('transitions to failed on FAILED response', async () => {
    ;(stellarService.getTransaction as Mock).mockResolvedValue({
      status: 'FAILED',
      result_xdr: 'AAAABf////8AAAAA',
    })
    const { result } = renderHook(() => useTransaction('abc123'))

    await act(async () => {
      vi.advanceTimersByTime(3000)
      await Promise.resolve()
    })

    expect(result.current.status).toBe('failed')
    expect(result.current.error).toBe('AAAABf////8AAAAA')
  })

  test('times out after 60 seconds', async () => {
    ;(stellarService.getTransaction as Mock).mockResolvedValue({ status: 'pending' })
    const { result } = renderHook(() => useTransaction('abc123'))

    await act(async () => {
      vi.advanceTimersByTime(60000)
      await Promise.resolve()
    })

    expect(result.current.status).toBe('failed')
    expect(result.current.error).toBe('Timeout')
  })

  test('keeps polling on transient network errors', async () => {
    ;(stellarService.getTransaction as Mock)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValue({ status: 'SUCCESS' })

    const { result } = renderHook(() => useTransaction('abc123'))

    await act(async () => {
      vi.advanceTimersByTime(3000)
      await Promise.resolve()
    })
    await act(async () => {
      vi.advanceTimersByTime(3000)
      await Promise.resolve()
    })

    expect(result.current.status).toBe('success')
  })
})
