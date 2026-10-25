const DARK_QUERY = '(prefers-color-scheme: dark)'

export type SystemTheme = 'light' | 'dark'

type ChangeListener = (event: MediaQueryListEvent) => void

let systemTheme: SystemTheme = 'light'
const listeners = new Set<ChangeListener>()

export function setSystemTheme(theme: SystemTheme) {
  systemTheme = theme
  const event = {
    matches: theme === 'dark',
    media: DARK_QUERY,
  } as MediaQueryListEvent

  for (const listener of listeners) {
    listener(event)
  }
}

export function resetSystemTheme(theme: SystemTheme = 'light') {
  systemTheme = theme
  listeners.clear()
}

export function installMatchMedia() {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string): MediaQueryList => {
      const addEventListener = (
        type: string,
        listener: EventListenerOrEventListenerObject,
      ) => {
        if (type === 'change' && query === DARK_QUERY) {
          listeners.add(listener as ChangeListener)
        }
      }

      const removeEventListener = (
        type: string,
        listener: EventListenerOrEventListenerObject,
      ) => {
        if (type === 'change' && query === DARK_QUERY) {
          listeners.delete(listener as ChangeListener)
        }
      }

      return {
        get matches() {
          return query === DARK_QUERY && systemTheme === 'dark'
        },
        media: query,
        onchange: null,
        addEventListener,
        removeEventListener,
        addListener: (listener: ChangeListener) =>
          addEventListener('change', listener as EventListenerOrEventListenerObject),
        removeListener: (listener: ChangeListener) =>
          removeEventListener('change', listener as EventListenerOrEventListenerObject),
        dispatchEvent: () => false,
      } as unknown as MediaQueryList
    },
  })
}
