import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { resetSystemTheme, setSystemTheme } from './test/matchMedia';

const THEME_KEY = 'text-widgets:theme';

describe('theme', () => {
  it('defaults to the system light preference', () => {
    resetSystemTheme('light');
    render(<App />);

    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
    expect(screen.getByRole('button', { name: 'Switch to dark theme' })).toBeInTheDocument();
  });

  it('defaults to the system dark preference', () => {
    resetSystemTheme('dark');
    render(<App />);

    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(screen.getByRole('button', { name: 'Switch to light theme' })).toBeInTheDocument();
  });

  it('follows OS theme changes until the user makes a choice', () => {
    resetSystemTheme('light');
    render(<App />);

    act(() => setSystemTheme('dark'));
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');

    act(() => setSystemTheme('light'));
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
  });

  it('toggles the theme and persists the explicit choice', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Switch to dark theme' }));

    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(window.localStorage.getItem(THEME_KEY)).toBe('dark');
    expect(screen.getByRole('button', { name: 'Switch to light theme' })).toBeInTheDocument();
  });

  it('restores the saved theme after a remount', async () => {
    const user = userEvent.setup();
    const view = render(<App />);

    await user.click(screen.getByRole('button', { name: 'Switch to dark theme' }));
    view.unmount();

    resetSystemTheme('light');
    render(<App />);

    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
  });

  it('does not follow OS changes after an explicit choice', async () => {
    const user = userEvent.setup();
    resetSystemTheme('light');
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Switch to dark theme' }));
    act(() => setSystemTheme('light'));

    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
  });

  it('uses a saved theme even when the OS preference differs', () => {
    resetSystemTheme('dark');
    window.localStorage.setItem(THEME_KEY, 'light');

    render(<App />);

    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
  });

  it('ignores an invalid saved theme', () => {
    resetSystemTheme('dark');
    window.localStorage.setItem(THEME_KEY, 'purple');

    render(<App />);

    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
  });
});
