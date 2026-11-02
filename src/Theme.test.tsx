import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import App from './App';
import { resetSystemTheme, setSystemTheme } from './test/matchMedia';

const THEME_KEY = 'text-widgets:theme';

async function renderApp() {
  render(<App />);
  await screen.findByText(/no widgets yet/i);
}

describe('theme', () => {
  it('defaults to the system light preference', async () => {
    resetSystemTheme('light');
    await renderApp();

    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
    expect(screen.getByRole('button', { name: 'Switch to dark theme' })).toBeInTheDocument();
  });

  it('defaults to the system dark preference', async () => {
    resetSystemTheme('dark');
    await renderApp();

    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(screen.getByRole('button', { name: 'Switch to light theme' })).toBeInTheDocument();
  });

  it('follows OS theme changes until the user makes a choice', async () => {
    resetSystemTheme('light');
    await renderApp();

    act(() => setSystemTheme('dark'));
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');

    act(() => setSystemTheme('light'));
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
  });

  it('toggles the theme and persists the explicit choice', async () => {
    const user = userEvent.setup();
    await renderApp();

    await user.click(screen.getByRole('button', { name: 'Switch to dark theme' }));

    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(window.localStorage.getItem(THEME_KEY)).toBe('dark');
    expect(screen.getByRole('button', { name: 'Switch to light theme' })).toBeInTheDocument();
  });

  it('restores the saved theme after a remount', async () => {
    const user = userEvent.setup();
    const view = render(<App />);
    await screen.findByText(/no widgets yet/i);

    await user.click(screen.getByRole('button', { name: 'Switch to dark theme' }));
    view.unmount();

    resetSystemTheme('light');
    await renderApp();

    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
  });

  it('does not follow OS changes after an explicit choice', async () => {
    const user = userEvent.setup();
    resetSystemTheme('light');
    await renderApp();

    await user.click(screen.getByRole('button', { name: 'Switch to dark theme' }));
    act(() => setSystemTheme('light'));

    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
  });

  it('uses a saved theme even when the OS preference differs', async () => {
    resetSystemTheme('dark');
    window.localStorage.setItem(THEME_KEY, 'light');

    await renderApp();

    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
  });

  it('still switches the theme when localStorage is unavailable', async () => {
    const user = userEvent.setup();
    resetSystemTheme('light');
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });

    await renderApp();
    await user.click(screen.getByRole('button', { name: 'Switch to dark theme' }));

    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    setItem.mockRestore();
  });

  it('ignores an invalid saved theme', async () => {
    resetSystemTheme('dark');
    window.localStorage.setItem(THEME_KEY, 'purple');

    await renderApp();

    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
  });
});
