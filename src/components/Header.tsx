import type { Theme } from '../types';
import { MarkdownIcon, MoonIcon, PlusIcon, SunIcon } from './Icons';
import { Button, IconButton } from './ui';

interface HeaderProps {
  theme: Theme;
  onAddWidget: () => void;
  onToggleTheme: () => void;
}

export function Header({ theme, onAddWidget, onToggleTheme }: HeaderProps) {
  const nextTheme = theme === 'dark' ? 'light' : 'dark';

  return (
    <header className="app-header">
      <div className="app-header__inner">
        <div className="brand">
          <span className="brand__mark" aria-hidden="true">
            <MarkdownIcon className="brand__icon" />
          </span>
          <h1>Text Widgets</h1>
        </div>

        <div className="header-actions">
          <Button onClick={onAddWidget}>
            <PlusIcon className="icon" />
            Add widget
          </Button>
          <IconButton label={`Switch to ${nextTheme} theme`} onClick={onToggleTheme}>
            {theme === 'dark' ? <SunIcon className="icon" /> : <MoonIcon className="icon" />}
          </IconButton>
        </div>
      </div>
    </header>
  );
}
