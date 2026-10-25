import type { Theme, WidgetData } from '../types';

export const WIDGETS_STORAGE_KEY = 'text-widgets:v1';
export const THEME_STORAGE_KEY = 'text-widgets:theme';

function isWidgetData(value: unknown): value is WidgetData {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return typeof candidate.id === 'string' && typeof candidate.content === 'string';
}

export function loadWidgets(): WidgetData[] {
  try {
    const raw = window.localStorage.getItem(WIDGETS_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isWidgetData);
  } catch {
    return [];
  }
}

export function saveWidgets(widgets: WidgetData[]) {
  try {
    window.localStorage.setItem(WIDGETS_STORAGE_KEY, JSON.stringify(widgets));
  } catch {
    // Storage can be unavailable (private mode, quota). The app still works in memory.
  }
}

export function loadTheme(): Theme | null {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : null;
  } catch {
    return null;
  }
}

export function saveTheme(theme: Theme) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Keep the in-memory theme even if it cannot be saved.
  }
}
