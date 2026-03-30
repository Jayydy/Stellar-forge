import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLocalStorage } from './useLocalStorage'

describe('useLocalStorage', () => {
  const TEST_KEY = 'test-local-storage-key'

  beforeEach(() => {
    window.localStorage.clear()
    vi.restoreAllMocks()
  })

  it('returns the initial value when localStorage is empty', () => {
    const { result } = renderHook(() => useLocalStorage(TEST_KEY, 'initial'))
    expect(result.current[0]).toBe('initial')
  })

  it('returns the parsed value from localStorage if it exists', () => {
    window.localStorage.setItem(TEST_KEY, JSON.stringify('stored-value'))
    const { result } = renderHook(() => useLocalStorage(TEST_KEY, 'initial'))
    expect(result.current[0]).toBe('stored-value')
  })

  it('updates both state and localStorage when setting a new value', () => {
    const { result } = renderHook(() => useLocalStorage(TEST_KEY, 'initial'))

    act(() => {
      result.current[1]('new-value')
    })

    expect(result.current[0]).toBe('new-value')
    expect(window.localStorage.getItem(TEST_KEY)).toBe(JSON.stringify('new-value'))
  })

  it('falls back to initialValue if parsing fails', () => {
    window.localStorage.setItem(TEST_KEY, 'invalid-json')
    const { result } = renderHook(() => useLocalStorage(TEST_KEY, 'initial'))
    expect(result.current[0]).toBe('initial')
  })

  it('handles localStorage unavailability gracefully', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const { result } = renderHook(() => useLocalStorage(TEST_KEY, 'initial'))

    act(() => {
      result.current[1]('new-value')
    })

    // state should still update
    expect(result.current[0]).toBe('new-value')
    expect(consoleWarnSpy).toHaveBeenCalled()
  })

  it('handles functional updates', () => {
    const { result } = renderHook(() => useLocalStorage(TEST_KEY, 1))

    act(() => {
      result.current[1]((prev: number) => prev + 1)
    })

    expect(result.current[0]).toBe(2)
    expect(window.localStorage.getItem(TEST_KEY)).toBe(JSON.stringify(2))
  })
})
