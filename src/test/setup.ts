import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach } from 'vitest'
import { installMatchMedia, resetSystemTheme } from './matchMedia'

installMatchMedia()

beforeEach(() => {
  window.localStorage.clear()
  resetSystemTheme('light')
})

afterEach(() => {
  cleanup()
  document.documentElement.removeAttribute('data-theme')
  document.documentElement.style.removeProperty('color-scheme')
})
