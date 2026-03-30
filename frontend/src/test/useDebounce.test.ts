import { renderHook, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { useDebounce } from '../hooks/useDebounce'

describe('useDebounce', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('returns the initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 300))
    expect(result.current).toBe('initial')
  })

  it('does not update before the delay', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
      initialProps: { value: 'first' },
    })
    rerender({ value: 'second' })
    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(result.current).toBe('first')
  })

  it('updates after the delay', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
      initialProps: { value: 'first' },
    })
    rerender({ value: 'second' })
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(result.current).toBe('second')
  })

  it('resets the timer on rapid changes', () => {
    const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
      initialProps: { value: 'a' },
    })
    rerender({ value: 'b' })
    act(() => {
      vi.advanceTimersByTime(200)
    })
    rerender({ value: 'c' })
    act(() => {
      vi.advanceTimersByTime(200)
    })
    // only 200ms since last change — should still be 'a'
    expect(result.current).toBe('a')
    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(result.current).toBe('c')
  })

  it('clears the timer on unmount (no state update after unmount)', () => {
    const { result, rerender, unmount } = renderHook(({ value }) => useDebounce(value, 300), {
      initialProps: { value: 'initial' },
    })
    rerender({ value: 'updated' })
    unmount()
    // advancing time after unmount should not throw or cause stale updates
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(result.current).toBe('initial')
  })
})
