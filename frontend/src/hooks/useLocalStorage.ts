import { useState, useCallback, useEffect } from 'react'

/**
 * A reusable hook for persisting state in localStorage.
 * Handles JSON serialization/deserialization, localStorage unavailability,
 * and cross-tab synchronization.
 */
export function useLocalStorage<T>(
  key: string,
  defaultValue: T,
): [T, (value: T | ((prev: T) => T)) => void] {
  // Pass initial state function to useState so logic is only executed once
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? (JSON.parse(item) as T) : defaultValue
    } catch (error) {
      // localStorage read failure — fall back to initialValue silently
      return initialValue
    }
  })

  // Return a wrapped version of useState's setter function that
  // persists the new value to localStorage.
  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        setStoredValue((prevValue: T) => {
          const valueToStore = value instanceof Function ? value(prevValue) : value
          window.localStorage.setItem(key, JSON.stringify(valueToStore))
          return valueToStore
        })
      } catch (error) {
        console.warn(`[useLocalStorage] Error setting key "${key}":`, error)
      }
    },
    [key],
  )

  // Listen for changes from other tabs to keep sync
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          setStoredValue(JSON.parse(e.newValue) as T)
        } catch {
          /* ignore parse errors */
        }
      }
    } catch (error) {
      // localStorage write failure — state is still updated in memory
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [key])

  return [storedValue, setValue]
}

