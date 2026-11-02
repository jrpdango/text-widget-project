import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';
import * as api from '@/lib/api';
import { resetThemeMemory } from '@/hooks/useTheme';
import { makeWidget, resetWidgetIds } from './fixtures';
import { installMatchMedia, resetSystemTheme } from './matchMedia';

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();

  return {
    ...actual,
    fetchWidgets: vi.fn(),
    createWidget: vi.fn(),
    updateWidget: vi.fn(),
    deleteWidget: vi.fn(),
    flushWidgetUpdate: vi.fn(),
  };
});

if (typeof window !== 'undefined') {
  installMatchMedia();
}

beforeEach(() => {
  vi.resetAllMocks();
  resetWidgetIds();
  resetThemeMemory();

  if (typeof window !== 'undefined') {
    window.localStorage.clear();
  }

  resetSystemTheme('light');

  vi.mocked(api.fetchWidgets).mockResolvedValue([]);
  vi.mocked(api.createWidget).mockImplementation(async (content = '') => makeWidget(content));
  vi.mocked(api.updateWidget).mockImplementation(async (id, content) => ({
    ...makeWidget(content),
    id,
  }));
  vi.mocked(api.deleteWidget).mockResolvedValue(undefined);
  vi.mocked(api.flushWidgetUpdate).mockResolvedValue(undefined);
});

afterEach(() => {
  if (typeof document !== 'undefined') {
    cleanup();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.style.removeProperty('color-scheme');
  }

  vi.useRealTimers();
});
