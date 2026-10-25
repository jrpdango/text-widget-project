import { useCallback, useEffect, useState } from 'react'
import type { Theme } from '../types'
import { loadTheme, saveTheme } from '../lib/storage'

const DARK_QUERY = '(prefers-color-scheme: dark)'

function getSystemTheme(): Theme {
  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light'
}

export function useTheme() {
  const [explicitTheme, setExplicitTheme] = useState<Theme | null>(loadTheme)
  const [systemTheme, setSystemTheme] = useState<Theme>(getSystemTheme)

  useEffect(() => {
    const mediaQuery = window.matchMedia(DARK_QUERY)
    const handleChange = (event: MediaQueryListEvent) => {
      setSystemTheme(event.matches ? 'dark' : 'light')
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  const theme = explicitTheme ?? systemTheme

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
  }, [theme])

  const toggleTheme = useCallback(() => {
    const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark'
    setExplicitTheme(nextTheme)
    saveTheme(nextTheme)
  }, [theme])

  return { theme, toggleTheme }
}
