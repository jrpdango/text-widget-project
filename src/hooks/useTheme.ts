import { useEffect, useRef, useSyncExternalStore } from 'react';
import { loadTheme, saveTheme, THEME_STORAGE_KEY } from '@/lib/themeStorage';
import type { Theme } from '@/types';

const DARK_QUERY = '(prefers-color-scheme: dark)';

function getSystemTheme(): Theme {
  if (typeof window === 'undefined') {
    return 'light';
  }

  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light';
}

function subscribeSystemTheme(onStoreChange: () => void) {
  const mediaQuery = window.matchMedia(DARK_QUERY);
  mediaQuery.addEventListener('change', onStoreChange);
  return () => mediaQuery.removeEventListener('change', onStoreChange);
}

const explicitThemeListeners = new Set<() => void>();

// Fallback for environments where localStorage writes fail (private mode).
// `undefined` means "read from localStorage"; `null` means "no explicit choice".
let memoryTheme: Theme | null | undefined;

export function resetThemeMemory() {
  memoryTheme = undefined;
}

function getExplicitTheme(): Theme | null {
  if (memoryTheme !== undefined) {
    return memoryTheme;
  }

  return loadTheme();
}

function subscribeExplicitTheme(onStoreChange: () => void) {
  explicitThemeListeners.add(onStoreChange);

  const handleStorage = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY) {
      memoryTheme = undefined;
      onStoreChange();
    }
  };

  window.addEventListener('storage', handleStorage);

  return () => {
    explicitThemeListeners.delete(onStoreChange);
    window.removeEventListener('storage', handleStorage);
  };
}

function notifyExplicitThemeChanged() {
  for (const listener of explicitThemeListeners) {
    listener();
  }
}

export function useTheme(): { theme: Theme; toggleTheme: () => void } {
  // During hydration React uses the server snapshots (light/null), then switches
  // to the client snapshots. The inline script in the root layout still sets the
  // correct theme before first paint, so there is no flash.
  const explicitTheme = useSyncExternalStore<Theme | null>(
    subscribeExplicitTheme,
    getExplicitTheme,
    () => null,
  );
  const systemTheme = useSyncExternalStore<Theme>(
    subscribeSystemTheme,
    getSystemTheme,
    () => 'light',
  );

  const theme = explicitTheme ?? systemTheme;
  const appliedInitialThemeRef = useRef(false);

  useEffect(() => {
    const root = document.documentElement;

    if (!appliedInitialThemeRef.current) {
      appliedInitialThemeRef.current = true;

      // The inline script in the root layout already applied the pre-paint theme.
      // Skip this first pass so the stale server snapshot cannot overwrite it
      // while useSyncExternalStore switches to the client value.
      if (root.dataset.theme) {
        return;
      }
    }

    root.dataset.theme = theme;
    root.style.colorScheme = theme;
  }, [theme]);

  function toggleTheme() {
    const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark';
    memoryTheme = nextTheme;
    saveTheme(nextTheme);
    notifyExplicitThemeChanged();
  }

  return { theme, toggleTheme };
}
