import { renderHook, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { ToastProvider, useToast } from '../context/ToastContext'

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ToastProvider>{children}</ToastProvider>
)

describe('useToast', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('throws when used outside ToastProvider', () => {
    expect(() => renderHook(() => useToast())).toThrow(
      'useToast must be used within a ToastProvider',
    )
  })

  it('adds a toast with default variant info', () => {
    const { result } = renderHook(() => useToast(), { wrapper })
    act(() => {
      result.current.addToast('Hello')
    })
    expect(result.current.toasts).toHaveLength(1)
    expect(result.current.toasts[0]).toMatchObject({ message: 'Hello', variant: 'info' })
  })

  it('adds toasts with specified variants', () => {
    const { result } = renderHook(() => useToast(), { wrapper })
    act(() => {
      result.current.addToast('ok', 'success')
      result.current.addToast('fail', 'error')
      result.current.addToast('warn', 'warning')
    })
    expect(result.current.toasts).toHaveLength(3)
    expect(result.current.toasts.map((t) => t.variant)).toEqual(['success', 'error', 'warning'])
  })

  it('stacks multiple toasts without removing others', () => {
    const { result } = renderHook(() => useToast(), { wrapper })
    act(() => {
      result.current.addToast('first')
      result.current.addToast('second')
    })
    expect(result.current.toasts).toHaveLength(2)
  })

  it('auto-dismisses after 5 seconds', () => {
    const { result } = renderHook(() => useToast(), { wrapper })
    act(() => {
      result.current.addToast('bye')
    })
    expect(result.current.toasts).toHaveLength(1)
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(result.current.toasts).toHaveLength(0)
  })

  it('does not dismiss before 5 seconds', () => {
    const { result } = renderHook(() => useToast(), { wrapper })
    act(() => {
      result.current.addToast('still here')
    })
    act(() => {
      vi.advanceTimersByTime(4999)
    })
    expect(result.current.toasts).toHaveLength(1)
  })

  it('manually removes a toast', () => {
    const { result } = renderHook(() => useToast(), { wrapper })
    act(() => {
      result.current.addToast('remove me')
    })
    const id = result.current.toasts[0]!.id
    act(() => {
      result.current.removeToast(id)
    })
    expect(result.current.toasts).toHaveLength(0)
  })

  it('only removes the targeted toast when multiple exist', () => {
    const { result } = renderHook(() => useToast(), { wrapper })
    act(() => {
      result.current.addToast('keep')
      result.current.addToast('remove')
    })
    const removeId = result.current.toasts[1]!.id
    act(() => {
      result.current.removeToast(removeId)
    })
    expect(result.current.toasts).toHaveLength(1)
    expect(result.current.toasts[0]!.message).toBe('keep')
  })
})
