import { createContext, useCallback, useContext, useEffect, useState } from 'react'

interface DarkModeContextValue {
  isDarkMode: boolean
  toggleDarkMode: () => void
  setDarkMode: (isDark: boolean) => void
}

const DarkModeContext = createContext<DarkModeContextValue | null>(null)

const DARK_MODE_KEY = 'stellar-forge-dark-mode'

export const DarkModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    // Check localStorage first
    const stored = localStorage.getItem(DARK_MODE_KEY)
    if (stored !== null) {
      return stored === 'true'
    }
    // Fall back to OS preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  // Apply dark mode class to document
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDarkMode])

  // Listen for OS preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e: MediaQueryListEvent) => {
      // Only update if no stored preference
      const stored = localStorage.getItem(DARK_MODE_KEY)
      if (stored === null) {
        setIsDarkMode(e.matches)
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  const toggleDarkMode = useCallback(() => {
    setIsDarkMode((prev) => {
      const newValue = !prev
      localStorage.setItem(DARK_MODE_KEY, String(newValue))
      return newValue
    })
  }, [])

  const setDarkMode = useCallback((isDark: boolean) => {
    setIsDarkMode(isDark)
    localStorage.setItem(DARK_MODE_KEY, String(isDark))
  }, [])

  return (
    <DarkModeContext.Provider value={{ isDarkMode, toggleDarkMode, setDarkMode }}>
      {children}
    </DarkModeContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useDarkMode = (): DarkModeContextValue => {
  const ctx = useContext(DarkModeContext)
  if (!ctx) throw new Error('useDarkMode must be used within a DarkModeProvider')
  return ctx
}
